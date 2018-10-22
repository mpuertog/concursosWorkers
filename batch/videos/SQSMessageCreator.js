const config = require('../../config');
var AWS = require('aws-sdk');
AWS.config.update({ region: config.awsRegion });
var sqs = new AWS.SQS({ apiVersion: '2012-11-05' });


/**
 * Allows to put a video URI to the SQS queue
 */
class SQSMessageCreator {

    constructor() {
    }

    /**
     * Put one video to the queue
     * @param {*} videoKey Unique key to bind the uploaded video
     * @param {*} videoURI URI to the uploaded video
     */
    createMessage(videoKey, videoFileName) {
        var params = {
            MessageAttributes: {
                "ContestKey": {
                    DataType: "String",
                    StringValue: videoKey
                }
            },
            MessageBody: videoFileName,
            QueueUrl: config.sqsQueueURL
        };
        sqs.sendMessage(params, function (err, data) {
            if (err) {
                console.log("[SQSMessageCreator]", err);
            } else {
                console.log("[SQSMessageCreator] Message sended", data.MessageId);
            }
        });
    }

}

module.exports = SQSMessageCreator;