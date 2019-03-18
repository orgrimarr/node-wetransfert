const { parse }         = require('url');
const request           = require("request");
const debug             = require('debug')('wetransfert:utils')

const apiVersion = "v4"
debug("wetransfer API version: " + apiVersion)

function expandUrl(shortUrl) {
    return new Promise((resolve, reject) => {
        request( { method: "HEAD", url: shortUrl, followAllRedirects: true },
        function (error, response) {
            if(error){
                return reject(error);
            }
                debug(`expandUrl: "${shortUrl}" => "${response.request.href}"`)
                return resolve(response.request.href);
            });
    });
}

const weTransfertRegex         = /(https:\/\/wetransfer\.com\/downloads\/[0-9a-zA-Z]{10,}\/[0-9a-zA-Z]{10,}\/[0-9a-zA-Z]{4,})/i;
const weTransfertRegexShort    = /(https:\/\/we\.tl\/.{5,})/i;
const weTransfertRegexMedium   = /(https:\/\/wetransfer\.com\/downloads\/[0-9a-zA-Z]{10,}\/[0-9a-zA-Z]{4,})/i;

exports.isValidWetransfertUrl = function(url){
    if(weTransfertRegex.exec(url) !== null || weTransfertRegexShort.exec(url) !== null || weTransfertRegexMedium.exec(url) !== null){
        debug(`isValidWetransfertUrl: true`)
        return parse(url);
    }
    else{
        debug(`isValidWetransfertUrl: false`)
        return false
    }
}

exports.formatDownloadApiUri = async function(urlObj){
    try{
        // Short link 
        if(weTransfertRegexShort.exec(urlObj.href) !== null){
            debug("formatDownloadApiUri: short_url")
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

        // Nomal url
        if(weTransfertRegex.exec(urlObj.href) !== null){
            debug("formatDownloadApiUri: normal_url")
            const [, , urlID, recipient_id, hash] = urlObj.pathname.split('/');
            return  {
                uri: `https://wetransfer.com/api/${apiVersion}/transfers/${urlID}/download`,
                body: {
                    "recipient_id": recipient_id,
                    "security_hash": hash
                }
            }
        }

        // Medium  url
        if(weTransfertRegexMedium.exec(urlObj.href) !== null){
            debug("formatDownloadApiUri: medium_url")
            const [, , urlID, hash] = urlObj.pathname.split('/');
            return  {
                uri: `https://wetransfer.com/api/${apiVersion}/transfers/${urlID}/download`,
                body: {
                    "security_hash": hash
                }
            }
        }
    }
    catch(e){
        throw e;
    }
}

exports.waitAsync = function(time, data){
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            return resolve(data)
        }, time)
    })
}