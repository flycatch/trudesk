const { Setting } = require('@/models')
const es = require('@elastic/elasticsearch')
const emitter = require('@/emitter')
const logger = require('@/logger')

/** @type{es.Client=} */
let client

emitter.on('setting:updated', async (setting) => {
  if (setting.name !== 'es:host' || setting.name !== 'es:port') {
    return
  }

  if (setting.name === 'es:enable' && client) {
    if (!setting.value) {
      await client.close()
      client = undefined
      return
    }
  }

  try {
    if (client) {
      await client.close()
      client = undefined
    }
    client = await ES.getClient()
  } catch (err) {
    logger.error(`client creation failed`, err)
  }
})

const ES = {}

/**
 * Builds the elasticsearch client
 * @returns {Promise.<es.Client>}
 */
ES.getClient = async function () {
  if (client) {
    return client
  }

  let URI = process.env.ELASTICSEARCH_URI
  if (!URI) {
    const settings = await Setting.getSettingsObjectByName(
      ['es:host', 'es:port']
    )
    URI =  `${settings.es_host}:${settings.es_port}`
  }
  client = new es.Client({
    node: URI,
    pingTimeout: 10000,
    maxRetries: 5
  })
  return client
}

module.exports = {
  ElasticSearch: ES
}
