process.env.DEBUG = "*"
const wt = require('../index');
const path = require('path')

const uri = "https://wetransfer.com/downloads/b3ce330ccca46e7478f6058e6da7df0c20190318090430/c411c06b12af62fb3741be534e69333f20190318090430/788a94"
wt.getInfo(uri)
    .then((res) => {
        console.log(res);
        return wt.download(uri, path.join(__dirname, 'dest'))
    })
    .then(res =>  {
        console.log("done")
    })
    .catch((err) => {
        console.log(err);
        // 403 - {"message":"No download access to this Transfer"}
    });