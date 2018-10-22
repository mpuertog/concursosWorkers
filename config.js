const config = {
    "contestName": "firstContest",
    "cronIntervalMinutes": "1",
    "downloadFolder":"C:/Users/santi/git/workersConcursos/fs/download/",
    "convertedFolder":"C:/Users/santi/git/workersConcursos/fs/converted/",
    "redisUrl":"192.168.0.12",
    "redisPort":"6379",
    "s3BucketOriginal":"concursos-bucket/videos_original",
    "s3BucketConverted":"concursos-bucket/videos_converted"
  }
  
  module.exports = config;