const { getInfo,  isValidWetransfertUrl, download} = require('../index');

const myUrl = 'https://wetransfer.com/downloads/29b3a2f0fdd34c84259db588212d2d4f20170927130043/94c9ed1d76df9ed8d7b3f07157e7f26220170927130043/a682c6';
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

    