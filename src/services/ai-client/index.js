const { default: axios } = require("axios")

const logger = require('@/logger')
const { exponentialRetry } = require("@/helpers/utils")
const { emitter, events } = require("@/emitter")
const { AI_HOST, AI_BASIC_TOKEN } = require("@/settings/settings-keys")
const { Setting } = require("@/models")

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
* @property {Array.<number>} embedding
* @property {number} dim
*
* @typedef {object} AIConfig
* @prop {string} host
* @prop {string} basicToken 
*/


const AIClient = {}

/** @type {AIConfig=} */
AIClient.__config = undefined

const httpClient = axios.create()
exponentialRetry(httpClient)

emitter.on(events.SETTINGS_UPDATED, async ({ name, value }) => {
  if (name !== AI_HOST || name !== AI_BASIC_TOKEN) {
    return
  }

  if (AIClient.__config === undefined) {
    AIClient.__config = await getConfig()
  }
  switch (name) {
    case AI_HOST: AIClient.__config.host = value; break
    case AI_BASIC_TOKEN: AIClient.__config.basicToken = value; break
    default: break
  }
})

async function getConfig() {
  if (AIClient.__config !== undefined) {
    return AIClient.__config
  }
  const settings = await Setting.getSettingsObjectByName([
    AI_HOST,
    AI_BASIC_TOKEN
  ])
  AIClient.__config = {
    host: settings.ai_host,
    basicToken: settings.ai_basicToken,
  }
  return AIClient.__config
}

/** 
 * @param {ClassifyRequest} data - The request body for classification
 * @returns {Promise.<ClassifyResponse>}
 */
AIClient.classify = async (data) => {
    const config = await getConfig()
    if (config.host === undefined || config.host.trim() === '') {
      logger.warn("[ai] host not configured. Ignoring classification request")
      throw new Error('AI host not configured')
    }
    logger.info('requesting tagging API')
    const url = new URL('/api/v2/classify', config.host).href
    const response = await axios.request({
        url,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${config.basicToken}`
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
 * @returns {Promise.<EmbeddingsResponse>}
 */
AIClient.embeddings = async (data) => {
    const config = await getConfig()
    if (config.host === undefined || config.host.trim() === '') {
      logger.warn('[ai] host not configured. Ignoring embeddings request')
      throw new Error('AI host not configured')
    }
    logger.debug('requesting for embeddings')
    const url = new URL('/api/v2/embeddings', config.host).href
    const response = await axios.request({
        url,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${config.basicToken}`
        },
        data 
    })

    if (response.status !== 200) {
        logger.debug(`Embeddings API responded with ${JSON.stringify(response.data)}`)
        const { error: { message, details } } = response.data
        throw new Error(`Tagging API failed: ${message} - ${JSON.stringify(details)}`)
    }

    /** @type {{result: { embedding: Array.<number>, dim: number}}} */
    const { result: { embedding, dim } } = response.data

    const result = { embedding, dim }
    logger.debug(`Embeddings API responded with ${dim} dimension array`)
    return result
}


module.exports = {
    AIClient
}
