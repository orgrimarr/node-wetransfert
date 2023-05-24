const urlUtils = require('url')
const fetch = require('node-fetch')
const debug = require('debug')('wetransfert:utils')
const cheerio = require('cheerio')
const HttpsProxyAgent = require('https-proxy-agent')
const https = require('https')

const wetransferEndpoint = "https://wetransfer.com/"
const apiVersion = "v4"
debug("wetransfer API version: " + apiVersion)
exports.apiVersion = apiVersion

const wetransferDomain = 'wetransfer.com'
const weTransfertRegex = /(https:\/\/wetransfer\.com\/downloads\/[0-9a-zA-Z]{10,}\/[0-9a-zA-Z]{10,}\/[0-9a-zA-Z]{4,})/i
const weTransfertRegexShort = /(https:\/\/we\.tl\/.{5,})/i
const weTransfertRegexMedium = /(https:\/\/wetransfer\.com\/downloads\/[0-9a-zA-Z]{10,}\/[0-9a-zA-Z]{4,})/i

const getHttpAgent = function () {
    const proxy = process.env.http_proxy || process.env.HTTP_PROXY || process.env.https_proxy || process.env.HTTPS_PROXY
    if (proxy) {
        return new HttpsProxyAgent(proxy)
    }
    return https.globalAgent
}
exports.getHttpAgent = getHttpAgent


const expandUrl = async function (shortUrl) {
    const result = await fetch(shortUrl, {
        method: "HEAD",
        redirect: 'follow',
        follow: 20,
        agent: getHttpAgent()
    })
    const longUrl = result.url
    debug(`expandUrl: "${shortUrl}" => "${longUrl}"`)
    return longUrl
}

exports.isValidWetransfertUrl = function (url = '') {
    if (typeof url !== "string") {
        return false
    }
    const wetransferUrl = new urlUtils.URL(url)
    const originalUrl = url
    if(wetransferUrl.hostname !== wetransferDomain && wetransferUrl.hostname.endsWith(`.${wetransferDomain}`)){
        // subdomain url
        wetransferUrl.hostname = wetransferDomain
        url = wetransferUrl.toString()
    }
    if (weTransfertRegex.exec(url) !== null || weTransfertRegexShort.exec(url) !== null || weTransfertRegexMedium.exec(url) !== null) {
        debug(`isValidWetransfertUrl ${originalUrl} true` )
        return new urlUtils.URL(originalUrl)
    }
    debug(`isValidWetransfertUrl ${originalUrl} false`)
    return false
}

exports.formatDownloadApiUri = async function (urlObj, fileId) {
    if(!(urlObj instanceof URL)){
        throw new Error('Error during formatDownloadApiUri. urlObj must be an instance of URL')
    }
    if (fileId && !Array.isArray(fileId)) {
        fileId = [fileId]
    }

    const wetransferUrl = new urlUtils.URL(urlObj.toString())
    if(wetransferUrl.hostname !== wetransferDomain && wetransferUrl.hostname.endsWith(`.${wetransferDomain}`)){  // subdomain url
        wetransferUrl.hostname = wetransferDomain
    }

    // Short link 
    if (weTransfertRegexShort.exec(wetransferUrl.href) !== null) {
        debug("formatDownloadApiUri: short_url", urlObj.pathname.split('/'))
        const resp = await expandUrl(urlObj.href)
        const newURL = new urlUtils.URL(resp)

        if (newURL) {
            const [, , urlID, hash] = newURL.pathname.split('/')
            debug('hash', hash)
            debug('urlID', urlID)
            const downloadParms = {
                uri: `https://wetransfer.com/api/${apiVersion}/transfers/${urlID}/download`,
                body: {
                    "security_hash": hash,
                    "intent": "entire_transfer"
                }
            }
            if (fileId) {
                downloadParms.body.intent = "single_file"
                downloadParms.body.file_ids = fileId
            }

            return downloadParms
        }
    }

    // Nomal url
    if (weTransfertRegex.exec(wetransferUrl.href) !== null) {
        debug("formatDownloadApiUri: normal_url", urlObj.pathname.split('/'))
        const [, , urlID, recipient_id, hash] = urlObj.pathname.split('/')
        debug('recipient_id', recipient_id)
        debug('hash', hash)
        debug('urlID', urlID)
        const downloadParms = {
            uri: `https://wetransfer.com/api/${apiVersion}/transfers/${urlID}/download`,
            body: {
                "recipient_id": recipient_id,
                "security_hash": hash,
                "intent": "entire_transfer"
            }
        }
        if (fileId) {
            downloadParms.body.intent = "single_file"
            downloadParms.body.file_ids = fileId
        }

        return downloadParms
    }

    // Medium  url
    if (weTransfertRegexMedium.exec(wetransferUrl.href) !== null) {
        debug("formatDownloadApiUri: medium_url", urlObj.pathname.split('/'))
        const [, , urlID, hash] = urlObj.pathname.split('/')
        debug('hash', hash)
        debug('urlID', urlID)
        const downloadParms = {
            uri: `https://wetransfer.com/api/${apiVersion}/transfers/${urlID}/download`,
            body: {
                "security_hash": hash,
                "intent": "entire_transfer"
            }
        }
        if (fileId) {
            downloadParms.body.intent = "single_file"
            downloadParms.body.file_ids = fileId
        }

        return downloadParms
    }

    return {}
}

exports.waitAsync = function (time, data) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            return resolve(data)
        }, time)
    })
}

const getWetransferPageContent = async function (endpoint = wetransferEndpoint, cookies) {
    debug(`getWetransferPageContent: GET ${endpoint}`)
    if (typeof endpoint === 'object') {
        endpoint = urlUtils.format(endpoint)
    }

    const options = {
        agent: getHttpAgent()
    }
    if (cookies) {
        options.headers = {
            'cookie': cookies,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.101 Safari/537.36'
        }
    }
    const result = await fetch(endpoint, options)
    if (result.status !== 200) {
        debug(await result.text())
        throw new Error(`Error GET ${endpoint} server respond with status ${result.status} ${result.statusText}`)
    }
    const htmlPage = await result.text()
    const sessionCookie = result.headers.raw()['set-cookie'].filter(cookie => cookie.includes('session'))[0]
    const $ = cheerio.load(htmlPage)
    const csrf = $("meta[name=csrf-token]").attr('content')

    return {
        htmlPage,
        sessionCookie,
        csrf
    }
}
exports.getWetransferPageContent = getWetransferPageContent

exports.getContentSecurity = async function (urlObj) {
    debug(`getContentInfo: GET ${urlObj.href}`)
    const { sessionCookie, csrf } = await getWetransferPageContent(urlObj.href)
    debug(`getContentInfo: sessionCookie, csrf`, sessionCookie, csrf)

    return {
        sessionCookie,
        csrf
    }
}

exports.login = async function (user, password) {
    debug(`Login ${user}`)
    const endpoint = `https://wetransfer.com/api/${apiVersion}/auth/session`

    const loginSessionInfos = await getWetransferPageContent()

    const result = await fetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({
            "email": user,
            "password": password,
            "remember_me": false
        }),
        headers: {
            'cookie': loginSessionInfos.sessionCookie,
            'Content-Type': 'application/json',
            'authority': 'wetransfer.com',
            'accept': 'application/json, text/plain, */*',
            'accept-language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
            'referer': 'https://wetransfer.com/',
            'sec-fetch-mode': 'cors',
            'sec-fetch-dest': 'empty',
            'x-requested-with': 'XMLHttpRequest',
            'x-csrf-token': loginSessionInfos.csrf,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.101 Safari/537.36'
        },
        agent: getHttpAgent()
    })
    if (!result.ok) {
        const text = await result.text()
        throw new Error(`Error GET ${endpoint} server respond with status ${result.status} ${result.statusText}. ${text}`)
    }
    const data = await result.json()

    debug(data)

    const newCookie = result.headers.raw()['set-cookie'].filter(cookie => cookie.includes('session'))[0]
    const infos = await getWetransferPageContent(wetransferEndpoint, newCookie)

    return {
        sessionCookie: infos.sessionCookie,
        csrf: infos.csrf,
        data: data
    }
}
