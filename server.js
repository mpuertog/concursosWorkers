const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const morgan = require('morgan');

const config = require('./config');
const videoConverterWorker = require('./batch/videos/VideoConverterWorker');
var cron = require('node-cron');

app.use(morgan('dev'));
app.use(bodyParser.json());
app.use('/fs/downloads', express.static(path.join(__dirname, 'downloads')));
app.use('/fs/converted', express.static(path.join(__dirname, 'converted')));


app.listen(8090, () => {
    console.log("[Workers] Listening at port 8090");
    //let cronIntervalParameter = config.cronIntervalMinutes.concat(' * * * * *');
    let cronIntervalParameter = '*/30 * * * * *';
    console.log('[VideoConverterWorker] Interval set to', config.cronIntervalMinutes, 'seconds');
    let task = cron.schedule(cronIntervalParameter, function () {
        var converter = new videoConverterWorker;
        converter.runWorker();
    });
    task.start();
});