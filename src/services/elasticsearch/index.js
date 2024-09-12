require('module-alias/register')
const { join } = require('path')
const { fork, ChildProcess } = require('child_process')
const es = require('@elastic/elasticsearch')
const { Setting } = require('@/models')
const { emitter, events } = require('@/emitter')
const logger = require('@/logger')
const { indices } = require('@/services/elasticsearch/indices')

/** @type{es.Client=} */
let client

const ES = {}
/** @type {boolean=} */
ES.enabled = undefined
/** @type {ChildProcess=} */
ES.__rebuildFork = undefined

async function setup() {
  try {
    if (ES.enabled === undefined) {
      const { value: enabled } = await Setting.getSettingByName('es:enable')
      ES.enabled = enabled
    }
    if (!ES.enabled) {
      if (global.esRebuilding) {
        // if rebuild is in progress kill it
        logger.warn(`Rebuild process [${ES.__rebuildFork?.pid}] is ongoing. Force stoping the rebuild process`)
        ES.__rebuildFork?.kill('SIGTERM')
        ES.__rebuildFork = undefined
      }
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

    const { Search } = require('@/services/semantic-search')
    await Search.init()
  } catch (err) {
    logger.warn(`elastic search setup failed ${err}`)
  }
}

/**
 * Initializes the client and registers hooks if elastic search is enabled.
 * @returns {Promise.<void>}
 */
ES.init = async () => {
  // If es:enable flag is updated this hook will reenable es and creates indexes
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

/**
 * Deletes and rebuilds all indexes, registered through this client.
 *
 * TODO: replace old client with this one
 *
 * @returns {Promise.<void>}
 */
ES.rebuild = async () => {
  if (global.esRebuilding) {
    logger.warn('Index rebuild attempted while already rebuilding!.')
    return
  }
  try {
    if (!ES.enabled) {
      return
    }
    await ES.checkConnection()
    global.esStatus = 'Rebuilding...'

    ES.__rebuildFork = fork(join(__dirname, 'rebuild-index.js'), {
      env: {
        FORK: '1',
        NODE_ENV: global.env,
        MONGODB_URI: global.CONNECTION_URI
      }
    })

    global.esRebuilding = true
    global.forks.push({ name: 'elasticsearchIndexRebuild', fork: ES.__rebuildFork })

    ES.__rebuildFork.once('message', function(/** @type {{  success: boolean } } */ data) {
      global.esStatus = data.success ? 'Connected' : 'Error'
      global.esRebuilding = false
    })

    ES.__rebuildFork.on('exit', function() {
      logger.debug('Rebuilding Process Closed: ' + ES.__rebuildFork?.pid)
      global.esRebuilding = false
      global.forks = global.forks.filter(i => i.name !== 'elasticsearchIndexRebuild')
      ES.__rebuildFork = undefined
    })
  } catch (e) {
    logger.error(e)
  }
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
  * Creates and elastic index.
  *
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
  * Deletes an index if it exists.
  *
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
 *
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
