const S3VideoUploader = require('./S3VideoUploader');
const config = require('../../config');
const deasync = require('deasync');
const path = require('path');
const redis = require('redis');
const { spawn } = require('child_process');
const fs = require('fs');
var AWS = require('aws-sdk');
var s3 = new AWS.S3();


/**
 * Allows to put a video URI to the Redis queue
 */
class VideoConverterWorker {

    constructor() {
    }

    /**
     * Search on Redis a list with the videos to convert 
     * @param {*} listKey Key to the list of videos on Redis
     */
    getVideosListSize(listKey) {
        var ret = null;
        this.client = redis.createClient({
            port: config.redisPort,
            host: config.redisUrl,
        });
        this.client.llen(listKey, function (err, result) {
            ret = { err: err, result: result }
        });
        while ((ret == null)) {
            deasync.runLoopOnce();
        }
        return (ret.err || ret.result);
    }

    /**
     * Pop the given video from the list on Redis
     * @param {*} listKey Key to the list of videos on Redis
     */
    popVideoFromQueue(listKey) {
        var ret = null;
        this.client = redis.createClient({
            port: config.redisPort,
            host: config.redisUrl,
        });
        this.client.lpop(listKey, function (err, result) {
            ret = { err: err, result: result }
        });
        while ((ret == null)) {
            deasync.runLoopOnce();
        }
        return (ret.err || ret.result);
    }

    /**
     * Deletes all the videos in the input folder
     * @param {*} dirPath 
     */
    deleteInputVideos(dirPath) {
        try {
            var uploadFolder = path.resolve(path.join(__dirname, dirPath));
            var files = fs.readdirSync(uploadFolder);
        }
        catch (e) {
            console.log('Error=', e);
            return;
        }
        if (files.length > 0)
            for (var i = 0; i < files.length; i++) {
                var uploadFolder = path.resolve(path.join(__dirname, dirPath));
                var filePath = uploadFolder + '/' + files[i];
                console.log('[VideoConverter] Deleting input file: ', files[i]);
                if (fs.statSync(filePath).isFile())
                    fs.unlinkSync(filePath);
            }
    };

    /**
     * Uses FFMPEG on the host machine to convert a given video
     * @param {*} input The URI of the input video
     * @param {*} output The URI where the output video will be wrtitten
     * @param {*} keyName The Key for Amazon S3 storage
     */
    convertVideo(input, output, keyName) {
        let s3Uploader = new S3VideoUploader;
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

                //Update video status on DB
                console.log(`[VideoConverter][FFMPEG] Updating DB ${queryParameterRuta}`);

                //Change keyName extension
                let pos = keyName.lastIndexOf(".");
                keyName = keyName.substr(0, pos < 0 ? keyName.length : pos) + '.mp4';

                // Upload finished video to S3
                s3Uploader.uploadVideoToS3(config.s3BucketConverted, keyName, output);

                if (code == 1) {  //Ok = 0, Error = 1
                    this.reAddVideoToQueue(input);
                }
            });

        } catch (err) {
            this.reAddVideoToQueue(input);
            console.error(err);
        }

    }


    /**
     * Setup the output video filename and execute the conversion from the popped out element of the queue
     * @param {*} campaignName Identifier of the campaign where the videos belong
     */
    generateConvertTask(campaignName) {
        this.campaignName = campaignName;
        var videosPending = this.getVideosListSize(campaignName);

        console.log('[VideoConverter] Worker started for campaign', campaignName)
        if (videosPending == 0) {
            console.log('[VideoConverter] No videos at the queue');
        }
        while (videosPending > 0) {
            //Take filename from queue
            let keyName = this.popVideoFromQueue(campaignName);
            let inputFile = config.downloadFolder + keyName;

            //Download file from bucket
            //let downloadPromise = s3VideoDownloader.s3download(config.s3BucketOriginal, keyName, config.downloadFolder);
            console.log('[S3VideoDownloader] Download file:', keyName, 'from bucket:', config.s3BucketOriginal, 'into:', inputFile);

            let params = {
                Bucket: config.s3BucketOriginal,
                Key: keyName
            };

            let file = fs.createWriteStream(inputFile);

            return new Promise((resolve, reject) => {
                s3.getObject(params).createReadStream()
                    .on('end', () => {
                        console.log('[S3VideoDownloader] Download successfull');
                        //Change converted file extension
                        let outputFile = config.convertedFolder + keyName;
                        let pos = outputFile.lastIndexOf(".");
                        outputFile = outputFile.substr(0, pos < 0 ? outputFile.length : pos) + '.mp4';
                        this.convertVideo(inputFile, outputFile, keyName);
                        videosPending--;
                        return resolve();
                    })
                    .on('error', (error) => {
                        console.log('[S3VideoDownloader] Error while download')
                        return reject(error);
                    }).pipe(file);
            });

        }
        this.client.save();
        this.client.quit();
        console.log('[VideoConverter] Worker finished for campaign', campaignName);
    };


    reAddVideoToQueue(inputVideo) {
        this.client = redis.createClient({
            port: config.redisPort,
            host: config.redisUrl,
        });
        this.client.rpush(this.campaignName, inputVideo);
        console.log('[VideoConverter][FFMPEG] Video re-added to queue due an error: ', inputVideo);
        this.client.save();
    }

}

module.exports = VideoConverterWorker;