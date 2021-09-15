const debug = require('debug')("wetransfert:upload")
const EventEmitter = require('events')
const Payload = require('./Payload')
const utils = require('../utils/utils')
const { default: fetch } = require('node-fetch')
const AbortController = require("abort-controller")
const FormData = require('form-data')
const { Stream } = require('stream')

class Upload extends EventEmitter {
    constructor(mailFrom = '', mailRecipients = '', payloads = [], message = '', ui_language = 'en', user = null, password = "") {
        super()
        this.apiVersion = "v4"
        this.maxUploadSize = 2147483648

        this.id = ''
        this.mailFrom = mailFrom
        this.mailRecipients = mailRecipients
        if (!Array.isArray(payloads)) {
            payloads = [payloads]
        }

        this.totalProgress = {
            "percent": 0,
            "speed": 'NA for the moment',
            "size": {
                "total": 0,
                "transferred": 0
            },
            "time": {
                "elapsed": 0,
                "remaining": 'NA for the moment'
            }
        }

        this.payloads = payloads
        this.message = message
        this.ui_language = ui_language
        this.fileToUpload = {}
        this.requestCue = {}
        this.controller = new AbortController()
        this.isCanceled = false
        this.fatalError = false
        this.csrfToken = ""
        this.sessionCookie = ""
        this.user = user
        this.password = password

        this.loginInfos = null

        this.on('cancel', (e) => {
            if (!this.isCanceled) {
                this.cancelJob()
            }
        })
        this.on('error', (e) => {
            this.fatalError = true
            if (e) debug(`/!\\ fatalError: ${e.message}`)
            debug(`/!\\ fatalError: ${e}`)

            if (!this.isCanceled) {
                this.cancelJob(e)
            }
        })
        this.on('end', () => {
            debug("upload progress: 1")
            this.emit('progress', 1)
        })

        setImmediate(() => {
            this.lunchupload()
                .catch(error => {
                    debug(error)
                    if (!this.isCanceled) {
                        this.emit('error', error)
                    }
                })
        })
    }

    //Start upload
    async lunchupload() {
        // verification
        if (this.mailFrom !== '' || this.mailRecipients !== '') {
            if (!this.mailFrom || typeof this.mailFrom !== 'string' || !this.validateEmail(this.mailFrom)) {
                return this.emit('error', new Error('No mail from found or mail from is not a string or is not a valide email'))
            }
            if (!this.mailRecipients || !Array.isArray(this.mailRecipients) || this.mailRecipients.length < 1) {
                return this.emit('error', new Error('No mail recipients found or is not an array'))
            }
            for (let i in this.mailRecipients) {
                const currentMail = this.mailRecipients[i]
                if (typeof currentMail !== 'string' || !this.validateEmail(currentMail)) {
                    return this.emit('error', new Error('No mail recipient found or mail recipient is not a valide email'))
                }
            }
        }

        debug(`from: ${this.mailFrom}`)
        debug(`from: ${Array.isArray(this.mailRecipients) ? this.mailRecipients.join(', ') : this.mailRecipients}`)

        const knowFileName = new Set()
        for (let payload of this.payloads) {
            // Case Payload is already a Payload instance
            if (payload instanceof Payload) {
                if (knowFileName.has(payload.name)) {
                    return this.emit('error', new Error(`Error duplicate file name ${payload.name}`))
                }
                knowFileName.add(payload.name)
                this.fileToUpload[payload.name] = payload
                debug(`addPaload: type:PayloadObject name:${payload.name}`)
                continue
            }

            // Case Payload is path
            if (typeof payload === "string") {
                const curPayload = new Payload({
                    filePath: payload
                })
                if (knowFileName.has(curPayload.name)) {
                    return this.emit('error', new Error(`Error duplicate file name ${curPayload.name}`))
                }
                knowFileName.add(curPayload.name)
                this.fileToUpload[curPayload.name] = curPayload
                debug(`addPaload: type:path name:${curPayload.name}`)
                continue
            }

            // Case object definition
            if (typeof payload === "object") {
                const curPayload = new Payload(payload)
                if (knowFileName.has(curPayload.name)) {
                    return this.emit('error', `Error duplicate file name ${curPayload.name}`)
                }
                knowFileName.add(curPayload.name)
                this.fileToUpload[curPayload.name] = curPayload
                debug(`addPaload: type:ObjectDefinition name:${curPayload.name}`)
                continue
            }

        }
        if (knowFileName.length < 1) {
            return this.emit('error', new Error('you must provide at least one file'))
        }

        debug(`${knowFileName.size} file to upload`)

        this.totalSizeToUpload = 0
        this.totalSizeUploaded = 0
        this.startTime = Date.now()

        for (let i in this.fileToUpload) {
            this.totalSizeToUpload += typeof this.fileToUpload[i].size !== "number" ? parseInt(this.fileToUpload[i].size, 10) : this.fileToUpload[i].size
        }
        if (this.totalSizeToUpload > this.maxUploadSize) {
            return this.emit('error', new Error(`Total fileSize cant exeed 2Gibibyte, your total size is ${this.totalSizeToUpload} Byte only accept ${this.maxUploadSize} Byte`))
        }

        this.totalProgress.size.total = this.totalSizeToUpload

        // start workflow
        if (this.user && this.password) {
            const loginInfos = await utils.login(this.user, this.password)
            this.loginInfos = loginInfos.data
            this.csrfToken = loginInfos.csrf
            this.sessionCookie = loginInfos.sessionCookie
            debug('login setCookie', this.sessionCookie)
            debug('login csrfToken', this.csrfToken)
            debug('login loginInfos', JSON.stringify(this.loginInfos, null, 2))
        }
        else {
            await this.getUploadCsrfToken()
        }
        debug('csrfToken', this.csrfToken)

        const res = await this.emailRequest()
        this.id = res.id
        for (let i in this.fileToUpload) {
            const currentFile = this.fileToUpload[i]
            const fileAttr = res.files.find(elem => elem.name === currentFile.name)
            this.fileToUpload[i].chunk_size = fileAttr.chunk_size
            this.fileToUpload[i].id = fileAttr.id
            await this.uploadFileWF({
                id: fileAttr.id,
                name: currentFile.name,
                chunk_size: fileAttr.chunk_size,
                stream: currentFile.stream,
                size: currentFile.size
            }
            )
        }
        const finalRes = await this.finalize()
        return this.emit('end', finalRes)
    }

    //Utils
    validateEmail(email) {
        const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(email)
    }
    formatRequestOption(method, url, body = {}) {
        debug(`formatRequestOption ${method} ${url} ${JSON.stringify(body)}`)
        return {
            method: method,
            body: JSON.stringify(body),
            signal: this.controller.signal,
            headers: {
                'cookie': this.sessionCookie,
                'Content-Type': 'application/json',
                'authority': 'wetransfer.com',
                'accept': 'application/json, text/plain, */*',
                'accept-language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
                'referer': 'https://wetransfer.com/',
                'sec-fetch-mode': 'cors',
                'sec-fetch-dest': 'empty',
                'x-requested-with': 'XMLHttpRequest',
                'x-csrf-token': this.csrfToken,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.101 Safari/537.36'
            },
            agent: utils.getHttpAgent()
        }
    }
    async apiRequest(method, url, body) {
        try {
            debug(`formatRequestOption ${method} ${url}`)

            const requestConfig = this.formatRequestOption(method, url, body)
            const response = await fetch(url, requestConfig)
            debug('apiRequest', method, url, response.status, response.statusText)
            if (!response.ok) {
                const textBody = await response.text()
                throw new Error(`Error ${method} ${url} server respond with status ${response.status} ${response.statusText}. ${textBody}`)
            }
            const jsonBody = await response.json()
            return jsonBody
        }
        catch (error) {
            debug(error)
            if (error.name !== 'AbortError') {
                throw error
            }
        }
    }
    async getUploadCsrfToken() {
        debug(`getUploadCsrfToken: GET https://wetransfer.com/`)
        const infos = await utils.getWetransferPageContent()
        this.csrfToken = infos.csrf
        this.sessionCookie = infos.sessionCookie
    }

    // WF
    async emailRequest() {
        if (this.isCanceled) {
            throw new Error('Job Already canceled in _emailRequest')
        }

        const files = []
        for (let i in this.fileToUpload) {
            files.push({
                name: this.fileToUpload[i].name,
                size: this.fileToUpload[i].size
            })
        }

        let url = `https://wetransfer.com/api/${this.apiVersion}/transfers/link`
        const body = {
            message: typeof this.message === 'string' ? this.message : '',
            ui_language: typeof this.ui_language === 'string' ? this.ui_language : 'en',
            files: files
        }
        if (this.mailFrom !== '' || this.mailRecipients !== '') {
            body.recipients = this.mailRecipients
            body.from = this.mailFrom
            url = `https://wetransfer.com/api/${this.apiVersion}/transfers/email`
        }
        if (this.loginInfos && Array.isArray(this.loginInfos.memberships) && this.loginInfos.memberships.length > 0) {
            const membership = this.loginInfos.memberships[0]
            if (membership && typeof membership === "object" && typeof membership.account === "object" && membership.account.id) {
                body.account_id = membership.account.id
            }
        }
        debug(body)

        debug("emailRequest")
        const result = await this.apiRequest('POST', url, body)
        if (result.message === "email_verification_required") {
            throw new Error(`Error. You must be loged in. Wetransfer now use captcha in free mode. Please provide a user/password to the upload function`)
        }
        if (!result.id || !Array.isArray(result.files)) {
            throw new Error(`Error. Invalid email response from wetransfer. ${JSON.stringify(result)}`)
        }

        return result
    }
    async finalize() {
        if (this.isCanceled) {
            throw new Error('Job Already canceled in _finalize')
        }

        debug(`finalize`)
        const result = await this.apiRequest('PUT', `https://wetransfer.com/api/${this.apiVersion}/transfers/${this.id}/finalize`)
        return result
    }
    async cancelJob(error) {
        try {
            debug("cancelJob")
            this.isCanceled = true
            this.controller.abort()

            await utils.waitAsync(1000)

            await this.apiRequest('DELETE', `https://wetransfer.com/api/${this.apiVersion}/transfers/${this.id}`)
            if (!this.fatalError) {
                return this.emit('error', new Error('This upload was canceled by user'))
            }
            this.cancelJob = function () { }
            return this.emit('error', error)
        }
        catch (error) {
            if (!this.fatalError) {
                return this.emit('error', new Error('This upload was canceled by user'))
            }
            this.cancelJob = function () { }
            return this.emit('error', error)
        }
    }

    // PerFile functions
    uploadFileWF(currentPayload) {
        if (this.isCanceled) {
            return Promise.reject(new Error('Job Already canceled in _uploadFileWF'))
        }
        return new Promise(async (resolve, reject) => {
            debug("start uploadFileWF")
            const fileObj = {
                stream: currentPayload.stream,
                name: currentPayload.name,
                id: currentPayload.id,
                chunk_size: currentPayload.chunk_size,
                size: currentPayload.size
            }
            let uploadFileStream = null
            try {
                await this.fileRequest(fileObj.name, fileObj.size)
                //Creation du stream du fichier et des "buffer"
                const receivedBuffers = []
                let receivedBuffersLength = 0
                let currentChunkOffset = 0 // On commence à 1

                const getChunk = async function () {
                    const combinedBuffer = Buffer.concat(receivedBuffers, receivedBuffersLength)
                    receivedBuffers.length = 0 // reset the array while keeping the original reference
                    receivedBuffersLength = 0
                    const remainder = Buffer.alloc(combinedBuffer.length - fileObj.chunk_size)
                    combinedBuffer.copy(remainder, 0, fileObj.chunk_size)
                    receivedBuffers.push(remainder)
                    receivedBuffersLength = remainder.length

                    // Return the perfectly sized part.
                    const uploadBuffer = Buffer.alloc(fileObj.chunk_size)
                    combinedBuffer.copy(uploadBuffer, 0, 0, fileObj.chunk_size)
                    return uploadBuffer
                }

                //const neededChunk = fileObj.size > fileObj.chunk_size ? Math.floor(fileObj.size / fileObj.chunk_size) + 1 : 1
                uploadFileStream = fileObj.stream
                    .on('data', async (chunk) => {
                        try {
                            receivedBuffers.push(chunk)
                            receivedBuffersLength += chunk.length
                            var FormData = require('form-data');           // Chunk size test
                            if (receivedBuffersLength >= fileObj.chunk_size) {
                                currentChunkOffset++
                                uploadFileStream.pause()
                                const currentChunk = await getChunk()
                                const currentChunkLength = currentChunk.length
                                const template = await this.chunkRequest(fileObj.id, currentChunkOffset, currentChunkLength, 0)
                                await this.s3upload(template, fileObj.name, currentChunk, currentChunkOffset)
                                this.totalSizeUploaded += currentChunkLength
                                const progress = (this.totalSizeUploaded / this.totalSizeToUpload).toFixed(2)
                                if (this.totalProgress.percent < progress) {
                                    this.totalProgress.percent = progress
                                    this.totalProgress.size.transferred = this.totalSizeUploaded
                                    const now = Date.now()
                                    this.totalProgress.time.elapsed += (now - this.startTime)

                                    debug("upload progress: " + this.totalProgress)
                                    this.emit('progress', this.totalProgress)
                                }
                                uploadFileStream.resume()
                            }
                            return 'ok'
                        } catch (e) {
                            debug(`uploadFileWf data error: ${e.stack}`)
                            reject(e)
                            if (uploadFileStream instanceof Stream) {
                                uploadFileStream.destroy()
                            }
                        }
                    })
                    .on('end', async () => {
                        try {
                            //Last chunk
                            currentChunkOffset++
                            const currentChunk = Buffer.concat(receivedBuffers, receivedBuffersLength)
                            const currentChunkLength = currentChunk.length
                            const template = await this.chunkRequest(fileObj.id, currentChunkOffset, currentChunkLength, 0)
                            await this.s3upload(template, fileObj.name, currentChunk, currentChunkOffset)
                            this.totalSizeUploaded += currentChunkLength
                            const progress = (this.totalSizeUploaded / this.totalSizeToUpload).toFixed(2)
                            if (this.totalProgress.percent < progress) {
                                this.totalProgress.percent = progress
                                this.totalProgress.size.transferred = this.totalSizeUploaded
                                const now = Date.now()
                                this.totalProgress.time.elapsed += (now - this.startTime)

                                debug("upload progress: " + this.totalProgress)
                                this.emit('progress', this.totalProgress)
                            }
                            const final = await this.finalizeFile(fileObj.id, currentChunkOffset)
                            return resolve(final)
                        }
                        catch (e) {
                            if (e) debug(`uploadFileWf end error: ${e.message}`)
                            return reject(e)
                        }
                    })
                    .on('error', (err) => {
                        if (err) debug(`uploadFileWf on error: ${err.message}`)
                        return reject(err.error || err)
                    })

            }
            catch (e) {
                if (uploadFileStream !== null) {
                    uploadFileStream.destroy()
                }
                debug(`uploadFileWf final error: ${e.message}`)
                return reject(e)
            }
        })
    }
    async fileRequest(filename, chunk_size) {
        if (this.isCanceled) {
            throw new Error('Job Already canceled in _fileRequest')
        }

        debug(`fileRequest name:${filename} size:${chunk_size}`)
        const result = await this.apiRequest('POST',
            `https://wetransfer.com/api/${this.apiVersion}/transfers/${this.id}/files`, {
            "name": filename,
            "size": chunk_size
        })

        return result
    }
    async chunkRequest(fileID, chunk_number, chunk_size, retries) {
        if (this.isCanceled) {
            throw new Error('Job Already canceled in _chunkRequest')
        }
        debug(`chunkRequest id:${fileID} chunk:${chunk_number} size:${chunk_size} retries:${retries}`)

        const result = await this.apiRequest('PUT',
            `https://wetransfer.com/api/${this.apiVersion}/transfers/${this.id}/files/${fileID}`, {
            "chunk_number": chunk_number || 1,
            "chunk_size": chunk_size,
            "retries": retries || 0
        })
        return result
    }
    async s3upload(template, fileName, uploadBuffer, chunk_number) {
        if (this.isCanceled) {
            throw new Error('Job Already canceled in _s3upload')
        }
        /* template
            {
                id: '22ad95551fc3e1b13a7d03d0d9ece3a920201114162441',
                template: {
                    formdata: {
                        method: 'POST',
                        enctype: 'application/x-www-form-urlencoded',
                        action: 'https://wetransfer-eu-prod-incoming.s3.eu-west-1.amazonaws.com'
                    },
                    form: {
                        key: 'f2d2476dacc18cb1691e573bf89926d520201114162441/b9c2c6b89342d23cb2153f840375a36203de4cbf/part.000001',
                        success_action_status: '201',
                        'x-amz-server-side-encryption': 'AES256',
                        policy: 'eyJleHBpcmF0aW9uIjoiMjAyMC0xMS0xNFQxNzoyNDo0MloiLCJjb25kaXRpb25zIjpbeyJidWNrZXQiOiJ3ZXRyYW5zZmVyLWV1LXByb2QtaW5jb21pbmcifSx7ImtleSI6ImYyZDI0NzZkYWNjMThjYjE2OTFlNTczYmY4OTkyNmQ1MjAyMDExMTQxNjI0NDEvYjljMmM2Yjg5MzQyZDIzY2IyMTUzZjg0MDM3NWEzNjIwM2RlNGNiZi9wYXJ0LjAwMDAwMSJ9LHsic3VjY2Vzc19hY3Rpb25fc3RhdHVzIjoiMjAxIn0seyJ4LWFtei1zZXJ2ZXItc2lkZS1lbmNyeXB0aW9uIjoiQUVTMjU2In0seyJ4LWFtei1jcmVkZW50aWFsIjoiQUtJQUkzNk5FTklaNDVOVVA2R1EvMjAyMDExMTQvZXUtd2VzdC0xL3MzL2F3czRfcmVxdWVzdCJ9LHsieC1hbXotYWxnb3JpdGhtIjoiQVdTNC1ITUFDLVNIQTI1NiJ9LHsieC1hbXotZGF0ZSI6IjIwMjAxMTE0VDE2MjQ0MloifV19',
                        'x-amz-credential': 'AKIAI36NENIZ45NUP6GQ/20201114/eu-west-1/s3/aws4_request',
                        'x-amz-algorithm': 'AWS4-HMAC-SHA256',
                        'x-amz-date': '20201114T162442Z',
                        'x-amz-signature': '42ade8c192f87d09e5d1734f524484ecc69c38eb85e7709adcba78870816b3bc'
                    },
                    meta: { filefield: 'file' }
                }
            } 
        */

        const endpoint = template.template.formdata.action
        debug(`s3upload: name: ${fileName} chunk:${chunk_number}. ${endpoint}`)

        const form = new FormData()

        for (let name in template.template.form) {
            form.append(name, template.template.form[name])
        }
        const formDataFileField = (typeof template.template.meta === "object" && typeof template.template.meta.filefield === "string")
            ? template.template.meta.filefield
            : 'file'
        form.append(formDataFileField, uploadBuffer, fileName)

        const options = {
            method: template.template.formdata.method,
            body: form,
            headers: Object.assign(
                {
                    'Orign': 'https://wetransfer.com',
                    'Refer': 'https://wetransfer.com/',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.101 Safari/537.36',
                    'Accept': 'application/json'
                },
                form.getHeaders()
            ),
            agent: utils.getHttpAgent()
        }

        const response = await fetch(endpoint, options)
        if (!response.ok) {
            const textBody = await response.text()
            throw new Error(`Error uploading to S3 ${options.method} ${endpoint} server respond with status ${response.status} ${response.statusText}. ${textBody}`)
        }
    }
    async finalizeFile(fileId, chunk_number) {
        if (this.isCanceled) {
            throw new Error('Job Already canceled in _finalizeFile')
        }

        debug(`finalizeFile: id:${fileId} chunk:${chunk_number}`)
        const result = await this.apiRequest('PUT',
            `https://wetransfer.com/api/${this.apiVersion}/transfers/${this.id}/files/${fileId}/finalize`, {
            "chunk_count": chunk_number
        })
        return result
    }

    cancel() { return this.emit('cancel') }
}

exports.upload = function (mailFrom, mailRecipients, payloads, message, ui_language, user, password) {
    if (!(this instanceof Upload)) return new Upload(mailFrom, mailRecipients, payloads, message, ui_language, user, password)
}
