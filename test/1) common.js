const assert = require('assert')
const { URL } = require('url')
const { getInfo, isValidWetransfertUrl, Payload } = require('../index')
const { formatDownloadApiUri } = require('../utils/utils')


describe('1) Common', function () {
    describe('isValidWetransfertUrl', function () {
        it('null is not a valid url', function () {
            assert.strictEqual(isValidWetransfertUrl(null), false)
        })
        it('https://qwant.fr is not a valid url', function () {
            assert.strictEqual(isValidWetransfertUrl('https://qwant.fr'), false)
        })
        it('https://we.tl/t-vJmAEKGL09 is a valid url', function () {
            assert.strictEqual(isValidWetransfertUrl('https://we.tl/t-vJmAEKGL09') instanceof URL, true)
        })
        it('https://wetransfer.com/downloads/068f46823c14ad9c3b5ef39d0f01f90120210504211103/7924157e91f9eff675d18ac63fcc23b820210504211117/ecbda7 is a valid url', function () {
            assert.strictEqual(isValidWetransfertUrl('https://wetransfer.com/downloads/068f46823c14ad9c3b5ef39d0f01f90120210504211103/7924157e91f9eff675d18ac63fcc23b820210504211117/ecbda7') instanceof URL, true)
        })
        it('Should accept subdomain wetransfer domain', function () {
            assert.strictEqual(isValidWetransfertUrl('https://orgrimarr.wetransfer.com/downloads/068f46823c14ad9c3b5ef39d0f01f90120210504211103/7924157e91f9eff675d18ac63fcc23b820210504211117/ecbda7') instanceof URL, true)
        })
    })


    describe('formatDownloadApiUri', function () {
        it('https://we.tl/t-vJmAEKGL09', async function () {
            assert.deepStrictEqual(await formatDownloadApiUri(new URL('https://we.tl/t-vJmAEKGL09'), 'fileId'), {
                uri: 'https://wetransfer.com/api/v4/transfers/be2583ec763c5f2a3beeaa9ee443759320201025085558/download',
                body: {
                    security_hash: '56942f',
                    intent: 'single_file',
                    file_ids: ['fileId']
                }
            })
        })
        it('https://wetransfer.com/downloads/068f46823c14ad9c3b5ef39d0f01f90120210504211103/7924157e91f9eff675d18ac63fcc23b820210504211117/ecbda7', async function () {
            assert.deepStrictEqual(await formatDownloadApiUri(new URL('https://wetransfer.com/downloads/068f46823c14ad9c3b5ef39d0f01f90120210504211103/7924157e91f9eff675d18ac63fcc23b820210504211117/ecbda7'), 'fileId'), {
                uri: 'https://wetransfer.com/api/v4/transfers/068f46823c14ad9c3b5ef39d0f01f90120210504211103/download',
                body: {
                    recipient_id: '7924157e91f9eff675d18ac63fcc23b820210504211117',
                    security_hash: 'ecbda7',
                    intent: 'single_file',
                    file_ids: ['fileId']
                }
            })
        })
        it('Should accept subdomain wetransfer domain', async function () {
            assert.deepStrictEqual(await formatDownloadApiUri(new URL('https://orgrimarr.wetransfer.com/downloads/068f46823c14ad9c3b5ef39d0f01f90120210504211103/7924157e91f9eff675d18ac63fcc23b820210504211117/ecbda7'), 'fileId'), {
                uri: 'https://wetransfer.com/api/v4/transfers/068f46823c14ad9c3b5ef39d0f01f90120210504211103/download',
                body: {
                    recipient_id: '7924157e91f9eff675d18ac63fcc23b820210504211117',
                    security_hash: 'ecbda7',
                    intent: 'single_file',
                    file_ids: ['fileId']
                }
            })
        })
    })

    describe('Payload', function () {

    })

    describe('getInfo', function () {
        // it('Should be epired', async function () {
        //     await assert.rejects(getInfo('https://we.tl/t-vJmAEKGL09'), { message: 'Error GET https://we.tl/t-vJmAEKGL09 server respond with status 404 Not Found' })
        // })
    })

    run()
})