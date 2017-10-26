const { isValidWetransfertUrl, formatDownloadApiUri }       = require('../utils/utils');
const { getInfo }   = require('./getInfo');
const Promise       = require("bluebird");
const PProgress     = require('../utils/PProgress');
const ReqProgress   = require('request-progress');
const request       = require('request');
const fstream       = require('fstream');
const mkdirp        = require('mkdirp');
const unzip         = require('unzip');
const path          = require('path');
const fs            = require('fs');



exports.download = function(url, destPath){
    return new PProgress(async (resolve, reject, progress) => {
        if(!destPath){
            return reject(new Error('Not destination path found'));
        }
        try{
            const weTransfertObject = await getInfo(url);
            if(!weTransfertObject) return reject(new Error('Not a valid url'));
            const downloadProcess = ReqProgress(request(weTransfertObject.downloadURI), {
               throttle: 500,                    // Throttle the progress event to 2000ms, defaults to 1000ms 
               delay: 0,                       // Only start to emit after 1000ms delay, defaults to 0ms 
               // lengthHeader: 'x-transfer-length'  // Length header to use, defaults to content-length 
            })
                .on('progress', (state) => {
                    // The state is an object that looks like this: 
                    // { 
                    //     percent: 0.5,               // Overall percent (between 0 to 1) 
                    //     speed: 554732,              // The download speed in bytes/sec 
                    //     size: { 
                    //         total: 90044871,        // The total payload size in bytes 
                    //         transferred: 27610959   // The transferred payload size in bytes 
                    //     }, 
                    //     time: { 
                    //         elapsed: 36.235,        // The total elapsed seconds since the start (3 decimals) 
                    //         remaining: 81.403       // The remaining seconds to finish (3 decimals) 
                    //     } 
                    // } 
                    progress(state.percent.toFixed(2));
                })
                .on('error', (err) => {
                    return reject(err);
                })
                .on('end', () => {
                    return resolve(weTransfertObject);
                })
            if(weTransfertObject.content.items.length > 2 ? true : false){
                mkdirp(destPath, (err) =>{
                    if(err) return reject(err);
                    downloadProcess
                        .pipe(unzip.Parse())
                        .pipe(fstream.Writer(destPath));
                });
            }
            else{
                mkdirp(destPath, (err) =>{
                    if(err) return reject(err);
                    downloadProcess
                        .pipe(fs.createWriteStream(
                            path.join(destPath, weTransfertObject.content.items[0].name)
                        ));
                });
            }
        }
        catch(e){
            return reject(e);
        }
    });
}
