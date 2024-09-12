require('module-alias/register')

const database = require('@/database')
const { ElasticSearch } = require('@/services/elasticsearch')
const { indices } = require('@/services/elasticsearch/indices')
const logger = require('@/logger')
const { Search } = require('@/services/semantic-search')


async function setupDatabase() {
  return new Promise((resolve, reject) => {
    database.init(function(err, db) {
      if (err) {
        return reject(err)
      }
      resolve(db)
    }, process.env.MONGODB_URI)
  })
}

async function deleteIndices() {
  const results = await Promise.allSettled(indices.map(ElasticSearch.deleteIndex))

  const errors = []
  for (const result of results) {
    if (result.status === 'fulfilled') {
      continue
    }
    logger.error(`Failed to delete index for reason: ${result.reason}`)
    errors.push(result.reason)
  }
  if (errors.length > 0) {
    throw new Error(errors.join(','))
  }
}

async function createIndices() {
  const results = await Promise.allSettled(indices.map(ElasticSearch.createIndex))

  const errors = []
  for (const result of results) {
    if (result.status === 'fulfilled') {
      continue
    }
    logger.error(`Failed to create index for reason: ${result.reason}`)
    errors.push(result.reason)
  }
  if (errors.length > 0) {
    throw new Error(errors.join(','))
  }
}

async function main() {
  try {

    const startTime = Date.now()
    logger.info('Starting Elasticsearch index rebuild...')
    await setupDatabase()
    await ElasticSearch.init()
    await deleteIndices()
    await createIndices()

    await Search.sync()

    logger.info('Elasticsearch rebuild completed successful.')
    logger.debug(`Rebuilding took: ${Date.now() - startTime}`)
  } catch (err) {
    logger.error(err)
    throw err
  }
}
// TODO: move existing rebuild logic to the new elastic client
// main()
//   .then(() => {
//     setTimeout(() => {
//       process.send?.({ success: true })
//       return process.exit(0)
//     }, 0)
//   }).catch(err => {
//     process.send?.({ success: false, error: err })
//     process.exit(0)
//   })

module.exports = { main }
