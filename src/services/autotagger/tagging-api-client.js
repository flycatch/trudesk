const { default: axios } = require("axios")

const logger = require('@/logger')

/**
* @typedef {object} ClassifyRequest
* @property {string} text
* @property {Array.<string>} labels
*
* @typedef {object} ClassifyResponse
* @property {Array.<string>} labels
* @property {Array.<number>} scores
*/


const TaggerClient = {}

/** 
*
* @param {ClassifyRequest} data - The request body for classification
* @param {string} host - The host of tagging API
* @param {string} auth - The basic auth token
* @returns {Promise.<ClassifyResponse>}
*/
TaggerClient.classify = async (data, host, auth) => {
    logger.info('requesting tagging API')
    const url = new URL('/api/v2/classify', host).href
    const response = await axios.request({
        url,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${auth}`
        },
        data,
    })
    if (response.status != 200) {
        // TODO: add retry
        logger.info(`Tagging API responded with ${JSON.stringify(response.data)}}`)
        const { error: { message, details } } = response.data
        throw new Error(`Tagging API failed: ${message} - ${JSON.stringify(details)}`)
    }


    /** @type {{result: { labels: Array.<string>, scores: Array.<number>}}} */
    const { result: { labels, scores } } = response.data

    const result = { labels, scores }
    logger.info(`Tagging API responded with ${JSON.stringify(result)}`)
    return result
}


module.exports = {
    TaggerClient
}
