const { getInfo,  isValidWetransfertUrl} = require('node-wetransfert');

const myUrl = 'https://wetransfer.com/downloads/2ded33b26c077721e9e8c4708b32815920170902102205/48db1eb8dc2878fb1f62e8866bdd980520170902102205/5696ab?utm_campaign=WT_email_tracking&utm_content=general&utm_medium=download_button&utm_source=notify_recipient_email';

getInfo(myUrl)
    .then((data) => {
        console.log(JSON.stringify(data))
    })
    .catch((err) => {
        console.error('error  ' + err)
    })

    