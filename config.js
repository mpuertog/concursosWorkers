const homedir = require('os').homedir().replace(/\\/g, "/");
const config = {
    "contestName": "firstContest",
    "cronIntervalMinutes": "30",
    "downloadFolder": homedir + "/git/concursosWorkers/fs/download/",
    "convertedFolder": homedir + "/git/concursosWorkers/fs/converted/",
    "s3BucketOriginal":"concursos-bucket/videos_original",
    "s3BucketConverted":"concursos-bucket/videos_converted",
    "sqsQueueURL":"https://sqs.us-east-2.amazonaws.com/694697796459/concursosQueue",
    "awsRegion": "us-east-2"
  }
  
  module.exports = config;