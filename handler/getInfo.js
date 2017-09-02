const cheerio                       = require('cheerio');
const request                       = require('request-promise');
const { isValidWetransfertUrl }     = require('../utils/utils');


const _preloaded_transfer_Regex     = /\_preloaded\_transfer\_/g;
const removeVarDeclarationRegex     = /var[\s]*\_preloaded\_transfer\_[\s]*=/g;
const removeLastSemicolon           = /(}\;\n)$/g;

const parseFindFromHtml = function(body){ // Return a list of var
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

const extractVar = function(text){
    return new Promise((resolve, reject) => {
        const json = text.replace(removeVarDeclarationRegex, '').replace(removeLastSemicolon, '}');
        try{
            return resolve(JSON.parse(json));
        }
        catch(e){
            return reject(e.message + '  ' + json);
        }
    });
}


exports.getListOfFile = function(url){
    return new Promise((resolve, reject) => {
        if((typeof(url) === 'string' && isValidWetransfertUrl(url)) || (typeof(url) === 'object' && url.href)){
            request({
                uri: url.href,
                json: false,
                simple: true,
                resolveWithFullResponse: false
            })
            .then(parseFindFromHtml)
            .then(extractVar)
            .then((list) => {
                return resolve(list);
            })
            .catch((err) => {
                return reject(err);
            })
        }
        else{
            return reject('Unhanle url');
        }
    });
}
