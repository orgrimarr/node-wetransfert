const { getInfo, isValidWetransfertUrl, download, downloadPipe ,upload, waitForDownloadable } = require('../index');
const fs = require('fs')
const path = require('path')

const testSamples = [
    path.resolve(__dirname, './ressources/flower-3876195_960_720.jpg'),
    path.resolve(__dirname, './ressources/landscape-3779159_960_720.jpg'),
    path.resolve(__dirname, './ressources/water-lily-3784022_960_720.jpg'),
    path.resolve(__dirname, './ressources/gnu.txt'),
]

/////// DOWNLOAD SECTION ////////
// Download URI : ex: https://wetransfer.com/downloads/5ea8acc81f4da9f731da85c6cb162a1d20180404153650/9bf4079e384a573d2e12fb4a84e655d520180404153650/0b8279
const downloadURL = 'https://MyWetransferDownloadURI';
// Your download folder, ex : /home/orgrimarr/wetransfer
const downloadFolder = path.resolve(__dirname, './tmp')

/////// UPLOAD SECTION /////////
// Sender email: ex mail@sender.com
const emailSender = 'mail@sender.com'
// Reveiver Mails, An array of all reveiver emails: ex: ['mail1@receiver.com', 'mail2@receiver.com']
const reveiverSender = ['mail1@receiver.com', 'mail2@receiver.com']
// An array of file you want to upload. Ex : ['/home/orgrimarr/wetransfer/file1', '/home/orgrimarr/wetransfer/file2']
const filesToUpload = testSamples //['/home/orgrimarr/wetransfer/file1', '/home/orgrimarr/wetransfer/file2']
// The body of the email
const body = 'Hi this is an upload from https://github.com/orgrimarr/node-wetransfert API'
// Language, used in the weetranfer download ux : ex: en, fr
const language = 'en'
// Time after which the quest will be canceled, if set to 0 the request will not be canceled. ex 0
const cancel = 0




/////// TEST SECTION //////////
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

const testDownloadPipe = function(){
    testUpload('', '', testSamples, body, 'en')
    .then(waitForDownloadable)
    .then(response => {
        console.log("response", JSON.stringify(response, null, 2))
        console.log('>>> response.shortened_url', response.shortened_url)
        return downloadPipe(response.shortened_url)
    })
    .then(files => {
        files.pipe(fs.createWriteStream(path.resolve(downloadFolder, `download_${Math.floor(Math.random() * 1000)}.zip`)))
    })
    .then(done => {
        console.log("testDownloadPipe DONE", done || "")
    })
    .catch(console.error)
}

const testUpload = function(sender = emailSender, receiver = reveiverSender, toUpload = filesToUpload, content = body, lang = language){
    return new Promise((resolve, reject) => {
        const myUpload = upload(sender, receiver, toUpload, content, lang)
        .on('progress', (progress) => console.log('PROGRESS', progress))
        .on('end', (end) => {
            console.log('END', end)
            return resolve(end)
        })
        .on('error', (error) => {
            console.error('ERROR', error)
            return reject(error)
        });
    
        if(cancel > 0){
            setTimeout(function(){
                myUpload.cancel();
            }, cancel);
        }
    })
}

const testUploadLink = function(){
    const myUpload = upload('', '', filesToUpload, body, language)
    .on('progress', (progress) => console.log('PROGRESS', progress))
    .on('end', (end) => console.log('END', end))
    .on('error', (error) => console.error('ERROR', error));
}



// Uncomment 

//testDownload();
testDownloadPipe()
//testUpload();
//testUploadLink()

// getInfo("https://we.tl/t-l9lCzgnmcp")
// .then(response =>  {
//     console.log(JSON.stringify(response, null, 2))
// })
// .catch(console.error)    
