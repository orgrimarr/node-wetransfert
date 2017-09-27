# node-wetransfert
Download wetransfert content with nodeJS !

## Install
``` javascript 
npm install wetransfert --save
or
yarn add wetransfert
```

## You can require the module like this

``` javascript 
const { getInfo,  isValidWetransfertUrl, download } = require('node-wetransfert');
```  
# Download weTransfert content from url

### download(url, folder)
The function take a valid wetransfert url and a destination folder

Simply return a [PromiseProgress](https://github.com/request/request)

The response is an object describing the [weTransfert content](#response-exemple)

## Exemple

``` javascript
const { download } = require('node-wetransfert');

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
const { getInfo } = require('node-wetransfert');

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
- provide pip option for download function
- upload