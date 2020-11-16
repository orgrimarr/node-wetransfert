const { getInfo }       = require('./getInfo')
const PProgress         = require('../utils/PProgress')
const fetch             = require('node-fetch')
const debug             = require('debug')("wetransfert:download")
const mkdirp            = require('mkdirp')
const unzip             = require('unzipper')
const path              = require('path')
const fs                = require('fs')
const stream            = require('stream')
const util              = require('util')
const utils             = require('../utils/utils')

const streamPipeline    = util.promisify(stream.pipeline)

exports.download = function (url = '', destPath = null, fileIds = null) {
    return new PProgress(async (resolve, reject, progress) => {
        if (!destPath) {
            return reject(new Error('Not destination path found'))
        }
        try {
            const weTransfertObject = await getInfo(url, fileIds)
            if (!weTransfertObject) {
                return reject(new Error('Not a valid url'))
            }

            if (!fs.existsSync(destPath)) {
                await mkdirp(destPath)
            }

            const destinationStream = weTransfertObject.content.items.length >= 2 || (Array.isArray(fileIds) && fileIds.length >= 2)
                ? unzip.Extract({ path: destPath })
                : fs.createWriteStream(path.join(destPath, weTransfertObject.content.items[0].name))

            const response = await fetch(weTransfertObject.downloadURI, {
                agent: utils.getHttpAgent()
            })
            if (!response.ok) {
                throw new Error(`Unexpected response ${response.status} ${response.statusText}`)
            }
            debug('get total size', parseInt(response.headers.get('content-length')), weTransfertObject.content.size)
            const size = parseInt(response.headers.get('content-length')) || weTransfertObject.content.size

            let uploadedByte = 0
            const progressStream = new stream.PassThrough()
            progressStream.on('data', chunk => {
                uploadedByte += chunk.length
                const percent = uploadedByte / size
                progress(percent.toFixed(2))
            })

            await streamPipeline(response.body, progressStream, destinationStream)

            return resolve(weTransfertObject)
        }
        catch (e) {
            return reject(e)
        }
    })
}


/* API
    downloadPipe('http://wetransfertURI)
    .then(files.pipe(WritableStream))
    .catch(console.error)
*/
exports.downloadPipe = async function (url = '', fileIds = null, progressCallback = null) {
    if(typeof progressCallback === "function"){
        progressCallback = function(){}
    }

    debug("downloadPipe", url)
    const weTransfertObject = await getInfo(url, fileIds = null)
    debug("weTransfertObject", weTransfertObject)
    debug("weTransfertObject.downloadURI", weTransfertObject.downloadURI)
    if (!weTransfertObject) {
        throw new Error('Not a valid url')
    }

    const size = weTransfertObject.content.size
    const response = await fetch(weTransfertObject.downloadURI, {
        agent: utils.getHttpAgent()
    })
    if (!response.ok) {
        throw new Error(`Unexpected response ${response.status} ${response.statusText}`)
    }

    return response.body
}
