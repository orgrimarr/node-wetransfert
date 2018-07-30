const { getInfo, isValidWetransfertUrl, download, upload } = require('../index');
const fs = require('fs')

/////// DOWNLOAD SECTION ////////
// Download URI : ex: https://wetransfer.com/downloads/5ea8acc81f4da9f731da85c6cb162a1d20180404153650/9bf4079e384a573d2e12fb4a84e655d520180404153650/0b8279
const downloadURL = 'https://MyWetransferDownloadURI';
// Your download folder, ex : /home/orgrimarr/wetransfer
const downloadFolder = '/home/orgrimarr/wetransfer'

/////// UPLOAD SECTION /////////
// Sender email: ex mail@sender.com
const emailSender = 'mail@sender.com'
// Reveiver Mails, An array of all reveiver emails: ex: ['mail1@receiver.com', 'mail2@receiver.com']
const reveiverSender = ['mail1@receiver.com', 'mail2@receiver.com']
// An array of file you want to upload. Ex : ['/home/orgrimarr/wetransfer/file1', '/home/orgrimarr/wetransfer/file2']
const filesToUpload = ['/home/orgrimarr/wetransfer/file1', '/home/orgrimarr/wetransfer/file2']
// The body of the email
const body = 'Hi this is an upload from orgrimarr/node-wetransfert API'
// Language, used in the weetranfer download ux : ex: en, fr
const language = 'en'
// Time after which the quest will be canceled, if set to 0 the request will not be canceled. ex 0
const cancel = 0

/////// TEST SECTION //////////

// Uncomment 

//testDownload();
//testUpload();
//testUploadLink();




const testDownload = function(){
    download(downloadURL, downloadFolder)
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
    const myUpload = upload(emailSender, reveiverSender, filesToUpload, body, 'en')
    .on('progress', (progress) => console.log('PROGRESS', progress))
    .on('end', (end) => console.log('END', end))
    .on('error', (error) => console.error('ERROR', error));

    if(cancel > 0){
        setTimeout(function(){
            myUpload.cancel();
        }, cancel);
    }
}

const testUploadLink = function(){
    const myUpload = upload('', '', filesToUpload, body, language)
    .on('progress', (progress) => console.log('PROGRESS', progress))
    .on('end', (end) => console.log('END', end))
    .on('error', (error) => console.error('ERROR', error));
}


