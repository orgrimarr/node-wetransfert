# [node-wetransfert](https://github.com/orgrimarr/node-wetransfert)
## Download [wetransfert](https://wetransfer.com/) content with nodeJS !

# Install
```
npm install wetransfert --save
or
yarn add wetransfert
```

## You can require the module like this

``` javascript 
const { upload, download, getInfo,  isValidWetransfertUrl  } = require('wetransfert');
```  
# Upload
You can upload a total file size >= 2Gibibyte (2147483648 Byte)

upload('mailSender', ['receiverMail'], ['file1'], 'myMessage', 'ui_language')

The upload function parameter :
- mailSender: A valid mail address of the sender
- receiverMail: An array of valid destination address
- file1: An array of valid file path you wan to transfer
- myMessage: The message you want to send
- ui_language: The language of the wetransfer receiver. ex: en, fr

The upload function expose an event emitter and will trig 3 event :
- progress: Represent to state of the uploadS
- end: It wiil be triged when the upload end with success. 
- error: Il will be triged on error, the transfert is canceled after an error

## Exemple
``` javascript
    const myUpload = upload('mailSender@gmail.com', ['receive1@gmail.com', 'receive2@gmail.com'], ['D:/Video/MEDIA150212142309947screen.mp4', 'C:/Users/pc/Desktop/toto2.txt', 'C:/Users/pc/Desktop/tata.txt'], 'Hello World', 'en')
    .on('progress', (progress) => console.log('PROGRESS', progress))
    .on('end', (end) => console.log('END', end))
    .on('error', (error) => console.error('ERROR', error));

    setTimeout(function(){
        myUpload.cancel();
    }, 10000);
```

## Progress object
``` json
{
  percent: 0.5,               Overall percent (between 0 to 1) 
  speed: 554732,              The upload speed in bytes/sec 
  size: { 
      total: 90044871,        The total payload size in bytes 
      transferred: 27610959   The transferred payload size in bytes 
  }, 
  time: { 
      elapsed: 36.235,        The total elapsed seconds since the start (3 decimals) 
      remaining: 81.403       The remaining seconds to finish (3 decimals)
  }        
}
```

## End object
The end object is the same as the download response object or the get info response object

[End Object](#response-exemple)

# Download weTransfer content from url

### download(url, folder)
The function take a valid wetransfert url and a destination folder

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
    "id": "myID",
    "security_hash": "9cc5646",
    "state": "downloadable",
    "transfer_type": 1,
    "shortened_url": "myShortURI",
    "title": null,
    "description": "",
    "items": [
      {
        "id": "myItemID",
        "content_identifier": "file",
        "name": "MyFIleName",
        "size": 30779833462,
        "previewable": false
      },
      {
        
      }
    ],
    "password_protected": false,
    "per_file_download_available": true,
    "expires_at": "2017-09-09T10:22:05Z",
    "uploaded_at": "2017-09-02T10:22:20Z",
    "deleted_at": null,
    "size": 31067650,
    "expiry_in_days": 7,
    "expiry_in_seconds": 597661
  },
  "downloadURI": "myDownloadURI"
}
```

# isValidWetransfertUrl

Return a NodeJS URL object if the url is valid.

If not, it return false


# To do

- improve error handling
- provide pip option for download/upload function
