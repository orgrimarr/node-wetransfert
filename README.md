# [node-wetransfert](https://github.com/orgrimarr/node-wetransfert)

## Download [wetransfer](https://wetransfer.com/) content with nodeJS ! - Unofficial API for wetransfer

[![Known Vulnerabilities](https://snyk.io/test/github/orgrimarr/node-wetransfert/badge.svg)](https://snyk.io/test/github/orgrimarr/node-wetransfert)

[![CodeQL analysis](https://github.com/orgrimarr/node-wetransfert/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/orgrimarr/node-wetransfert/actions/workflows/codeql-analysis.yml)

[![Regression tests](https://github.com/orgrimarr/node-wetransfert/actions/workflows/regression.yml/badge.svg)](https://github.com/orgrimarr/node-wetransfert/actions/workflows/regression.yml)

## Changelog

- 2.4.0
  - Fix download
  - Login/Download no longer working
- 2.3.10
  - Merge #36 Remove csrf trim
- 2.3.9
  - Fix minor security issue that allows fake wetransfer domains #33
- 2.3.7 / 2.3.8
  - Allowing subdomain url (https://orgrimarr.wetransfer.com)
  - Fix dep security issue #30
  - Fix dep security issue #31
- 2.3.6
  - Fix dep security issue (node-fetch)
- 2.3.5
  - Upgrade libs versions
  - Fix dep security issue #28
- 2.3.4
  - Fix uploadFileStream is not defined for big files #27
  - Fix dep security issue #26
  - Fix dep security issue #25
  - Fix dep security issue #24
  - Fix dep security issue #23
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

## Table of content

- [Install](#Install)
- [Use custom proxy](#Use-custom-proxy)
- [Download](#Download-weTransfer-content-from-url)
  - [From url](#Download-weTransfer-content-from-url)
  - [From url by file ID](#Download-weTransfer-file-by-ID)
  - [Pipe](#Download-weTransfer-content-from-url-pipe-response)
- [Get infos](#isValidWetransfertUrl)
  - [Validate url](#isValidWetransfertUrl)
  - [Get url detail](#Get-information-about-weTransfert-url)
- [Known Bugs](#Known-Bugs)

## Install

``` shell
npm install wetransfert --save
or
yarn add wetransfert
```

Tested in node 18.x

### You can require the module like this

``` javascript
const { upload, download, getInfo, isValidWetransfertUrl } = require('wetransfert');
```  

## Use custom proxy

- Add HTTP_PROXY or HTTPS_PROXY environement variable

## Download weTransfer content from url

### download(url, folder)

The function take a valid wetransfer url and a destination folder

Simply return a [PromiseProgress](https://github.com/sindresorhus/p-progress)

The response is an object describing the [weTransfert content](#response-example)

### Example

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

## Download weTransfer file by ID

### download(url, folder, fileIds)

- fileIds: An array of wetransfer file id

### Example

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

## Download weTransfer content from url pipe response

- (progress with callback)

### downloadPipe(url)

This function take a valid wetransfer url. Like the classique download function, you can specify the file ids you want to download. downloadPipe(response.shortened_url, ["fileID"])

It return a Promise and resolve a ReadableStream you can pipe.

If you need a progress, you can obtain the total size with the getInfo function

### Example

``` javascript
const { downloadPipe } = require('wetransfert');

downloadPipe(response.shortened_url, null)
  .then(files => {
      files.pipe(fs.createWriteStream("/home/orgrimarr/wetransfer/myDownload.zip"))
  })
  .catch(console.error)
```

> /!\ If your transfer contain only one file, wetransfer does not zip the content. Be carefull when using the downloadPipe function. You can obtain all files information using the getInfo function.

## isValidWetransfertUrl

Return a NodeJS URL object if the url is valid.

If not, it return false

## Get information about weTransfert url

### Example

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

## Response Example

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

## Known Bugs

- Upload
- Login

``` javascript
// Juste add the begining of your script
process.env.DEBUG = "wetransfert*"
```
