const {createReadStream, existsSync, statSync } = require('fs');
const { parseString}    = require('xml2js');
const { basename }      = require('path');
const EventEmitter      = require('events');
const Promise           = require("bluebird");
const requestPromise    = require('request-promise');
const ReqProgress       = require('request-progress');
const request           = require('request');

const xmlParseOptions = {
    explicitArray: false,
    explicitRoot: true,
    preserveChildrenOrder: true,
    async: true,
    ignoreAttrs: true,
    trim: true
}

class Upload extends EventEmitter {
    constructor(mailFrom, mailRecipients, filePaths, message = '', ui_language = 'en') {
        super();
        this.id = '';
        this.mailFrom = mailFrom;
        this.mailRecipients = mailRecipients;
        this.filePaths = filePaths;
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
            if(!this.isCanceled){
                this.cancelJob(e);
            }
        });
        this.on('end',  () =>{
            this.emit('progress', 1);
        });

        //Start upload
        this.lunchupload = async function() {
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
                const knowFileName = new Set();
                for (let i of this.filePaths) {
                    if (!existsSync(i)) {
                        return this.emit('error', `File "${i}" does not exist`);
                    }
                    const fileSize = statSync(i).size;
                    if(fileSize < 1){
                        return this.emit('error', `File "${i}" size cant be null`);
                    }
                    const name = basename(i);
                    if(typeof name === 'string' && !knowFileName.has(name)){
                        knowFileName.add(name);
                    }
                    else{
                        return this.emit('error', `Bad file ${i} or ${name} is already present`);
                    }
                    this.fileToUpload[name]= {
                        name: name,
                        path: i,
                        size: fileSize
                    };
                }
                if(knowFileName.length < 1){
                    return this.emit('error', 'you must provide at least one file');
                }

                this.totalSizeToUpload = 0;
                this.totalSizeUploaded = 0;
                this.startTime = Date.now();

                for(let i in this.fileToUpload){
                    this.totalSizeToUpload += this.fileToUpload[i].size;
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
                            "path": currentFile.path,
                            "size": currentFile.size
                        }
                    );
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
        this.validateEmail = function(email) {
            var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
            return re.test(email);
        }
        this.formatRequestOption = function(method, url, body) {
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
        this.emailRequest = function() {
            if(this.isCanceled){
                return Promise.reject('Job Altready canceled in _emailRequest');
            }
            const fileNames = [];
            for(let i in this.fileToUpload){
                fileNames.push(i);
            }
            let url = 'https://wetransfer.com/api/ui/transfers/link'
            let body = {
                    "message": typeof this.message === 'string' ? this.message : '',
                    "ui_language": typeof this.ui_language === 'string' ? this.ui_language : 'en',
                    "filenames": fileNames
                }
            if (this.mailFrom !== '' || this.mailRecipients !== '') {
              body.recipients = this.mailRecipients;
              body.from = this.mailFrom;
              url = 'https://wetransfer.com/api/ui/transfers/email'
            }

            return new Promise((resolve, reject) => {
                this.requestCue.emailRequest = requestPromise(this.formatRequestOption('POST', url, body))
                .then((res) =>{
                    return resolve(res);
                }, (err) => {
                    return reject(err);
                })
            });
        }
        this.finalize = function() {
            if(this.isCanceled){
                return Promise.reject('Job Altready canceled in _finalize');
            }
            return new Promise((resolve, reject) => {
                this.requestCue.finalize = requestPromise(this.formatRequestOption(
                    'PUT',
                    `https://wetransfer.com/api/ui/transfers/${this.id}/finalize`
                ))
                .then((res) =>{
                    return resolve(res);
                }, (err) => {
                    return reject(err);
                })
            });
        }
        this.cancelJob = function(error){
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
                `https://wetransfer.com/api/ui/transfers/${this.id}`
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
        this.uploadFileWF = function(currestFileObject) {
            if(this.isCanceled){
                return Promise.reject('Job Altready canceled in _uploadFileWF');
            }
            return new Promise(async (resolve, reject) => {
                const fileObj = {
                    path: currestFileObject.path,
                    name: currestFileObject.name,
                    id: currestFileObject.id,
                    chunk_size: currestFileObject.chunk_size,
                    size: currestFileObject.size
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

                    const neededChunk = fileObj.size > fileObj.chunk_size ? Math.floor(fileObj.size / fileObj.chunk_size) + 1 : 1;
                    uploadFileStream = createReadStream(fileObj.path)
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
                                        this.emit('progress', this.totalProgress);
                                    }
                                    uploadFileStream.resume();
                                }
                                return 'ok';
                            } catch (e) {
                                uploadFileStream.destroy();
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
                                    this.emit('progress', this.totalProgress);
                                }
                                const final = await this.finalizeFile(fileObj.id, currentChunkOffset);
                                return resolve(final);
                            }
                            catch(e){
                                return reject(e.message);
                            }
                        })
                        .on('error', (err) => {
                            return reject( err.error || err);
                        });

                } catch (e) {
                    if(uploadFileStream !== null){
                        uploadFileStream.destroy();
                    }
                    return reject(e.message);
                }
            });
        }
        this.fileRequest = function(filename, chunk_size) {
            if(this.isCanceled){
                return Promise.reject('Job Altready canceled in _fileRequest');
            }

            return new Promise((resolve, reject) => {
                this.requestCue.fileRequest = requestPromise(this.formatRequestOption(
                    'POST',
                    `https://wetransfer.com/api/ui/transfers/${this.id}/files`, {
                        "name": filename,
                        "size": chunk_size
                    }
                ))
                .then((res) =>{
                    return resolve(res);
                }, (err) => {
                    return reject(err);
                })
            });
        }
        this.chunkRequest = function(fileID, chunk_number, chunk_size, retries) {
            if(this.isCanceled){
                return Promise.reject('Job Altready canceled in _chunkRequest');
            }
            return new Promise((resolve, reject) => {
                this.requestCue.chunkRequest = requestPromise(this.formatRequestOption(
                    'PUT',
                    `https://wetransfer.com/api/ui/transfers/${this.id}/files/${fileID}`, {
                        "chunk_number": chunk_number || 1,
                        "chunk_size": chunk_size,
                        "retries": retries || 0
                    }
                ))
                .then((res) =>{
                    return resolve(res);
                }, (err) => {
                    return reject(err);
                })
            });
        }
        this.s3upload = function(template, fileName, uploadBuffer, chunk_number) {
            if(this.isCanceled){
                return Promise.reject('Job Altready canceled in _s3upload');
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

                return new Promise((resolve, reject) => {
                    this.requestCue.s3upload = requestPromise(options)
                    .then((res) =>{
                        return resolve(res);
                    }, (err) => {
                        return reject(err);
                    })
                });
            } catch (e) {
                return Promise.reject(e.message);
            }
        }
        this.finalizeFile = function(fileId, chunk_number) {
            if(this.isCanceled){
                return Promise.reject('Job Altready canceled in _finalizeFile');
            }
            return new Promise((resolve, reject) => {
                this.requestCue.finalizeFile = requestPromise(this.formatRequestOption(
                    'PUT',
                    `https://wetransfer.com/api/ui/transfers/${this.id}/files/${fileId}/finalize`, {
                        "chunk_count": chunk_number
                    }
                ))
                .then((res) =>{
                    return resolve(res);
                }, (err) => {
                    return reject(err);
                })
            });
        }

        this.lunchupload();
    }

    cancel(){ return this.emit('cancel'); }
}



exports.upload = function(mailFrom, mailRecipients, filePaths, message, ui_language){
    if (!(this instanceof Upload)) return new Upload(mailFrom, mailRecipients, filePaths, message, ui_language);
};
