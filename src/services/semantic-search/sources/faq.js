const { emitter, events } = require("@/emitter")
const logger = require("@/logger")
const Faq = require("@/models/faq")

/** @type {import("./type").Source} */
const FaqSource = {}

FaqSource.registerSource = async (search) => {
  emitter.on(events.FAQ_CREATED, async (/** @type {import("@/models/faq").FAQ} */ faq) => {
    try {
      await search.insert({
        type: "FAQ",
        idField: "_id",
        embeddedField: "question",
        document: faq.toObject()
      })
    } catch (err) {
      logger.warn(`Elasticsearch failure: ${err}`)
    }
  })

  emitter.on(events.FAQ_UPDATED, async (/** @type {import("@/models/faq").FAQ */ faq) => {
    try {
      await search.update(faq._id.toString(), {
        type: "FAQ",
        idField: "_id",
        embeddedField: "question",
        document: faq.toObject()
      })
    } catch (err) {
      logger.warn(`Elasticsearch failure: ${err}`)
    }
  })

  emitter.on(events.FAQ_DELETED, async (/** @type {string} */ id) => {
    try {
      await search.delete(id)
    } catch (err) {
      logger.warn(`Elasticsearch failure: ${err}`)
    }
  })
}


FaqSource.syncSource = async (search) => {
  const stream = Faq.find()
    .lean()
    .cursor()

  /** @type {Array.<import('@/services/semantic-search').Source>} */
  let bulk = []

  const BATCH_SIZE = 10
  let count = 0
  stream
    .on('data', async document => {
      stream.pause()
      count++
      bulk.push({
        type: 'FAQ',
        embeddedField: 'question',
        idField: '_id',
        document
      })

      if (count % BATCH_SIZE === 1) {
        await search.bulk(bulk)
        bulk = []
      }
      stream.resume()
    })
    .on('err', (err) => {
      logger.error(err)
      throw err
    })
  .on('close', async () => {
    logger.debug(`Total indexed ${count}`)
    await search.bulk(bulk)
    bulk = []
  })
}

module.exports = {
  FaqSource
}

