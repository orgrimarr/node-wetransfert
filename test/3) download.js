const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { upload, download, downloadPipe, Payload, waitForDownloadable } = require('../index')
const rimraf = require('rimraf')

// The body of the email
const body = 'Hi this is an upload from https://github.com/orgrimarr/node-wetransfert API'
// Language, used in the weetranfer download ux : ex: en, fr
const language = 'en'

// Samples
const testSamples = [
    path.resolve(__dirname, './ressources/flower-3876195_960_720.jpg'),
    path.resolve(__dirname, './ressources/landscape-3779159_960_720.jpg'),
    path.resolve(__dirname, './ressources/gnu.txt'),
    new Payload({
        filePath: path.resolve(__dirname, './ressources/gnu.txt'),
        name: "gnu_renamed.txt" // Overide file name
    }),
    new Payload({   // Upload a buffer
        name: "test buffer with payload wrapper",
        buffer: Buffer.from("THIS IS A TEST BUFFER WRAPPED WITHIN wetransfert PAYLOAD")
    }),
    {
        name: "test buffer",
        buffer: Buffer.from("THIS IS A TEST BUFFER")
    },
    {
        name: "test stream from file",
        stream: fs.createReadStream(path.resolve(__dirname, './ressources/water-lily-3784022_960_720.jpg')),
        size: fs.statSync(path.resolve(__dirname, './ressources/water-lily-3784022_960_720.jpg')).size
    }
]

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
        }
        catch (error) {
            return reject(error)
        }
    })
}


const tests = async function () {
    const uploadedSamples = await uploadSamples()
    await waitForDownloadable(uploadedSamples)
    const downloadURL = uploadedSamples.shortened_url
    const totalSize = uploadedSamples.files
        .map(file => file.size)
        .reduce((size1, size2) => size1 + size2)

    describe('3) Download', async function () {
        beforeEach(function () {
            rimraf.sync(downloadFolder)
            fs.mkdirSync(downloadFolder, {
                recursive: true
            })
        })

        describe('download', function () {
            it('Should download multiples files', function () {
                return new Promise((resolve, reject) => {
                    try {
                        download(downloadURL, downloadFolder)
                            .onProgress(progress => {
                                // console.log('progress', progress)
                            })
                            .then((res) => {
                                const downloadedSize = fs.readdirSync(downloadFolder)
                                    .map(file => path.join(downloadFolder, file))
                                    .map(file => fs.statSync(file))
                                    .map(file => file.size)
                                    .reduce((size1, size2) => size1 + size2)

                                if (downloadedSize !== totalSize) {
                                    return reject(new Error(`Error downloding expected downloadedSize ${totalSize} got ${downloadedSize}`))
                                }
                                return resolve()
                            })
                            .catch((err) => {
                                return reject(err)
                            })
                    }
                    catch (error) {
                        return reject(error)
                    }
                })
            })
        })

        describe('downloadPipe', function () {
            it('return true', function () {
                return true
            })
        })
    })

    run()
}

tests()