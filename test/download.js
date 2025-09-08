const fs = require('fs')
const path = require('path')
const {upload, download, downloadPipe, Payload, waitForDownloadable} = require('../index')

// The body of the email
const body = 'Hi this is an upload from https://github.com/orgrimarr/node-wetransfert API'
// Language, used in the weetranfer download ux : ex: en, fr
const language = 'en'

// Samples
const testSamples = [path.resolve(__dirname, './ressources/flower-3876195_960_720.jpg'), path.resolve(__dirname, './ressources/landscape-3779159_960_720.jpg'), path.resolve(__dirname, './ressources/gnu.txt'), new Payload({
    filePath: path.resolve(__dirname, './ressources/gnu.txt'), name: "gnu_renamed.txt" // Overide file name
}), new Payload({   // Upload a buffer
    name: "test buffer with payload wrapper",
    buffer: Buffer.from("THIS IS A TEST BUFFER WRAPPED WITHIN wetransfert PAYLOAD")
}), {
    name: "test buffer", buffer: Buffer.from("THIS IS A TEST BUFFER")
}, {
    name: "test stream from file",
    stream: fs.createReadStream(path.resolve(__dirname, './ressources/water-lily-3784022_960_720.jpg')),
    size: fs.statSync(path.resolve(__dirname, './ressources/water-lily-3784022_960_720.jpg')).size
}]

const bigFile = path.resolve(__dirname, './ressources/big/BigBuckBunny.mp4')

const downloadFolder = path.resolve(__dirname, './tmp')

const uploadSamples = function () {
    return new Promise((resolve, reject) => {
        try {
            const files = [...testSamples, bigFile]
            upload('', '', files, body, language)
                .on('end', (end) => {
                    return resolve(end)
                })
                .on('error', (error) => {
                    return reject(error)
                })
        } catch (error) {
            return reject(error)
        }
    })
}

describe('3) Download', async function () {
    let downloadURL = '' // Must be set manually
    let totalSize = 0
    beforeEach(async function () {
        await fs.promises.rm(downloadFolder, { recursive: true, force: true })
        await fs.promises.mkdir(downloadFolder, {
            recursive: true
        })
        // Upload no logon working

        // const uploadedSamples = await uploadSamples()
        // await waitForDownloadable(uploadedSamples)
        // downloadURL = uploadedSamples.shortened_url
        totalSize = [{
            "name": "BigBuckBunny.mp4",
            "size": 31935861,
        }, {
            "name": "flower-3876195_960_720.jpg",
            "size": 147377,
        }, {
            "name": "gnu.txt",
            "size": 34667,
        }, {
            "name": "landscape-3779159_960_720.jpg",
            "size": 167249,
        }, {
            "name": "water-lily-3784022_960_720.jpg",
            "size": 113622,
        }]
            .map(file => file.size)
            .reduce((size1, size2) => size1 + size2)
    })

    it('Should download multiples files', async function () {
        await download(downloadURL, downloadFolder)
        const downloadedSize = fs.readdirSync(downloadFolder)
            .map(file => path.join(downloadFolder, file))
            .map(file => fs.statSync(file))
            .map(file => file.size)
            .reduce((size1, size2) => size1 + size2)

        if (downloadedSize !== totalSize) {
            throw  new Error(`Error downloding expected downloadedSize ${totalSize} got ${downloadedSize}`)
        }
    })
})
