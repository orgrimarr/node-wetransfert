# node-wetransfert
Download wetransfert content with nodeJS

## Install
``` javascript 
npm install wetransfert
or
yarn add wetransfert
```

## You can require the module like this

``` javascript 
const { getInfo,  isValidWetransfertUrl} = require('node-wetransfert');
```  

## Get information about weTransfert url


For now you can just obtain an object witch contain a list a the weTransfert content and a download uri

# Exemple

``` javascript 
getInfo('myWeTransfertURL')
    .then((data) => {
        console.log('success  ', data)
    })
    .catch((err) => {
        console.error('error  ' + err)
    })

```

# Response Exemple

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

Return a nodeJS URL object if the url is valid
If not, it return false