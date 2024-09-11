const es = require('@elastic/elasticsearch')
const { Setting } = require('@/models')
const { emitter, events } = require('@/emitter')
const logger = require('@/logger')
const { indices } = require('@/services/elasticsearch/indices')

/** @type{es.Client=} */
let client

const ES = {}
ES.enabled = false

async function setup() {
  try {
    if (!ES.enabled) {
      return
    }
    logger.info('Initializing elasticsearch client')
    await ES.checkConnection()
    await Promise.allSettled(indices.map(async index => {
      try {
        await ES.createIndex(index)
      } catch (e) {
        logger.error(`Failed to create index ${index.name}`, e)
      }
    }))
  } catch (err) {
    logger.warn(`elastic search setup failed ${err}`)
  }
}

ES.init = async () => {
  emitter.on(events.SETTINGS_UPDATED, async ({ name, value }) => {
    if (name !== 'es:host' && name !== 'es:port' && name !== 'es:enable') {
      return
    }

    if (name === 'es:enable') {
      ES.enabled = !!value
      if (client && !value) {
        await client.close()
        client = undefined
        return
      }
    }

    if (client) {
      await client.close()
      client = undefined
    }
    await setup()
  })
  await setup()
}

ES.checkConnection = async () => {
  if (!ES.enabled) {
    throw new Error('Elasticsearch not enabled')
  }
  try {
    const client = await ES.getClient()
    logger.info("checking elasticsearch connection")
    await client.ping()
    logger.info("Elasticsearch running... Connected.")
  } catch (e) {
    logger.warn(`Failed to check ES connection ${e}`)
    throw new Error(`Connection failure to elasticsearch`)
  }
}



/** 
  * @param {import('@/services/elasticsearch/indices/types').Index} index
  * @returns {Promise.<void>}
  */
ES.createIndex = async (index) => {
  if (!ES.enabled) {
    return
  }
  if (await ES.exists(index)) {
    index.indexed = true
    return
  }
  logger.debug(`creating index ${index.name}`)
  const client = await ES.getClient()
  await client.indices.create(await index.schema())
  index.indexed = true
}

/** 
  * @param {import('@/services/elasticsearch/indices/types').Index} index
  * @returns {Promise.<void>}
  */
ES.deleteIndex = async (index) => {
  if (!ES.enabled) {
    return
  }
  if (!await ES.exists(index)) {
    return
  }
  const client = await ES.getClient()
  await client.indices.delete({ index: index.name })
  index.indexed = false
}


/** 
  * Checks if an index exists.
  *
  * @param {import('@/services/elasticsearch/indices/types').Index} index
  * @returns {Promise.<boolean>}
  */
ES.exists = async (index) => {
  const client = await ES.getClient()
  try {
    return client.indices.exists({
      index: index.name,
    })
  } catch (e) {
    logger.warn(`Failed to check if ${index.name} exists`)
    return false
  }
}

/**
 * Builds the elasticsearch client
 * @returns {Promise.<es.Client>}
 */
ES.getClient = async function() {
  if (client) {
    return client
  }

  let URI = process.env.ELASTICSEARCH_URI
  if (!URI) {
    const settings = await Setting.getSettingsObjectByName(
      ['es:host', 'es:port']
    )
    URI = `${settings.es_host}:${settings.es_port}`
  }
  client = new es.Client({
    node: URI,
    pingTimeout: 10000,
    requestTimeout: 10000,
    maxRetries: 5
  })
  return client
}

module.exports = {
  ElasticSearch: ES
}
