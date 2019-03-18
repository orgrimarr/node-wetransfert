const path              = require('path')
const EventEmitter      = require('events')
const requestPromise    = require('request-promise')
const Payload           = require('./Payload')
const debug             = require('debug')("wetransfert:upload")

class Upload extends EventEmitter {
    constructor(mailFrom= '', mailRecipients = '', payloads = [], message = '', ui_language = 'en') {
        super();
        this.apiVersion = "v4"
        this.id = '';
        this.mailFrom = mailFrom;
        this.mailRecipients = mailRecipients;
        if(!Array.isArray(payloads)){
            payloads = [payloads]
        }
        this.payloads = payloads;
        this.message = message;
        this.ui_language = ui_language;
        this.fileToUpload = {};
        this.requestCue = {};
        this.isCanceled = false;
        this.fatalError = false;
        this.on('cancel', (e) =>{
            if(!this.isCanceled){
                this.cancelJob();
            }
        });
        this.on('error', (e) =>{
            this.fatalError = true;
            if(e) debug(`/!\\ fatalError: ${e.message}`)
            debug(`/!\\ fatalError: ${e}`)

            if(!this.isCanceled){
                this.cancelJob(e);
            }
        });
        this.on('end',  () =>{
            debug("upload progress: 1")
            this.emit('progress', 1);
        });



        this.lunchupload();
    }

    //Start upload
    async lunchupload() {
        try {
            // verification
            if (this.mailFrom !== '' || this.mailRecipients !== '') {
                if (!this.mailFrom || typeof this.mailFrom !== 'string' || !this.validateEmail(this.mailFrom)) {
                    return this.emit('error', 'No mail from found or mail from is not a string or is not a valide email');
                }
                if (!this.mailRecipients || !Array.isArray(this.mailRecipients) || this.mailRecipients.length < 1) {
                    return this.emit('error', 'No mail recipients found or is not an array');
                }
                for (let i in this.mailRecipients) {
                    const currentMail = this.mailRecipients[i];
                    if (typeof currentMail !== 'string' || !this.validateEmail(currentMail)) {
                        return this.emit('error', 'No mail recipient found or mail recipient is not a valide email');
                    }
                }
            }

            debug(`from: ${this.mailFrom}`)
            debug(`from: ${Array.isArray(this.mailRecipients) ? this.mailRecipients.join(', ') : this.mailRecipients}`)

            const knowFileName = new Set();
            for (let payload of this.payloads) {
                // Case Payload is already a Payload instance
                if(payload instanceof Payload){
                    if(!knowFileName.has(payload.name)){
                        knowFileName.add(payload.name);
                    }
                    else{
                        return this.emit('error', `Error duplicate file name ${payload.name}`);
                    }
                    this.fileToUpload[payload.name] = payload
                    debug(`addPaload: type:PayloadObject name:${payload.name}`)
                    continue
                }

                // Case Payload is path
                if(typeof payload === "string"){
                    const curPayload = new Payload({
                        filePath: payload
                    })
                    if(!knowFileName.has(curPayload.name)){
                        knowFileName.add(curPayload.name);
                    }
                    else{
                        return this.emit('error', `Error duplicate file name ${curPayload.name}`);
                    }
                    this.fileToUpload[curPayload.name] = curPayload
                    debug(`addPaload: type:path name:${curPayload.name}`)
                    continue
                }

                // Case object definition
                if(typeof payload === "object"){
                    const curPayload = new Payload(payload)
                    if(!knowFileName.has(curPayload.name)){
                        knowFileName.add(curPayload.name);
                    }
                    else{
                        return this.emit('error', `Error duplicate file name ${curPayload.name}`);
                    }
                    this.fileToUpload[curPayload.name] = curPayload
                    debug(`addPaload: type:ObjectDefinition name:${curPayload.name}`)
                    continue
                }

            }
            if(knowFileName.length < 1){
                return this.emit('error', 'you must provide at least one file');
            }

            debug(`${knowFileName.size} file to upload`)

            this.totalSizeToUpload = 0;
            this.totalSizeUploaded = 0;
            this.startTime = Date.now();

            for(let i in this.fileToUpload){
                this.totalSizeToUpload += typeof this.fileToUpload[i].size !== "number" ? parseInt(this.fileToUpload[i].size, 10) : this.fileToUpload[i].size
            }
            if(this.totalSizeToUpload > 2147483648){
                return this.emit('error', `Total fileSize cant exeed 2Gibibyte, your total size is ${this.totalSizeToUpload} Byte only accept 2147483648 Byte`);
            }
            this.totalProgress = {
                "percent": 0,
                "speed": 'NA for the moment',
                "size": {
                    "total": this.totalSizeToUpload,
                    "transferred": 0
                },
                "time": {
                    "elapsed": 0,
                    "remaining": 'NA for the moment'
                }
            };

            // start workflow
            const res = await this.emailRequest();
            this.id = res.id;
            for(let i in this.fileToUpload){
                const currentFile = this.fileToUpload[i];
                const fileAttr = res.files.find((elem) =>{
                    return elem.name === currentFile.name;
                })
                this.fileToUpload[i].chunk_size = fileAttr.chunk_size;
                this.fileToUpload[i].id = fileAttr.id;
                await this.uploadFileWF({
                        id: fileAttr.id,
                        name: currentFile.name,
                        chunk_size: fileAttr.chunk_size,
                        stream: currentFile.stream,
                        size: currentFile.size
                    }
                )
            }
            const finalRes = await this.finalize();
            return this.emit('end', finalRes);
        } catch (e) {
            if(!this.isCanceled){
                this.emit('error', e);
            }
        }
    }

    //Utils
    validateEmail(email) {
        var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(email);
    }
    formatRequestOption(method, url, body) {
        debug(`formatRequestOption ${method} ${url} ${JSON.stringify(body)}`)
        return {
            method: method,
            uri: url,
            body: body,
            headers: {
                'Orign': 'https://wetransfer.com',
                'Refer': 'https://wetransfer.com/',
                'Accept-Language': 'fr-FR,fr;q=0.8,en-US;q=0.6,en;q=0.4',
                'Accept-Encoding': 'Accept-Encoding',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.101 Safari/537.36'
            },
            json: true,
            simple: true,
            resolveWithFullResponse: false
        }
    }

    // WF
    emailRequest() {
        if(this.isCanceled){
            return Promise.reject('Job Already canceled in _emailRequest');
        }

        const files = []
        for(let i in this.fileToUpload){
            files.push({
                name: this.fileToUpload[i].name,
                size: this.fileToUpload[i].size
            })
        }
        

        let url = `https://wetransfer.com/api/${this.apiVersion}/transfers/link`
        let body = {
                message:        typeof this.message === 'string' ? this.message : '',
                ui_language:    typeof this.ui_language === 'string' ? this.ui_language : 'en',
                files:          files
            }
        if (this.mailFrom !== '' || this.mailRecipients !== '') {
            body.recipients = this.mailRecipients;
            body.from = this.mailFrom;
            url = `https://wetransfer.com/api/${this.apiVersion}/transfers/email`
        }
        // Link upload
        

        return new Promise((resolve, reject) => {
            debug("emailRequest")
            this.requestCue.emailRequest = requestPromise(this.formatRequestOption('POST', url, body))
            .then((res) =>{
                return resolve(res);
            }, (err) => {
                if(err) debug(`emailRequest error: ${err.message}`)
                return reject(err);
            })
        });
    }
    finalize() {
        if(this.isCanceled){
            return Promise.reject('Job Already canceled in _finalize');
        }
        return new Promise((resolve, reject) => {
            debug(`finalize`)
            this.requestCue.finalize = requestPromise(this.formatRequestOption(
                'PUT',
                `https://wetransfer.com/api/${this.apiVersion}/transfers/${this.id}/finalize`
            ))
            .then((res) =>{
                return resolve(res);
            }, (err) => {
                if(err) debug(`finalize error: ${err.message}`)
                return reject(err);
            })
        });
    }
    cancelJob(error){
        debug("cancelJob")
        this.isCanceled = true
        for(let i in this.requestCue){
            try{
                this.requestCue[i].cancel();
            }
            catch(e){

            }
        }
        requestPromise(this.formatRequestOption(
            'DELETE',
            `https://wetransfer.com/api/${this.apiVersion}/transfers/${this.id}`
        ))
        .then(() => {
            if(!this.fatalError){
                return this.emit('error', 'this upload was canceled by user');
            }
            this.cancelJob = function(){return};
            return this.emit('error', error);
        }, () =>{
            if(!this.fatalError){
                return this.emit('error', 'this upload was canceled by user');
            }
            this.cancelJob = function(){return};
            return this.emit('error', error);
        })
    }

    // PerFile functions
    uploadFileWF(currentPayload) {
        if(this.isCanceled){
            return Promise.reject('Job Already canceled in _uploadFileWF');
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
            let uploadFileStream = null;
            try {
                await this.fileRequest(fileObj.name, fileObj.size);
                //Creation du stream du fichier et des "buffer"
                const receivedBuffers = [];
                let receivedBuffersLength = 0;
                let currentChunkOffset = 0; // On commence à 1
                let totalUploaded = 0;

                const getChunk = async function () {
                    try {
                        const combinedBuffer = Buffer.concat(receivedBuffers, receivedBuffersLength);
                        receivedBuffers.length = 0; // reset the array while keeping the original reference
                        receivedBuffersLength = 0;
                        const remainder = new Buffer(combinedBuffer.length - fileObj.chunk_size);
                        combinedBuffer.copy(remainder, 0, fileObj.chunk_size);
                        receivedBuffers.push(remainder);
                        receivedBuffersLength = remainder.length;

                        // Return the perfectly sized part.
                        const uploadBuffer = new Buffer(fileObj.chunk_size);
                        combinedBuffer.copy(uploadBuffer, 0, 0, fileObj.chunk_size);
                        return uploadBuffer;
                    } catch (e) {
                        throw e.error || e;
                    }
                }

                //const neededChunk = fileObj.size > fileObj.chunk_size ? Math.floor(fileObj.size / fileObj.chunk_size) + 1 : 1;
                fileObj.stream
                    .on('data', async (chunk) => {
                        try {
                            receivedBuffers.push(chunk);
                            receivedBuffersLength += chunk.length;
                            // Chunk size test
                            if (receivedBuffersLength >= fileObj.chunk_size) {
                                currentChunkOffset++;
                                uploadFileStream.pause();
                                const currentChunk = await getChunk();
                                const currentChunkLength = currentChunk.length;
                                const template = await this.chunkRequest(fileObj.id, currentChunkOffset, currentChunkLength, 0);
                                await this.s3upload(template, fileObj.fileName, currentChunk, currentChunkOffset);
                                totalUploaded += currentChunkLength;
                                this.totalSizeUploaded += currentChunkLength;
                                const progress = (this.totalSizeUploaded / this.totalSizeToUpload).toFixed(2);
                                if(this.totalProgress.percent < progress){
                                    this.totalProgress.percent = progress;
                                    this.totalProgress.size.transferred = this.totalSizeUploaded;
                                    const now = Date.now();
                                    this.totalProgress.time.elapsed += (now - this.startTime);

                                    debug("upload progress: " + this.totalProgress)
                                    this.emit('progress', this.totalProgress);
                                }
                                uploadFileStream.resume();
                            }
                            return 'ok';
                        } catch (e) {
                            uploadFileStream.destroy();

                            if(e) debug(`uploadFileWf data error: ${e.message}`);
                            return reject(e.message);
                        }
                    })
                    .on('end', async () => {
                        try{
                            //Last chunk
                            currentChunkOffset++;
                            const currentChunk = Buffer.concat(receivedBuffers, receivedBuffersLength);
                            const currentChunkLength = currentChunk.length;
                            const template = await this.chunkRequest(fileObj.id, currentChunkOffset, currentChunkLength, 0);
                            await this.s3upload(template, fileObj.fileName, currentChunk, currentChunkOffset);
                            totalUploaded += currentChunkLength;
                            this.totalSizeUploaded += currentChunkLength;
                            const progress = (this.totalSizeUploaded / this.totalSizeToUpload).toFixed(2);
                            if(this.totalProgress.percent < progress){
                                this.totalProgress.percent = progress;
                                this.totalProgress.size.transferred = this.totalSizeUploaded;
                                const now = Date.now();
                                this.totalProgress.time.elapsed += (now - this.startTime);

                                debug("upload progress: " + this.totalProgress)
                                this.emit('progress', this.totalProgress);
                            }
                            const final = await this.finalizeFile(fileObj.id, currentChunkOffset);
                            return resolve(final);
                        }
                        catch(e){
                            if(e) debug(`uploadFileWf end error: ${e.message}`)
                            return reject(e);
                        }
                    })
                    .on('error', (err) => {
                        if(err) debug(`uploadFileWf on error: ${err.message}`)
                        return reject( err.error || err);
                    });

            } catch (e) {
                if(uploadFileStream !== null){
                    uploadFileStream.destroy();
                }
                if(e) debug(`uploadFileWf final error: ${e.message}`)
                return reject(e.message);
            }
        });
    }
    fileRequest(filename, chunk_size) {
        if(this.isCanceled){
            return Promise.reject('Job Already canceled in _fileRequest');
        }

        return new Promise((resolve, reject) => {
            debug(`fileRequest name:${filename} size:${chunk_size}`)
            this.requestCue.fileRequest = requestPromise(this.formatRequestOption(
                'POST',
                `https://wetransfer.com/api/${this.apiVersion}/transfers/${this.id}/files`, {
                    "name": filename,
                    "size": chunk_size
                }
            ))
            .then((res) =>{
                return resolve(res);
            }, (err) => {
                if(err) debug(`fileRequest error: ${err.message}`)
                return reject(err);
            })
        });
    }
    chunkRequest(fileID, chunk_number, chunk_size, retries) {
        if(this.isCanceled){
            return Promise.reject('Job Already canceled in _chunkRequest');
        }
        return new Promise((resolve, reject) => {
            debug(`chunkRequest id:${fileID} chunk:${chunk_number} size:${chunk_size} retries:${retries}`)
            this.requestCue.chunkRequest = requestPromise(this.formatRequestOption(
                'PUT',
                `https://wetransfer.com/api/${this.apiVersion}/transfers/${this.id}/files/${fileID}`, {
                    "chunk_number": chunk_number || 1,
                    "chunk_size": chunk_size,
                    "retries": retries || 0
                }
            ))
            .then((res) =>{
                return resolve(res);
            }, (err) => {
                if(err) debug(`chunkRequest error: ${err.message}`)
                return reject(err);
            })
        });
    }
    s3upload(template, fileName, uploadBuffer, chunk_number) {
        if(this.isCanceled){
            return Promise.reject('Job Already canceled in _s3upload');
        }
        try {
            const options = {
                method: template.template.formdata.method,
                uri: template.template.formdata.action,
                formData: template.template.form,
                headers: {
                    'Orign': 'https://wetransfer.com',
                    'Refer': 'https://wetransfer.com/',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.101 Safari/537.36',
                    'Accept': 'application/json'
                },
                simple: true,
                resolveWithFullResponse: false
            };
            options.formData['file'] = {
                value: uploadBuffer,
                options: {
                    filename: fileName
                }
            };

            debug(`s3upload: name: ${fileName} chunk:${chunk_number}`)

            return new Promise((resolve, reject) => {
                this.requestCue.s3upload = requestPromise(options)
                .then((res) =>{
                    return resolve(res);
                }, (err) => {
                    if(err) debug(`s3Upload error: ${err.message}`)
                    return reject(err);
                })
            });
        } catch (e) {
            if(e) debug(`s3Upload error: ${e.message}`)
            return Promise.reject(e.message);
        }
    }
    finalizeFile(fileId, chunk_number) {
        if(this.isCanceled){
            return Promise.reject('Job Already canceled in _finalizeFile');
        }
        return new Promise((resolve, reject) => {
            debug(`finalizeFile: id:${fileId} chunk:${chunk_number}`)
            this.requestCue.finalizeFile = requestPromise(this.formatRequestOption(
                'PUT',
                `https://wetransfer.com/api/${this.apiVersion}/transfers/${this.id}/files/${fileId}/finalize`, {
                    "chunk_count": chunk_number
                }
            ))
            .then((res) =>{
                return resolve(res);
            }, (err) => {
                if(err) debug(`finalizeFile error: ${err.message}`)
                return reject(err);
            })
        });
    }

    cancel(){ return this.emit('cancel'); }
}



exports.upload = function(mailFrom, mailRecipients, payloads, message, ui_language){
    if (!(this instanceof Upload)) return new Upload(mailFrom, mailRecipients, payloads, message, ui_language);
};
