const { default: axios } = require("axios")

const logger = require('@/logger')
const { exponentialRetry } = require("@/helpers/utils")

/**
* @typedef {object} ClassifyRequest
* @property {string} text
* @property {Array.<string>} labels
* @property {boolean} use_inference
*
* @typedef {object} ClassifyResponse
* @property {Array.<string>} labels
* @property {Array.<number>} scores
*
*
* @typedef {object} EmbeddingsRequest
* @property {string} text
* @property {boolean} use_inference
*
* @typedef {object} EmbeddingsResponse
* @property {Array.<number>} embeddings
* @property {number} dim
*
*/


const TaggerClient = {}

const httpClient = axios.create()
exponentialRetry(httpClient)

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

/** 
 * @param {EmbeddingsRequest} data
 * @param {string} host - The host of tagging API
 * @param {string} auth - The basic auth token
 * @returns {Promise.<EmbeddingsResponse>}
 */
TaggerClient.embeddings = async (data, host, auth) => {
    logger.info('requesting for embeddings')
    const url = new URL('/api/v2/embeddings', host).href
    const response = await axios.request({
        url,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${auth}`
        },
        data 
    })

    if (response.status !== 200) {
        logger.info(`Embeddings API responded with ${JSON.stringify(response.data)}`)
        const { error: { message, details } } = response.data
        throw new Error(`Tagging API failed: ${message} - ${JSON.stringify(details)}`)
    }

    /** @type {{result: { embeddings: Array.<number>, dim: number}}} */
    const { result: { embeddings, dim } } = response.data

    const result = { embeddings, dim }
    logger.info(`Embeddings API responded with ${dim} dimension array`)
    return result
}


module.exports = {
    TaggerClient
}
