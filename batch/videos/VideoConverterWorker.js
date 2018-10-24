const S3VideoUploader = require('./S3VideoUploader');
const S3VideoDownloader = require('./S3VideoDownloader');
const SQSMessageCreator = require('./SQSMessageCreator');
const config = require('../../config');
const { spawn } = require('child_process');
const fs = require('fs');
var AWS = require('aws-sdk');
AWS.config.update({ region: config.awsRegion });
var sqs = new AWS.SQS({ apiVersion: '2012-11-05' });
const models = require('../../models/index');



/**
 * Allows to put a video URI to the Redis queue
 */
class VideoConverterWorker {

    constructor() {
    }

    /**
     * Get a video and then delete it from SQS
     */
    async popVideoFromQueue() {
        return new Promise(function (resolve, reject) {
            console.log('[SQS] Getting message...');
            sqs.receiveMessage({
                QueueUrl: config.sqsQueueURL,
                MaxNumberOfMessages: 1,
                VisibilityTimeout: 5, // seconds - how long we want a lock on this job
                WaitTimeSeconds: 3 // seconds - how long should we wait for a message?
            }, function (err, data) {
                if (data.Messages) {
                    // Get the first message (should be the only one since we said to only get one above)
                    var message = data.Messages[0];
                    var videoKey = message.Body;
                    console.log('[SQS] Message=', videoKey);
                    // Clean up, delete this message from the queue, so it's not executed again
                    sqs.deleteMessage({
                        QueueUrl: config.sqsQueueURL,
                        ReceiptHandle: message.ReceiptHandle
                    }, function (err, data) {
                        err && console.log('[SQS] Error:', err);
                    });
                    resolve(videoKey) // successfully fill promise
                } else {
                    if (err == null) {
                        console.log('[SQS] No messages available...');
                        console.log('[VideoConverter] Worker finished');
                    } else {
                        console.log('[SQS] Error:', err);
                    }
                }
            });
        })


    }

    /**
     * Delete a file in a given path
     * @param {*} filePath 
     */
    deleteLocalFile(filePath) {
        fs.unlink(filePath, function (err) {
            if (err && err.code == 'ENOENT') {
                // file doens't exist
                console.info('[VideoConverter] File', filePath, 'not found');
            } else if (err) {
                // other errors, e.g. maybe we don't have enough permission
                console.error('[VideoConverter] Error occurred while trying to remove file', filePath);
            } else {
                console.info('[VideoConverter] Deleted file', filePath);
            }
        });
    }

    /**
     * Uses FFMPEG on the host machine to convert a given video
     * @param {*} input The URI of the input video
     * @param {*} output The URI where the output video will be wrtitten
     * @param {*} keyName The Key for Amazon S3 storage
     */
    async convertVideo(input, output, keyName) {
        return new Promise(function (resolve, reject) {
            let queryParameterRuta = /[^/]*$/.exec(input)[0].replace(/\.[^/.]+$/, '');
            console.log('[VideoConverter][FFMPEG] Converting ' + input + ' into ' + output);
            const scale = 'scale=-1:1080';
            const format = 'mp4';
            const vcodec = 'libx264';
            const acodec = 'aac';
            const quality = '25';

            //var args = ['-i', input, '-vf', scale, '-f', format, '-vcodec', vcodec, '-acodec', acodec, '-crf', quality, output, '-hide_banner', '-y']
            var args = ['-i', input, '-f', format, '-vcodec', vcodec, '-acodec', acodec, '-crf', quality, output, '-hide_banner', '-y']

            try {
                const ffmpeg = spawn('ffmpeg', args);
                ffmpeg.stderr.on('data', (data) => {
                    //Enable this only for debug
                    //console.log(`${data}`);
                });
                ffmpeg.on('close', (code) => {
                    console.log(`[VideoConverter][FFMPEG] Finished with code ${code}`);

                    // TODO 
                    //Update video status on DB

                    if (code == 1) {  //Ok = 0, Error = 1
                        this.reAddVideoToQueue(input);
                    }
                    resolve();
                });

            } catch (err) {
                this.reAddVideoToQueue(input);
                console.error(err);
                reject(err);
            }
        });

    }

    /**
     * Send a video key to SQS if the worker process fail
     * @param {*} campaignName Unique key to bind the uploaded video
     * @param {*} inputVideo URI to uploaded video
     */
    reAddVideoToQueue(campaignName, inputVideo) {
        console.log('[VideoConverter] Re-adding the video', inputVideo, 'to the queue due an error')
        let messageCreator = new SQSMessageCreator;
        messageCreator.createMessage(campaignName, inputVideo);
    }

    /**
     * Update the state of an uploaded video in the DB
     * @param {*} rutaParameter 
     */
    updateVideoOnDataBase(rutaParameter) {
        console.log('[VideoConverter] Updating status for key:', rutaParameter);
        models.Video.update(
            { estado: 'Convertido' },
            { where: { ruta: rutaParameter } }
        )
            .then(result =>
                console.log('[VideoConverter] Database updated', rutaParameter)
            )
            .catch(err =>
                console.log('[VideoConverter] Cannot update video status on database:', err)
            )
    }


    /**
     * Setup the output video filename and execute the conversion from the popped out element of the queue
     */
    async runWorker() {
        console.log('[VideoConverter] Worker started...');
        let s3VideoDownloader = new S3VideoDownloader;
        let s3VideoUploader = new S3VideoUploader;

        //Take filename from queue
        let keyName = await this.popVideoFromQueue();
        let inputFile = config.downloadFolder + keyName;

        //Change converted file extension
        let outputFile = config.convertedFolder + keyName;
        let pos = outputFile.lastIndexOf(".");
        outputFile = outputFile.substr(0, pos < 0 ? outputFile.length : pos) + '.mp4';

        //Download video from S3
        await s3VideoDownloader.s3download(config.s3BucketOriginal, keyName, config.downloadFolder);

        //Convert video
        await this.convertVideo(inputFile, outputFile, keyName);

        //Change videoKey extension
        pos = keyName.lastIndexOf(".");
        keyName = keyName.substr(0, pos < 0 ? keyName.length : pos) + '.mp4';

        //Upload converted video to S3
        await s3VideoUploader.uploadVideoToS3(config.s3BucketConverted, keyName, outputFile);

        //Remove extenxsion from key
        keyName = keyName.replace(/\.[^/.]+$/, "");
        //Update video status
        this.updateVideoOnDataBase(keyName);

        //Delete original file
        this.deleteLocalFile(inputFile);

        //Delete converted file
        this.deleteLocalFile(outputFile);

        console.log('[VideoConverter] Worker finished');
        return;
    };


}

module.exports = VideoConverterWorker;