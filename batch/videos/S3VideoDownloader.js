const deasync = require('deasync');
var AWS = require('aws-sdk');
const fs = require('fs');

var s3 = new AWS.S3();

/**
 * Allows to download a video from Amazon S3
 */
class S3VideoDownloader {

    constructor() {
    }

    /**
     * Download a file from a given Bucket and writes it into a given path
     * @param {*} bucketName The bucket name and path to desired content
     * @param {*} keyName The file name for the video
     * @param {*} localDest The location of the video to download
     */
    s3download(bucketName, keyName, localDest) {
        console.log('[S3VideoDownloader] Download file:', keyName, 'from bucket:', bucketName, 'into:', localDest);
        let params = {
            Bucket: bucketName,
            Key: keyName
        };

        let file = fs.createWriteStream(localDest+'/'+keyName);

        return new Promise((resolve, reject) => {
            s3.getObject(params).createReadStream()
                .on('end', () => {
                    console.log('[S3VideoDownloader] Download successfull');
                    return resolve();
                })
                .on('error', (error) => {
                    console.log('[S3VideoDownloader] Error while download')
                    return reject(error);
                }).pipe(file);
        });
    };
}


module.exports = S3VideoDownloader;