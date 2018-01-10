const { getInfo, isValidWetransfertUrl, download, upload } = require('../index');
const Promise                           = require("bluebird");
const { parseString }                   = require ('xml2js');
const fs = require('fs')
const myUrl = '';

const testDownload = function(){
    download(myUrl, './test/dest/wetransfert/totot/test')
        .onProgress(progress => {
            console.log('progress', progress);
        })
        .then((res) => {
            console.log(res); // success
        })
        .catch((err) => {
            console.error('error  ', err);
        });
}

const testUpload = function(){
    const myUpload = upload('mailSender@gmail.com', ['receive1@gmail.com', 'receive2@gmail.com'], ['D:/Video/MEDIA150212142309947screen.mp4', 'C:/Users/pcjul/Desktop/toto2.txt', 'C:/Users/pcjul/Desktop/tata.txt'], 'tesdkjnsdjgbsdiosdbosdbdgdbohsdbgodbfofhst', 'en')
    .on('progress', (progress) => console.log('PROGRESS', progress))
    .on('end', (end) => console.log('END', end))
    .on('error', (error) => console.error('ERROR', error));

    setTimeout(function(){
        myUpload.cancel();
    }, 10000);
}

const testUploadLink = function(){
    const myUpload = upload('', '', [ './test/test.js' ], 'tesdkjnsdjgbsdiosdbosdbdgdbohsdbgodbfofhst', 'en')
    .on('progress', (progress) => console.log('PROGRESS', progress))
    .on('end', (end) => console.log('END', end))
    .on('error', (error) => console.error('ERROR', error));

}

//testDownload();
testUpload();
//testUploadLink();
