var AWS = require('aws-sdk');
var fs = require('fs');
var s3 = new AWS.S3();

/**
 * Allows to upload videos to Amazon S3 Bucket
 */
class S3VideoUploader {

    constructor() {
    }

    /**
     * Read one local file and upload to a given S3 Bucket URI
     * @param {*} bucketURI The bucket name and path to desired upload content
     * @param {*} videoKey The file name for the video
     * @param {*} videoFilePath The location of the video to upload
     */
    uploadVideoToS3(bucketURI, videoKey, videoFilePath) {
        console.log('[S3VideoUploader] Upload started for:', videoFilePath, 'on bucket:', bucketURI, 'with key:', videoKey);
        try {
            fs.readFile(videoFilePath, function (err, data) {
                if (err) { throw err; }
                var params = { Bucket: bucketURI, Key: videoKey, Body: data };
                s3.putObject(params, function (err, data) {
                    if (err) {
                        console.log('[S3VideoUploader]', err);
                    } else {
                        console.log('[S3VideoUploader] Successfully uploaded', videoKey, 'to', bucketURI);
                    }
                });
            });
        } catch (error) {
            console.log('[S3VideoUploader] Error: ', error);
        }
    }

}

module.exports = S3VideoUploader;