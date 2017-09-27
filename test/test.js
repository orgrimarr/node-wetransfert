const { getInfo,  isValidWetransfertUrl, download} = require('../index');

const myUrl = '';
/*
getInfo(myUrl)
    .then((data) => {
        console.log(JSON.stringify(data))
    })
    .catch((err) => {
        console.error('error  ' + err)
    })
*/

download(myUrl, './test/dest/wetransfert/totot/test')
    .onProgress(progress => {
        console.log('progress', progress);
    })
    .then((res) => {
        console.log(res); // success
    })
    .catch((err) => {
        console.error('error  ', err);
    });

    