const cheerio                                               = require('cheerio');
const request                                               = require('request-promise');
const Promise                                               = require("bluebird");
const { isValidWetransfertUrl, formatDownloadApiUri }       = require('../utils/utils');


const _preloaded_transfer_Regex     = /\_preloaded\_transfer\_/g;
const removeVarDeclarationRegex     = /var[\s]*\_preloaded\_transfer\_[\s]*=/g;
const removeLastSemicolon           = /(}\;\n)$/g;


const extractVar = function(text){
    return new Promise((resolve, reject) => {
        try{
            const json = text.replace(removeVarDeclarationRegex, '').replace(removeLastSemicolon, '}');
            return resolve(JSON.parse(json));
        }
        catch(e){
            return reject(e.message);
        }
    });
}

const extractScriptContent = function(body){ // Return a list of var
    return new Promise((resolve, reject) => {
        const $ = cheerio.load(body);
        $('script').each(function(index, element) {
            const content = $(this).html();
            if(_preloaded_transfer_Regex.exec(content)){
                return resolve(content);
            }
        })
        return reject('No _preloaded_transfer_ var found !');
    });
}

const getContentInfo = function(urlObj){
    return new Promise((resolve, reject) => {
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

const getDownloadUri = function(urlObj){
    return new Promise(async (resolve, reject) => {
        try{
            const requestParams = await formatDownloadApiUri(urlObj);
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
        }
        catch(e){
            return reject (e.message || e.error || e);
        }
    });
}

const formatResult = function(array){
    return new Promise((resolve, reject) => {
        return resolve({
            content: array[0],
            downloadURI: array[1]
        });
    });
}

exports.getInfo = function(url){
    return new Promise((resolve, reject) => {
        if(typeof(url) === 'string'){
            const URLObject = isValidWetransfertUrl(url);
            if(URLObject){
                Promise.all([getContentInfo(URLObject), getDownloadUri(URLObject)])
                .then(formatResult)
                .then((result) => {
                    return resolve(result);
                })
                .catch((err) => {
                    return reject(err);
                })
            }
            else{
                return reject('Unhanle url');
            }
        }
        else{
            return reject('Unhanle url - url must be a string');
        }
    });
}
