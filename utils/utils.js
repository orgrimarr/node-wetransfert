const { parse }         = require('url');
const request           = require("request");

const apiVersion = "v4"

function expandUrl(shortUrl) {
    return new Promise((resolve, reject) => {
        request( { method: "HEAD", url: shortUrl, followAllRedirects: true },
            function (error, response) {
                if(error){
                    return reject(error);
                }
                return resolve(response.request.href);
            });
    });
}

const weTransfertRegex      = /(https:\/\/wetransfer\.com\/downloads\/[0-9a-z]{10,}\/[0-9a-z]{10,}\/[0-9a-z]{4,})/;
const weTransfertRegexShort = /(https:\/\/we\.tl\/[0-9a-zA-Z]{5,})/;
const weTransfertRegexMoy   = /(https:\/\/wetransfer\.com\/downloads\/[0-9a-z]{10,}\/[0-9a-z]{4,})/;

exports.isValidWetransfertUrl = function(url){
    if(weTransfertRegex.exec(url) !== null || weTransfertRegexShort.exec(url) !== null || weTransfertRegexMoy.exec(url) !== null){
        return parse(url);
    }
    else{
        return false
    }
}

exports.formatDownloadApiUri = async function(urlObj){
    try{
        if(weTransfertRegexShort.exec(urlObj.href) !== null){
            const resp = await expandUrl(urlObj.href)
            const newURL = parse(resp);
            if(newURL){
                const [, , urlID, hash] = newURL.pathname.split('/');
                return  {
                    uri: `https://wetransfer.com/api/${apiVersion}/transfers/${urlID}/download`,
                    body: {
                        "security_hash": hash
                    }
                }
            }
        }
        if(weTransfertRegexMoy.exec(urlObj.href) !== null){
            const [, , urlID, hash] = urlObj.pathname.split('/');
            return  {
                uri: `https://wetransfer.com/api/${apiVersion}/transfers/${urlID}/download`,
                body: {
                    "security_hash": hash
                }
            }
        }
        else{
            const [, , urlID, recipient_id, hash] = urlObj.pathname.split('/');
            return  {
                uri: `https://wetransfer.com/api/${apiVersion}/transfers/${urlID}/download`,
                body: {
                    "recipient_id": recipient_id,
                    "security_hash": hash
                }
            }
        }
    }
    catch(e){
        throw e;
    }
}