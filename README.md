# [node-wetransfert](https://github.com/orgrimarr/node-wetransfert)
## Download/Upload [wetransfer](https://wetransfer.com/) content with nodeJS ! - Unofficial API for wetransfer

 [![Known Vulnerabilities](https://snyk.io/test/github/orgrimarr/node-wetransfert/badge.svg)](https://snyk.io/test/github/orgrimarr/node-wetransfert) 

# Changelog
- 2.3.3
  - Fix download for Nomal url (Fix get recipient id)
- 2.3.2
  - Fix upload issues (CSRF token was invalid)
- 2.3.1
  - Fix download/upload due to wetranfer changes
- 2.3.0
  - Add proxy support
- 2.2.0
  - Remove deprecated request-* libs and use node-fetch instead
  - Fix wetransfer upload (send emails)
- 2.1.5
  - Fix upload (get link)
  - Fix download
  - Add download file by ID
  - Upgrade dependencies
  - Upload (send email) still broken. Wetransfer add a captcha. I will implement download via wetransfer account (user/password) soon
- 2.1.4
  - Fix upload !
- 2.1.3 
  - Fix dependencies security issues
  - Fix download (Thanks @cylwin). The upload part is still broken

# Table of content
- [Install](#Install)
- [Use custom proxy](#Use-custom-proxy)
- [Download](#Download-weTransfer-content-from-url)
  - [From url](#Download-weTransfer-content-from-url)
  - [From url by file ID](#Download-weTransfer-file-by-ID)
  - [Pipe](#Download-weTransfer-content-from-url-pipe-response)
- [Get infos](#isValidWetransfertUrl)
  - [Validate url](#isValidWetransfertUrl)
  - [Get url detail](#Get-information-about-weTransfert-url)
- [Upload](#Upload)
  - [Using payload wrapper](#Payload-Exemple)
  - [Progress object](#Progress-object)
  - [End object](#End-object)
  - [Get share link](#Upload-without-email)
- [Known Bugs](#Known-Bugs)

# Install
```
npm install wetransfert --save
or
yarn add wetransfert
```
Tested in node 12.x


## You can require the module like this

``` javascript
const { upload, download, getInfo, isValidWetransfertUrl } = require('wetransfert');
```  

# Use custom proxy
- Add HTTP_PROXY or HTTPS_PROXY environement variable

# Download weTransfer content from url
### download(url, folder)
The function take a valid wetransfer url and a destination folder

Simply return a [PromiseProgress](https://github.com/sindresorhus/p-progress)

The response is an object describing the [weTransfert content](#response-exemple)

## Exemple

``` javascript
const { download } = require('wetransfert');

download(myUrl, myDestinationFolder)
  .onProgress(progress => {
    console.log('progress', progress);
  })
  .then((res) => {
    console.log(res); // success
  })
  .catch((err) => {
    console.error('error  ', err);
  });
```


# Download weTransfer file by ID
### download(url, folder, fileIds)
- fileIds: An array of wetransfer file id

## Exemple
``` javascript
const { download } = require('wetransfert');

download(myUrl, myDestinationFolder, ['aaaaaaaaa'])
  .onProgress(progress => {
    console.log('progress', progress);
  })
  .then((res) => {
    console.log(res); // success
  })
  .catch((err) => {
    console.error('error  ', err);
  });
```

> /!\ If your transfer contain only one file, wetransfer does not zip the content. Be carefull when using the downloadPipe function. You can obtain all files information using the getInfo function. 

# Download weTransfer content from url pipe response 
- (progress with callback)
### downloadPipe(url)

This function take a valid wetransfer url. Like the classique download function, you can specify the file ids you want to download. downloadPipe(response.shortened_url, ["fileID"])

It return a Promise and resolve a ReadableStream you can pipe. 

If you need a progress, you can obtain the total size with the getInfo function

## Exemple 
``` javascript
const { downloadPipe } = require('wetransfert');

downloadPipe(response.shortened_url, null)
  .then(files => {
      files.pipe(fs.createWriteStream("/home/orgrimarr/wetransfer/myDownload.zip"))
  })
  .catch(console.error)
```

> /!\ If your transfer contain only one file, wetransfer does not zip the content. Be carefull when using the downloadPipe function. You can obtain all files information using the getInfo function. 




# isValidWetransfertUrl

Return a NodeJS URL object if the url is valid.

If not, it return false



# Get information about weTransfert url

## Exemple

``` javascript
const { getInfo } = require('wetransfert');

getInfo('myWeTransfertURL')
    .then((data) => {
      console.log('success  ', data);
    })
    .catch((err) => {
      console.error('error  ' + err);
    })

```

## Response Exemple

``` json
{
  "content": {
    "id": "cff0151af18a003424fad90a47375f3620201113204655",
    "state": "downloadable",
    "transfer_type": 4,
    "shortened_url": "https://we.tl/t-BUr6nd2DAP",
    "expires_at": "2020-11-20T20:47:07Z",
    "password_protected": false,
    "uploaded_at": "2020-11-13T20:47:07Z",
    "expiry_in_seconds": 596443,
    "size": 497659,
    "deleted_at": null,
    "recipient_id": null,
    "display_name": "flower-3876195_960_720.jpg",
    "security_hash": "828b5e",
    "description": "Hi this is an upload from https://github.com/orgrimarr/node-wetransfert API",
    "items": [
      {
        "id": "579ed7dce3ea1b93a8dff0ee67c0b0e620201113204655",
        "name": "flower-3876195_960_720.jpg",
        "retries": 0,
        "size": 147377,
        "item_type": "file",
        "previewable": true,
        "content_identifier": "file"
      },
      {
        "id": "4d121cf7fb261b2fb2e728afa6a36b7520201113204655",
        "name": "gnu.txt",
        "retries": 0,
        "size": 34667,
        "item_type": "file",
        "previewable": false,
        "content_identifier": "file"
      }
    ],
    "sessionCookie": "_wt_session=UkJPUmNjZW5EeEpWejlya; domain=wetransfer.com; path=/; secure; HttpOnly; SameSite=Lax",
    "csrf": "+dM4tvhVEguYfovUU60pnkK01uaabujp1oAsm8iNe2sf4ZBDeke2cTRR6VNBPZeegSF4fzgKylX+zyeZQEtFeA=="
  },
  "downloadURI": "https://download.wetransfer.com//eu2/cff0151af18a003424fad..........."
}
```


# Upload
You can upload a total file size >= 2Gibibyte (2147483648 Byte)

upload('mailSender', ['receiverMail'], ['file1'], 'myMessage', 'ui_language', username, password)

**/!\ Wetransfer upload (send email) is no longer possible without a wetransfer account. Wetransfer add a captcha so i can't script the upload. You can specify yout wetransfer username/password to the upload function**

The upload function parameters :
- mailSender: A valid mail address of the sender
- receiverMail: An array of valid destination addreEnd objectansfer
- myMessage: The message you want to send
- ui_language: The language of the wetransfer receiver. ex: en, fr
- username: Your wetransfer account username. /!\ username and mailSender email must be the same
- password: Your wetransfer account password

The upload function expose an event emitter and will trigger 3 event :
- progress: Represent the state of the upload
- end: It wil be triggered when the upload end with success.
- error: Il will be triggered on error, the transfer is canceled after an error

## Exemple
``` javascript
    const myUpload = upload('mailSender@gmail.com', ['receive1@gmail.com', 'receive2@gmail.com'], ['D:/Video/MEDIA150212142309947screen.mp4', 'C:/Users/pc/Desktop/toto2.txt', 'C:/Users/pc/Desktop/tata.txt'], 'Hello World', 'en', 'username', 'password')
    .on('progress', (progress) => console.log('PROGRESS', progress))
    .on('end', (end) => console.log('END', end))
    .on('error', (error) => console.error('ERROR', error));

    setTimeout(function(){
        myUpload.cancel();
    }, 10000);
```

## Payload Exemple
``` javascript
    const toUpload = [
        path.resolve(__dirname, './ressources/flower-3876195_960_720.jpg'),   // Upload a file from path
        path.resolve(__dirname, './ressources/landscape-3779159_960_720.jpg'),
        path.resolve(__dirname, './ressources/gnu.txt'),
        {   // Upload a buffer
            name: "test buffer",
            buffer: Buffer.from("THIS IS A TEST BUFFER")
        },
        {   // upload a stream
            name: "test stream from file",
            stream: fs.createReadStream(path.resolve(__dirname, './ressources/water-lily-3784022_960_720.jpg')),
            size: fs.statSync(path.resolve(__dirname, './ressources/water-lily-3784022_960_720.jpg')).size
        }
    ]

    const myUpload = upload('', '', toUpload, 'Hello World', 'en')
    .on('progress', (progress) => console.log('PROGRESS', progress))
    .on('end', (end) => console.log('END', end))
    .on('error', (error) => console.error('ERROR', error));

    setTimeout(function(){
        myUpload.cancel();
    }, 10000);
```

## Upload using node-wetransfer Payload Wrapper
``` javascript
    const Payload = require('wetransfert').Payload

    const toUpload = [
        new Payload({filePath: path.resolve(__dirname, './ressources/flower-3876195_960_720.jpg')}),
        new Payload({filePath: path.resolve(__dirname, './ressources/landscape-3779159_960_720.jpg')}),
        new Payload({
          filePath: path.resolve(__dirname, './ressources/gnu.txt'),
          name: "gnu_renamed.txt" // Overide file name
        }),
        new Payload({   // Upload a buffer
            name: "test buffer",
            buffer: Buffer.from("THIS IS A TEST BUFFER")
        }),
        new Payload({   // upload a stream
            name: "test stream from file",
            stream: fs.createReadStream(path.resolve(__dirname, './ressources/water-lily-3784022_960_720.jpg')),
            size: fs.statSync(path.resolve(__dirname, './ressources/water-lily-3784022_960_720.jpg')).size
        })
    ]

    const myUpload = upload('', '', toUpload, 'Hello World', 'en')
    .on('progress', (progress) => console.log('PROGRESS', progress))
    .on('end', (end) => console.log('END', end))
    .on('error', (error) => console.error('ERROR', error));

    setTimeout(function(){
        myUpload.cancel();
    }, 10000);
```

> /!\ If you want tu upload from a Stream you must provide le steam length. It is mandatory from wetransfer

## Progress object
``` json
{
  "percent": 0.5,                
  "speed": 554732,               
  "size": {
      "total": 90044871,        
      "transferred": 27610959    
  },
  "time": {
      "elapsed": 36.235,        
      "remaining": 81.403       
  }        
}
```
- percent: Overall percentage (between 0 to 1)
- speed: The upload speed in bytes/sec
- total: The total payload size in bytes
- transferred: The transferred payload size in bytes
- elapsed: The total elapsed seconds since the start (3 decimals)
- remaining: The remaining seconds to finish (3 decimals)

## End object
``` json
{
    "id": "f657a4d4dfda8285b871c268621e70ac20190105125429",
    "state": "downloadable",
    "transfer_type": 4,
    "shortened_url": "https://we.tl/t-332ONV4tUJ",
    "expires_at": "2019-01-12T12:54:36Z",
    "password_protected": false,
    "uploaded_at": "2019-01-05T12:54:36Z",
    "expiry_in_seconds": 604792,
    "size": 462915,
    "deleted_at": null,
    "recipient_id": null,
    "security_hash": "86876f",
    "description": "Hi this is an upload from https://github.com/orgrimarr/node-wetransfert API",
    "items": [{
            "id": "aa05a51ab020f28d95aadd21031f63c020190105125429",
            "name": "flower-3876195_960_720.jpg",
            "retries": 0,
            "size": 147377,
            "previewable": true,
            "content_identifier": "file"
        },
        ...
    ]
}
```

## Upload without email

If mailSender and receiverMail is equal '', you can upload files without send email.
Remember do not forget get URL in "end" object.

With this mode you dont need a wetransfer account


[End Object](#response-exemple)


# To do

- improve error handling
- provide pip option for download/upload function
-


# Known Bugs
-


Don't hesitate to give your feedback on github and let me know of any bug you might encounter

if you have any issue please use the debug mode before open an issue
``` javascript
// Juste add the begining of your script
process.env.DEBUG = "wetransfert*"
```
