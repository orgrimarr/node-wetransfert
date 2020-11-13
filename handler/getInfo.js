const cheerio   = require('cheerio')
const fetch     = require('node-fetch')
const debug     = require('debug')("wetransfert:getinfos")

const { isValidWetransfertUrl, formatDownloadApiUri, waitAsync } = require('../utils/utils')


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
        return reject('No _preloaded_transfer_ var found !')
    })
}

const getContentInfo = async function (urlObj) {
    debug(`getContentInfo: GET ${urlObj.href}`)
    const result = await fetch(urlObj.href)
    if (result.status !== 200) {
        debug(await result.text())
        throw new Error(`Error GET ${urlObj.href} server respond with status ${result.status} ${result.statusText}`)
    }
    const htmlPage = await result.text()
    const sessionCookie = result.headers.raw()['set-cookie'].filter(cookie => cookie.includes('session'))[0]
    const $ = cheerio.load(htmlPage)
    const csrf = $("meta[name=csrf-token]").attr('content').trim()
 
    const scripts = await extractScriptContent(htmlPage)
    const vars = await extractVar(scripts)
    return {
        ...vars,
        sessionCookie,
        csrf
    }
}

const getDownloadUri = async function (urlObj, sessionCookie, csrf, fileIds) {
    const requestParams = await formatDownloadApiUri(urlObj, fileIds)
    debug(`getDownloadUri: POST ${requestParams.uri}  ${JSON.stringify(requestParams.body)}`)
    debug('getDownloadUri sessionCookie', sessionCookie)
    debug('getDownloadUri csrf', csrf)
    const result = await fetch(requestParams.uri, {
        method: 'POST',
        body: JSON.stringify(requestParams.body),
        'headers': {
            'cookie': sessionCookie,
            'Content-Type': 'application/json',
            'x-csrf-token': csrf,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.101 Safari/537.36'
        }
    })

    if (result.status !== 200 && result.status !== 201) {
        debug(await result.text())
        throw new Error(`Error GET ${urlObj.href} server respond with status ${result.status} ${result.statusText}`)
    }

    const data = await result.json()
    
    return data.direct_link
}

const formatResult = function (array) {
    return {
        content: array[0],
        downloadURI: array[1]
    }
}
const getInfo = async function (url, fileIds) {
    if (typeof (url) === 'string') {
        const URLObject = isValidWetransfertUrl(url)
        if (URLObject) {
            const infos = await getContentInfo(URLObject)
            // Cannot get downloadURI if state !== downloadable
            if (infos.state !== "downloadable") {
                return formatResult([infos, null])
            }
            const downloadURI = await getDownloadUri(URLObject, infos.sessionCookie, infos.csrf, fileIds)
            return formatResult([infos, downloadURI])
        }
        throw new Error(`Unhanle url: ${URLObject.href}`)
    }
    throw new Error('Unhanle url - url must be a string')
}


const waitForDownloadable = async function (responseObj) {
    if (responseObj.state === "downloadable" || (typeof responseObj.content === "object" && responseObj.content.state === "downloadable")) {
        return responseObj.content || responseObj
    }
    else {
        debug("node-wetransfert: wait 5s for downloadable state")
        await waitAsync(5000)
        const infos = await (getInfo(responseObj.shortened_url || (typeof responseObj.content === "object" ? responseObj.content.shortened_url : undefined)))
        return waitForDownloadable(infos)
    }
}


exports.getInfo = getInfo
exports.waitForDownloadable = waitForDownloadable
