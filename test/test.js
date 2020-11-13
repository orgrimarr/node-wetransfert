process.env.DEBUG = "wetransfert*"
const { getInfo, isValidWetransfertUrl, download, downloadPipe ,upload, waitForDownloadable, Payload } = require('../index');
const fs = require('fs')
const path = require('path')

const testSamples = [
    path.resolve(__dirname, './ressources/flower-3876195_960_720.jpg'),
    path.resolve(__dirname, './ressources/landscape-3779159_960_720.jpg'),
    path.resolve(__dirname, './ressources/gnu.txt'),
    new Payload({
        filePath: path.resolve(__dirname, './ressources/gnu.txt'),
        name: "gnu_renamed.txt" // Overide file name
    }),
    new Payload({   // Upload a buffer
        name: "test buffer with payload wrapper",
        buffer: Buffer.from("THIS IS A TEST BUFFER WRAPPED WITHIN wetransfert PAYLOAD")
    }),
    {
        name: "test buffer",
        buffer: Buffer.from("THIS IS A TEST BUFFER")
    },
    {
        name: "test stream from file",
        stream: fs.createReadStream(path.resolve(__dirname, './ressources/water-lily-3784022_960_720.jpg')),
        size: fs.statSync(path.resolve(__dirname, './ressources/water-lily-3784022_960_720.jpg')).size
    }
]

/////// DOWNLOAD SECTION ////////
// Download URI : ex: https://wetransfer.com/downloads/5ea8acc81f4da9f731da85c6cb162a1d20180404153650/9bf4079e384a573d2e12fb4a84e655d520180404153650/0b8279
const downloadURL = 'https://we.tl/t-BUr6nd2DAP';
// Your download folder, ex : /home/orgrimarr/wetransfer
const downloadFolder = path.resolve(__dirname, './tmp')

/////// UPLOAD SECTION /////////
// Sender email: ex mail@sender.com
const emailSender = 'mail@sender.com'
// Reveiver Mails, An array of all reveiver emails: ex: ['mail1@receiver.com', 'mail2@receiver.com']
const reveiverSender = ['mail1@receiver.com', 'mail2@receiver.com']
// An array of file you want to uconsolepload. Ex : ['/home/orgrimarr/wetransfer/file1', '/home/orgrimarr/wetransfer/file2']
const filesToUpload = testSamples //['/home/orgrimarr/wetransfer/file1', '/home/orgrimarr/wetransfer/file2']
// The body of the email
const body = 'Hi this is an upload from https://github.com/orgrimarr/node-wetransfert API'
// Language, used in the weetranfer download ux : ex: en, fr
const language = 'en'
// Time after which the quest will be canceled, if set to 0 the request will not be canceled. ex 0
const cancel = 0


/////// TEST SECTION //////////
const testDownload = function(fileIds = null){
    download(downloadURL, downloadFolder, fileIds)
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

const testDownloadPipe = async function(){
    const destName = `download_${Math.floor(Math.random() * 1000)}.zip`
    const downloadStream = await downloadPipe(downloadURL, null, (percent) => { 
        console.log('testDownloadPipe callback', percent) 
    })
    downloadStream.on('close', () => {
        console.log('testDownloadPipe', 'close')
    })
    downloadStream.pipe(fs.createWriteStream(path.resolve(downloadFolder, destName)))
}

const testUpload = function(sender = emailSender, receiver = reveiverSender, toUpload = filesToUpload, content = body, lang = language){
    return new Promise((resolve, reject) => {
        const myUpload = upload(sender, receiver, toUpload, content, lang)
        .on('progress', (progress) => console.log('PROGRESS', progress))
        .on('end', (end) => {
            return resolve(end)
        })
        .on('error', (error) => {
            return reject(error)
        });
    
        if(cancel > 0){
            console.log("cance upload !")
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
    .on('error', (error) => {
        if(error) console.error('ERROR', error.message)
        console.log("error", error)
    });
}



// Uncomment 

// testDownload();
// testDownloadPipe()
// testUploadLink()
// testUpload()

getInfo("https://we.tl/t-BUr6nd2DAP")
.then(response =>  {
    console.log(JSON.stringify(response, null, 2))
})
.catch(console.error)    
