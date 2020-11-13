const { parse }         = require('url')
const fetch             = require('node-fetch')
const debug             = require('debug')('wetransfert:utils')

const apiVersion = "v4"
debug("wetransfer API version: " + apiVersion)

const expandUrl = async function(shortUrl) {
    const result = await fetch(shortUrl, {
        method: "HEAD",
        redirect: 'follow',
        follow: 20
    })
    const longUrl = result.url
    debug(`expandUrl: "${shortUrl}" => "${longUrl}"`)
    return longUrl
}

const weTransfertRegex         = /(https:\/\/wetransfer\.com\/downloads\/[0-9a-zA-Z]{10,}\/[0-9a-zA-Z]{10,}\/[0-9a-zA-Z]{4,})/i
const weTransfertRegexShort    = /(https:\/\/we\.tl\/.{5,})/i
const weTransfertRegexMedium   = /(https:\/\/wetransfer\.com\/downloads\/[0-9a-zA-Z]{10,}\/[0-9a-zA-Z]{4,})/i

exports.isValidWetransfertUrl = function(url){
    if(weTransfertRegex.exec(url) !== null || weTransfertRegexShort.exec(url) !== null || weTransfertRegexMedium.exec(url) !== null){
        debug(`isValidWetransfertUrl: true`)
        return parse(url)
    }
    else{
        debug(`isValidWetransfertUrl: false`)
        return false
    }
}

exports.formatDownloadApiUri = async function(urlObj, fileId){
    if(fileId && !Array.isArray(fileId)){
        fileId = [fileId]
    }

    // Short link 
    if(weTransfertRegexShort.exec(urlObj.href) !== null){
        debug("formatDownloadApiUri: short_url")
        const resp = await expandUrl(urlObj.href)
        const newURL = parse(resp)
        if(newURL){
            const [, , urlID, hash] = newURL.pathname.split('/')
            const downloadParms = {
                uri: `https://wetransfer.com/api/${apiVersion}/transfers/${urlID}/download`,
                body: {
                    "security_hash": hash,
                    "intent": "entire_transfer"
                }
            }
            if(fileId){
                downloadParms.body.intent = "single_file"
                downloadParms.body.file_ids = fileId
            }

            return downloadParms
        }
    }

    // Nomal url
    if(weTransfertRegex.exec(urlObj.href) !== null){
        debug("formatDownloadApiUri: normal_url")
        const [, , urlID, recipient_id, hash] = urlObj.pathname.split('/')
        const downloadParms = {
            uri: `https://wetransfer.com/api/${apiVersion}/transfers/${urlID}/download`,
            body: {
                "recipient_id": recipient_id,
                "security_hash": hash,
                "intent": "entire_transfer"
            }
        }
        if(fileId){
            downloadParms.body.intent = "single_file"
            downloadParms.body.file_ids = fileId
        }

        return downloadParms
    }

    // Medium  url
    if(weTransfertRegexMedium.exec(urlObj.href) !== null){
        debug("formatDownloadApiUri: medium_url")
        const [, , urlID, hash] = urlObj.pathname.split('/')
        const downloadParms = {
            uri: `https://wetransfer.com/api/${apiVersion}/transfers/${urlID}/download`,
            body: {
                "security_hash": hash,
                "intent": "entire_transfer"
            }
        }
        if(fileId){
            downloadParms.body.intent = "single_file"
            downloadParms.body.file_ids = fileId
        }

        return downloadParms
    }
}

exports.waitAsync = function(time, data){
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            return resolve(data)
        }, time)
    })
}