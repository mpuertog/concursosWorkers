var AWS = require("aws-sdk");
const config = require('../../config');

AWS.config.update({
    region: 'us-east-1',
    accessKeyId: config.keyId,
    secretAccessKey: config.secret
});

var utils = function () {

    var sendMail = function (email) {
        console.log("-----------------------------------------------------------------")
        var params = {
            Destination: { /* required */
                ToAddresses: [
                    email
                ],
                CcAddresses: [
                    email
                ]
            },
            Message: { /* required */
                Body: { /* required */
                    Html: {
                        Charset: "UTF-8",
                        Data: "<p>Tu video fue convertido correctamente, y ya se encuentra en la plataforma.</p>"
                    },
                    Text: {
                        Charset: "UTF-8",
                        Data: "Tu video fue convertido correctamente, y ya se encuentra en la plataforma."
                    }
                },
                Subject: {
                    Charset: 'UTF-8',
                    Data: 'Video convertido'
                }
            },
            Source: 'efrain_am1990@hotmail.com', /* required */
            ReplyToAddresses: [

            ]
        };
        console.log(params);
        // Create the promise and SES service object
        var sendPromise = new AWS.SES().sendEmail(params).promise();
        console.log("FINISH")
        // Handle promise's fulfilled/rejected states
        sendPromise.then(
            function (data) {
                console.log(data.MessageId);
            }).catch(
                function (err) {
                    console.error(err, err.stack);
                });
        console.log("-----------------------------------------------------------------")
    }

    return {
        sendMail: sendMail

    }
}

module.exports = utils();