const {createReadStream, existsSync, statSync } = require('fs')
const ReadableStream    = require('stream').Readable
const path              = require('path')


/**
 * @description Unified upload Payload Object
 *
 * @class Payload
 */
class Payload{
    /**
     *Creates an instance of Payload.
     * @param {object} {filePath = null, name = null, buffer = null, stream = null, size = null}
     * @memberof Payload
     */
    constructor({filePath = null, buffer = null, stream = null, name = null, size = null}){
        try{
            // Test conflicts
            if(filePath !== null && (buffer !== null || stream !== null)){
                throw new Error("Payload::Error You must provide only one type of data (filePath or buffer or stream)")
            }
            if(buffer !== null && (filePath !== null || stream !== null)){
                throw new Error("Payload::Error You must provide only one type of data (filePath or buffer or stream)")
            }
            if(stream !== null && (buffer !== null || filePath !== null)){
                throw new Error("Payload::Error You must provide only one type of data (filePath or buffer or stream)")
            }

            // Init var
            this.name = name
            this.size = size
            this.stream = stream
    
            // If a file path is provide
            if(filePath !== null){
                filePath = path.resolve(filePath)
                if (!existsSync(filePath)) {
                    throw new Error(`Payload::Error File "${filePath}" does not exist`)
                }
                this.size = statSync(filePath).size;
                if(this.size < 1){
                    throw new Error(`Payload::Error File "${filePath}" size cant be null`)
                }

                // Use file name is no name provide
                if(typeof this.name !== "string" || this.name.length < 1){
                    this.name = path.basename(filePath)
                }
    
                this.stream = createReadStream(filePath)
            }
    
            // Mandatory file Name
            if(typeof this.name !== "string"){
                throw new Error("Payload::Error name must be a String")
            }
            if(this.name.length < 1){
                throw new Error("Payload::Error name must be a non null String")
            }
    
    
            // If upload from a NodeJS Buffer
            if(buffer !== null){
                if(!Buffer.isBuffer(buffer)){
                    throw new Error("Payload::Error buffer must be a Buffer object")
                }
    
                this.size = buffer.length

                this.stream = new ReadableStream()  // Create new Readable Stream
                this.stream._read = () => {}
                this.stream.push(buffer)            // Push buffer to Stream
                this.stream.push(null)              // EOF
            }

            // If upload from stream
            if(stream !== null){
                if(!(stream instanceof ReadableStream)){
                    throw new Error("Payload::Error stream must be an instance of stream.Readable. See https://nodejs.org/api/stream.html#stream_class_stream_readable")
                }

                this.size = size

                if(typeof this.size !== "number"){
                    throw new Error("Payload::Error size must be a number")
                }
                if(this.size < 1){
                    throw new Error(`Payload::Error Stream, you must provide a non null size parameter`)
                }

                this.stream = stream
            }
        }
        catch(error){
            if(this.stream !== null){
                try{
                    this.stream.destroy(error)
                }
                catch(e){}
            }
            throw error
        }
    }
}



module.exports = Payload