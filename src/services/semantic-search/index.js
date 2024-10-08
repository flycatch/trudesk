const { Setting } = require("@/models")
const logger = require('@/logger')
const { emitter, events } = require('@/emitter')
const { ElasticSearch } = require("@/services/elasticsearch")
const { sources } = require("@/services/semantic-search/sources")
const { PublicQa } = require("@/services/elasticsearch/indices/public-qa")
const { AIClient } = require("@/services/ai-client")
const { ES_ENABLE, SEMANTICSEARCH_ENABLE } = require("@/settings/settings-keys")

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
 * @property {boolean} initialized
 * @property {boolean} searchEnabled
 * @property {boolean} esEnabled
 *
 * @typedef {object} SearchResultItem
 * @property {string} type
 * @property {number} score
 * @property {any} source
 */

const Search = {}

/** 
 * @type {SearchSettings=}
 */
Search.__settings = undefined

async function getSettings() {
  if (Search.__settings) {
    return Search.__settings
  }

  const settings = await Setting.getSettingsObjectByName([
    ES_ENABLE,
    SEMANTICSEARCH_ENABLE,
  ])
  Search.__settings = {
    enabled: (!!settings.es_enable) && (!!settings.semanticsearch_enable),
    searchEnabled: settings.semanticsearch_enable,
    esEnabled: settings.es_enable,
    initialized: false,
  }
  return Search.__settings
}

const onSettingsUpdate = async ( /** @type {import('@/models/setting').Setting} */{ name, value }) => {
  if (name !== ES_ENABLE && name !== SEMANTICSEARCH_ENABLE) {
    return
  }

  const settings = await getSettings()
  switch (name) {
    case ES_ENABLE: settings.esEnabled = value; break
    case SEMANTICSEARCH_ENABLE: settings.searchEnabled = value; break
    default: break
  }
  settings.enabled = settings.esEnabled && settings.searchEnabled
  // Initialize search if not already
  if (!settings.initialized && settings.enabled) {
    await Search.init()
  }
}

Search.init = async () => {
  emitter.removeListener(events.SETTINGS_UPDATED, onSettingsUpdate)
  emitter.on(events.SETTINGS_UPDATED, onSettingsUpdate)
  const settings = await getSettings()
  if (!settings.enabled || settings.initialized) {
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
  settings.initialized = true
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
 * @param {string} query The query to search
 * @param {number} limit The no:of results that should be returned
 * @param {number} minScore The minimum score the results should have
 * @returns {Promise.<Array.<SearchResultItem> | undefined>}
 *
 */
Search.search = async (query, limit = 20, minScore = 0.5) => {
  if (query === undefined || query.trim() === '') {
    return undefined
  }
  const settings = await getSettings()
  if (!settings.enabled) {
    logger.warn('[semanticsearch] search called when feature is disabled')
    return undefined
  }

  if (!PublicQa.indexed) {
    return undefined
  }

  const response = await AIClient.embeddings({
    text: `${query}`,
    use_inference: false
  })

  logger.debug(`Searching on search index for ${query}`)
  const client = await ElasticSearch.getClient()

  try {
    /** @type { import('@elastic/elasticsearch/lib/api/types').KnnSearchResponse.<SourceInfo> } */
    const searchResponse = await client.knnSearch({
      index: PublicQa.name,
      knn: {
        field: "vector",
        query_vector: response.embedding,
        num_candidates: 3 * limit,
        k: limit,
      }
    })
    return /** @type {Array.<SearchResultItem>} */ (searchResponse.hits.hits.map(result => {
      const source = result._source
      const score = result._score ?? 0
      if (score < minScore) {
        return undefined
      }
      return {
        type: source?.type ?? '',
        source: source?.source ?? {},
        score: result._score ?? 0
      }
    }).filter(result => result !== undefined))
  } catch (err) {
    logger.error(`SemanticSearch resulted in an error`, err)
    throw new Error('Unexpected Error')
  }
}

/**
 * Inserts a source to the search index
 *
 * @param {Source} source - The source to be inserted
 * @returns {Promise.<void>}
 */
Search.insert = async (source) => {
  if (source === undefined) {
    return
  }
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
    const response = await AIClient.embeddings({
      text: `${source.document[source.embeddedField]}`,
      use_inference: false
    })

    const id = source.document[source.idField]

    logger.debug(`inserting document ${source.type} of id ${id} to search index`)
    const client = await ElasticSearch.getClient()
    await client.index({
      index: PublicQa.name,
      id,
      document: {
        type: source.type,
        vector: response.embedding,
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
      const response = await AIClient.embeddings({
        text: `${source.document[source.embeddedField]}`,
        use_inference: false,
      })

      const id = source.document[source.idField]
      bulk.push({ index: { _index: PublicQa.name, _id: id } })
      bulk.push({
        type: source.type,
        vector: response.embedding,
        source: source.document
      })
    }

    const response = await client.bulk({ timeout: '3m', operations: bulk })
    if (response.errors) {
      logger.error(`failed to bulk insert ${JSON.stringify(response.items)}`)
      return
    }
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
  if (id === undefined) {
    return
  }
  const setting = await getSettings()
  if (!setting.enabled) {
    return
  }

  if (!PublicQa.indexed) {
    return
  }

  try {
    const response = await AIClient.embeddings({
      text: `${source.document[source.embeddedField]}`,
      use_inference: false
    })

    logger.debug(`updating document ${source.type} of id ${id} to search index`)

    const client = await ElasticSearch.getClient()
    await client.index({
      id,
      index: PublicQa.name,
      refresh: 'true',
      document: {
        type: source.type,
        vector: response.embedding,
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
  if (id === undefined) {
    return
  }
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
