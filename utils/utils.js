const urlUtils          = require('url')
const fetch             = require('node-fetch')
const debug             = require('debug')('wetransfert:utils')
const cheerio           = require('cheerio')

const wetransferEndpoint = "https://wetransfer.com/"
const apiVersion = "v4"
debug("wetransfer API version: " + apiVersion)
exports.apiVersion = apiVersion

const weTransfertRegex         = /(https:\/\/wetransfer\.com\/downloads\/[0-9a-zA-Z]{10,}\/[0-9a-zA-Z]{10,}\/[0-9a-zA-Z]{4,})/i
const weTransfertRegexShort    = /(https:\/\/we\.tl\/.{5,})/i
const weTransfertRegexMedium   = /(https:\/\/wetransfer\.com\/downloads\/[0-9a-zA-Z]{10,}\/[0-9a-zA-Z]{4,})/i

const _preloaded_transfer_Regex = /\_preloaded\_transfer\_/g
const removeVarDeclarationRegex = /var[\s]*\_preloaded\_transfer\_[\s]*=/g
const removeLastSemicolon = /(}\;\n)$/g


const extractVar = async function (text) {
    const json = text.replace(removeVarDeclarationRegex, '').replace(removeLastSemicolon, '}')
    return JSON.parse(json)
}

const extractScriptContent = function (body) { // Return a list of var
    return new Promise((resolve, reject) => {
        const $ = cheerio.load(body)
        $('script').each(function () {
            const content = $(this).html()
            if (_preloaded_transfer_Regex.exec(content)) {
                return resolve(content)
            }
        })
        return reject(new Error('No _preloaded_transfer_ var found !'))
    })
}

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

exports.isValidWetransfertUrl = function(url){
    if(weTransfertRegex.exec(url) !== null || weTransfertRegexShort.exec(url) !== null || weTransfertRegexMedium.exec(url) !== null){
        debug(`isValidWetransfertUrl: true`)
        return new urlUtils.URL(url)
    }
    debug(`isValidWetransfertUrl: false`)
    return false
}

exports.formatDownloadApiUri = async function(urlObj, fileId){
    if(fileId && !Array.isArray(fileId)){
        fileId = [fileId]
    }

    // Short link 
    if(weTransfertRegexShort.exec(urlObj.href) !== null){
        debug("formatDownloadApiUri: short_url")
        const resp = await expandUrl(urlObj.href)
        const newURL = new urlUtils.URL(resp)

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

const getWetransferPageContent = async function(endpoint = wetransferEndpoint){
    debug(`getWetransferPageContent: GET ${endpoint}`)
    if(typeof endpoint === 'object'){
        endpoint = urlUtils.format(endpoint)
    }
    const result = await fetch(endpoint)
    if (result.status !== 200) {
        debug(await result.text())
        throw new Error(`Error GET ${endpoint} server respond with status ${result.status} ${result.statusText}`)
    }
    const htmlPage = await result.text()
    const sessionCookie = result.headers.raw()['set-cookie'].filter(cookie => cookie.includes('session'))[0]
    const $ = cheerio.load(htmlPage)
    const csrf = $("meta[name=csrf-token]").attr('content').trim()

    return {
        htmlPage,
        sessionCookie,
        csrf
    }
}
exports.getWetransferPageContent = getWetransferPageContent

exports.getContentInfo = async function (urlObj) {
    debug(`getContentInfo: GET ${urlObj.href}`)
    const {htmlPage, sessionCookie, csrf} = await getWetransferPageContent(urlObj.href)
 
    const scripts = await extractScriptContent(htmlPage)
    const vars    = await extractVar(scripts)
    return {
        ...vars,
        sessionCookie,
        csrf
    }
}
