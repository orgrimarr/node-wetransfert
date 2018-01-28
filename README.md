# [node-wetransfert](https://github.com/orgrimarr/node-wetransfert)
## Download/Upload [wetransfert](https://wetransfer.com/) content with nodeJS ! - Unofficial API for wetransfer

# Install
```
npm install wetransfert --save
or
yarn add wetransfert
```
Tested in node 8.x


## You can require the module like this

``` javascript
const { upload, download, getInfo, isValidWetransfertUrl } = require('wetransfert');
```  

# Upload
You can upload a total file size >= 2Gibibyte (2147483648 Byte)

upload('mailSender', ['receiverMail'], ['file1'], 'myMessage', 'ui_language')

The upload function parameters :
- mailSender: A valid mail address of the sender
- receiverMail: An array of valid destination address
- file1: An array of valid file path you wan to transfer
- myMessage: The message you want to send
- ui_language: The language of the wetransfer receiver. ex: en, fr

The upload function expose an event emitter and will trigger 3 event :
- progress: Represent the state of the upload
- end: It wil be triggered when the upload end with success.
- error: Il will be triggered on error, the transfer is canceled after an error

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
The end object is the same as the download response object or the get info response object

## Upload without email

If mailSender and receiverMail is equal '', you can upload files without send email.
Remember do not forget get URL in "end" object.


[End Object](#response-exemple)

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
-


# Known Bugs
-


Don't hesitate to give your feedback on github and let me know of any bug you might encounter
