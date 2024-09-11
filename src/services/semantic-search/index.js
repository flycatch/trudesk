const { Setting } = require("@/models")
const logger = require('@/logger')
const { TaggerClient } = require("@/services/autotagger/tagging-api-client")
const { emitter, events } = require('@/emitter')
const { ElasticSearch } = require("@/services/elasticsearch")
const { sources } = require("@/services/semantic-search/sources")
const { PublicQa } = require("@/services/elasticsearch/indices/public-qa")

/**
 * @typedef {object} Source
 * @property {string} type The type of the source
 * @property {string} embeddedField The field inside the document for which embeddings should be generated
 * @property {string} idField The field inside the document who act as an id
 * @property {Object.<string, any>} document The actual document source
 *
 * @typedef {object} SourceInfo
 * @property {string} type The type of source
 * @property {Array.<number>} vector The embeddings of embededField from Source
 * @property {any} source the actual source
 *
 * @typedef {object} SearchSettings
 * @property {boolean} enabled
 * @property {string} embeddingsHost
 * @property {string} embeddingsAuthToken
 */

const Search = {}

/** 
 * @type {SearchSettings=}
 */
Search.__settings = undefined

const keys = [
  'es:enable',
  'semanticsearch:enable',
  'tagger:host',
  'tagger:basicToken'
]

async function getSettings() {
  if (Search.__settings) {
    return Search.__settings
  }

  const settings = await Setting.getSettingsObjectByName(keys)
  Search.__settings = {
    enabled: (!!settings.es_enable) && (!!settings.semanticsearch_enable),
    embeddingsHost: settings.tagger_host,
    embeddingsAuthToken: settings.tagger_basicToken,
  }
  return Search.__settings
}

const onSettingsUpdate = async ( /** @type {import('@/models/setting').Setting} */{ name }) => {
  if (!keys.includes(name)) {
    return
  }
  Search.__settings = undefined
  Search.__settings = await getSettings()
}

Search.init = async () => {
  emitter.removeListener(events.SETTINGS_UPDATED, onSettingsUpdate)
  emitter.on(events.SETTINGS_UPDATED, onSettingsUpdate)
  const settings = await getSettings()
  if (!settings.enabled) {
    return
  }
  logger.info('Initializing semanticsearch client')
  logger.info(`Registering source hooks for semanticsearch`)
  const results = await Promise.allSettled(sources.map(source => source.registerSource(Search)))
  for (const result of results) {
    if (result.status === 'fulfilled') {
      continue
    }
    logger.warn(`unfulfilled source detected. Reason: ${result.reason}`)
  }
  logger.info('Semanticsearch initialized')
}

/** 
 * Syncs search sources to ES
 * @returns {Promise.<void>}
 */
Search.sync = async () => {
  const settings = await getSettings()
  if (!settings.enabled) {
    return
  }
  if (!PublicQa.indexed) {
    return
  }

  logger.info('syncing sources to search index')
  const results = await Promise.allSettled(sources.map(source => source.syncSource(Search)))
  for (const result of results) {
    if (result.status === 'fulfilled') {
      continue
    }
    logger.warn(`unfulfilled source sync detected. Reason: ${result.reason}`)
  }
}

/** 
 * Searches the query embeddings against vectors inside the public-qa index
 *
 * @param {string} query
 * @param {number} limit
 */
Search.search = async (query, limit = 20) => {
  const settings = await getSettings()
  if (!settings.enabled) {
    logger.warn('[semanticsearch] search called when feature is disabled')
    return undefined
  }

  if (!PublicQa.indexed) {
    return
  }

  const response = await TaggerClient.embeddings({
    text: `${query}`,
    use_inference: false
  }, settings.embeddingsHost, settings.embeddingsAuthToken)

  logger.debug(`Searching on search index for ${query}`)
  const client = await ElasticSearch.getClient()
  return client.search({
    index: PublicQa.name,
    query: {
      knn: {
        field: "vector",
        query_vector: response.embeddings,
        num_candidates: limit
      }
    }
  })


}

/**
 * Inserts a source to the search index
 *
 * @param {Source} source - The source to be inserted
 * @returns {Promise.<void>}
 */
Search.insert = async (source) => {
  const settings = await getSettings()
  if (!settings.enabled) {
    logger.debug('[semanticsearch] insert called when disabled')
    return
  }

  if (!PublicQa.indexed) {
    return
  }
  const text = source.document[source.embeddedField]
  if (!text) {
    throw new Error(`${source.embeddedField} not found in document`)
  }

  try {
    const response = await TaggerClient.embeddings({
      text: `${source.document[source.embeddedField]}`,
      use_inference: false
    }, settings.embeddingsHost, settings.embeddingsAuthToken)

    const id = source.document[source.idField]

    logger.debug(`inserting document ${source.type} of id ${id} to search index`)
    const client = await ElasticSearch.getClient()
    await client.index({
      index: PublicQa.name,
      id,
      document: {
        type: source.type,
        vector: response.embeddings,
        source: source.document
      }
    })
  } catch (e) {
    logger.warn(`Elasticsearch Error: ${e}`)
  }
}

/** 
 * Does a bulk insert to search index
 * 
 * @param {Array.<Source>} sources
 * @returns {Promise.<void>}
 */
Search.bulk = async (sources) => {
  if (sources === undefined || sources.length === 0) {
    return
  }
  const settings = await getSettings()
  if (!settings.enabled) {
    logger.debug('[semanticsearch] bulk insert called when disabled')
    return
  }

  if (!PublicQa.indexed) {
    return
  }

  try {
    const client = await ElasticSearch.getClient()

    const bulk = []

    for (const source of sources) {
      const response = await TaggerClient.embeddings({
        text: `${source.document[source.embeddedField]}`,
        use_inference: false,
      }, settings.embeddingsHost, settings.embeddingsAuthToken)

      const id = source.document[source.idField]
      bulk.push({ index: { _index: PublicQa.name, _id: id } })
      bulk.push({
        type: source.type,
        vector: response.embeddings,
        source: source.document
      })
    }

    await client.bulk({ timeout: '3m', operations: bulk })
    logger.debug(`Sent ${bulk.length} documents to es`)
  } catch (e) {
    logger.error(`Failed to bulk insert documents to es : ${e}`)
  }
}

/**
  *
  * Updates an existing document inside the search index
  *
  * @param {string} id The id of the document
  * @param {Source} source The new source
  * @returns {Promise.<void>}
  */
Search.update = async (id, source) => {
  const setting = await getSettings()
  if (!setting.enabled) {
    return
  }

  if (!PublicQa.indexed) {
    return
  }

  try {
    const response = await TaggerClient.embeddings({
      text: `${source.document[source.embeddedField]}`,
      use_inference: false
    }, setting.embeddingsHost, setting.embeddingsAuthToken)

    logger.debug(`updating document ${source.type} of id ${id} to search index`)

    const client = await ElasticSearch.getClient()
    await client.index({
      id,
      index: PublicQa.name,
      refresh: 'true',
      document: {
        type: source.type,
        vector: response.embeddings,
        source: source.document
      }
    })
  } catch (e) {
    logger.warn(`Elasticsearch Error: ${e}`)
  }
}

/** 
  * @param {string} id
  * @returns {Promise.<void>}
  */
Search.delete = async (id) => {
  const settings = await getSettings()
  if (!settings.enabled) {
    return
  }

  if (!PublicQa.indexed) {
    return
  }
  try {
    logger.debug(`Deleting document ${id} from search index`)
    const client = await ElasticSearch.getClient()
    await client.delete({
      index: PublicQa.name,
      id,
      refresh: 'true'
    })
  } catch (e) {
    logger.warn(`Ealastic search error : ${e}`)
  }
}

module.exports = { Search }
