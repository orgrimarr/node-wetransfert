const cheerio = require('cheerio');
const request = require('request-promise');
const debug   = require('debug')("wetransfert:getinfos")
const {
    isValidWetransfertUrl,
    formatDownloadApiUri,
    waitAsync
} = require('../utils/utils');


const _preloaded_transfer_Regex = /\_preloaded\_transfer\_/g;
const removeVarDeclarationRegex = /var[\s]*\_preloaded\_transfer\_[\s]*=/g;
const removeLastSemicolon = /(}\;\n)$/g;


const extractVar = function (text) {
    return new Promise((resolve, reject) => {
        try {
            const json = text.replace(removeVarDeclarationRegex, '').replace(removeLastSemicolon, '}');
            return resolve(JSON.parse(json));
        } catch (e) {
            return reject(e.message);
        }
    });
}

const extractScriptContent = function (body) { // Return a list of var
    return new Promise((resolve, reject) => {
        const $ = cheerio.load(body);
        $('script').each(function (index, element) {
            const content = $(this).html();
            if (_preloaded_transfer_Regex.exec(content)) {
                return resolve(content);
            }
        })
        return reject('No _preloaded_transfer_ var found !');
    });
}

const getContentInfo = function (urlObj) {
    return new Promise((resolve, reject) => {
        debug(`getContentInfo: GET ${urlObj.href}`)
        request({
                method: 'GET',
                uri: urlObj.href,
                json: false,
                simple: true,
                resolveWithFullResponse: false
            })
            .then(extractScriptContent)
            .then(extractVar)
            .then((content) => {
                return resolve(content);
            })
            .catch((err) => {
                return reject(err.error);
            })
    });
}

const getDownloadUri = function (urlObj) {
    return new Promise(async (resolve, reject) => {
        try {
            const requestParams = await formatDownloadApiUri(urlObj);
            debug(`getDownloadUri: POST ${requestParams.uri}  ${JSON.stringify(requestParams.body)}`)
            const data = await request({
                method: 'POST',
                uri: requestParams.uri,
                body: requestParams.body,
                'headers': {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.101 Safari/537.36'
                },
                json: true,
                simple: true,
                resolveWithFullResponse: false
            })
            return resolve(data.direct_link);
        } catch (e) {
            return reject(e.message || e.error || e);
        }
    });
}

const formatResult = function (array) {
    return new Promise((resolve, reject) => {
        return resolve({
            content: array[0],
            downloadURI: array[1]
        });
    });
}
const getInfo = async function (url) {
    try {
        if (typeof (url) === 'string') {
            const URLObject = isValidWetransfertUrl(url);
            if (URLObject) {
                const infos = await getContentInfo(URLObject)
                // Cannot get downloadURI if state !== downloadable
                if (infos.state !== "downloadable") {
                    return formatResult([infos, null])
                }
                const downloadURI = await getDownloadUri(URLObject)
                return formatResult([infos, downloadURI])
            } else {
                throw new Error(`Unhanle url: ${URLObject.href}`);
            }
        } else {
            throw new Error('Unhanle url - url must be a string');
        }

    } catch (err) {
        throw err
    }
}


const waitForDownloadable = async function (responseObj) {
    try {
        if(responseObj.state === "downloadable" || (typeof responseObj.content === "object" && responseObj.content.state === "downloadable")){
            return responseObj.content || responseObj
        }
        else{
            debug("node-wetransfert: wait 5s for downloadable state")
            await waitAsync(5000)
            const infos = await(getInfo(responseObj.shortened_url || (typeof responseObj.content === "object" ? responseObj.content.shortened_url : undefined)))
            return waitForDownloadable(infos)
        }
    } catch (error) {
        throw error
    }
}


exports.getInfo = getInfo
exports.waitForDownloadable = waitForDownloadable