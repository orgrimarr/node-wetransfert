const fs = require('fs')
const path = require('path')
const { upload, Payload, isValidWetransfertUrl, getInfo, waitForDownloadable } = require('../index')

// The body of the email
const body = 'Hi this is an upload from https://github.com/orgrimarr/node-wetransfert API'
// Language, used in the weetranfer download ux : ex: en, fr
const language = 'en'

// Samples
const testSamples = () => {
    return [
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
}

const bigFile = path.resolve(__dirname, './ressources/big/BigBuckBunny.mp4')

describe('2) Upload', function () {
    describe('simple', function () {
        it('should upload an image', function () {
            return new Promise((resolve, reject) => {
                try {
                    upload('', '', testSamples()[0], body, language)
                        // .on('progress', (progress) => console.error('PROGRESS', progress))
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
        })
        it('should upload an image and return the uploaded informations', function () {
            return new Promise((resolve, reject) => {
                try {
                    upload('', '', testSamples()[0], body, language)
                        // .on('progress', (progress) => console.error('PROGRESS', progress))
                        .on('end', (end) => {
                            if (!isValidWetransfertUrl(end.shortened_url)) {
                                return reject(new Error(`Invalid url ${end.shortened_url}`))
                            }
                            if (end.message !== body) {
                                return reject(new Error(`Invalid url body ${end.message}`))
                            }
                            if (end.password_protected !== false) {
                                return reject(new Error(`Is password protected`))
                            }
                            return resolve()
                        })
                        .on('error', (error) => {
                            return reject(error)
                        })
                }
                catch (error) {
                    return reject(error)
                }
            })
        })
        it('getinfo should return a downloadURI', function () {
            return new Promise((resolve, reject) => {
                try {
                    upload('', '', testSamples()[0], body, language)
                        // .on('progress', (progress) => console.error('PROGRESS', progress))
                        .on('end', (end) => {
                            waitForDownloadable(end)
                                .then(() => getInfo(end.shortened_url))
                                .then(res => {  
                                    if (!res.downloadURI) {
                                        return reject(new Error(`Error uploading, the transfer has no downloadURI ${res.downloadURI}`))
                                    }
                                    return resolve()
                                })
                                .catch(error => reject(error))
                        })
                        .on('error', (error) => {
                            return reject(error)
                        })
                }
                catch (error) {
                    return reject(error)
                }
            })
        })
    })

    describe('multiple', function () {
        it('should upload the files and return the uploaded informations', function () {
            return new Promise((resolve, reject) => {
                try {
                    upload('', '', testSamples(), body, language)
                        // .on('progress', (progress) => console.error('PROGRESS', progress))
                        .on('end', (end) => {
                            if (!isValidWetransfertUrl(end.shortened_url)) {
                                return reject(new Error(`Invalid url ${end.shortened_url}`))
                            }
                            if (end.message !== body) {
                                return reject(new Error(`Invalid url body ${end.message}`))
                            }
                            if (end.files.length !== testSamples().length) {
                                return reject(new Error(`Expected files number ${testSamples().length} got ${end.files.length}`))
                            }
                            return resolve()
                        })
                        .on('error', (error) => {
                            return reject(error)
                        })
                }
                catch (error) {
                    return reject(error)
                }
            })
        })
    })

    describe('big', function () {
        it('should upload a video', function () {
            return new Promise((resolve, reject) => {
                try {
                    upload('', '', bigFile, body, language)
                        // .on('progress', (progress) => console.error('PROGRESS', progress))
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
        })
        it('should upload the files and return the uploaded informations', function () {
            return new Promise((resolve, reject) => {
                try {
                    const files = [...testSamples(), bigFile]
                    upload('', '', files, body, language)
                        // .on('progress', (progress) => console.error('PROGRESS', progress))
                        .on('end', (end) => {
                            if (!end || typeof end !== "object") {
                                return reject(new Error(`Should be an object got ${typeof end}`))
                            }
                            if (!isValidWetransfertUrl(end.shortened_url)) {
                                return reject(new Error(`Invalid url ${end.shortened_url}`))
                            }
                            if (end.message !== body) {
                                return reject(new Error(`Invalid url body ${end.message}`))
                            }
                            if (end.files.length !== files.length) {
                                return reject(new Error(`Expected files number ${files.length} got ${end.files.length}`))
                            }
                            return resolve()
                        })
                        .on('error', (error) => {
                            return reject(error)
                        })
                }
                catch (error) {
                    return reject(error)
                }
            })
        })
    })

    describe('email', function () {

    })

    run()
})