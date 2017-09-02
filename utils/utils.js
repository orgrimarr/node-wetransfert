const { parse }         = require('url');

const weTransfertRegex = /https:\/\/wetransfer\.com\/downloads\/[0-9a-z]{10,}\/[0-9a-z]{10,}\/[0-9a-z]{4,}/;
exports.isValidWetransfertUrl = function(url){
    if(weTransfertRegex.exec(url) !== null){
        return parse(url);
    }
    else{
        return false
    }
}

exports.formatDownloadApiUri = function(urlObj){
    const [, , urlID, recipient_id, hash] = urlObj.pathname.split('/');
    return  {
        uri: `https://wetransfer.com/api/ui/transfers/${urlID}/${hash}/download`,
        body: {"recipient_id": recipient_id}
    }
}