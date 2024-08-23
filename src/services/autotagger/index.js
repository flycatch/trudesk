const logger = require('@/logger')

const Setting = require('@/models/setting')
const Tag = require('@/models/tag')
const { TaggerClient } = require('@/services/autotagger/tagging-api-client')
const { ClassifierStrategyFactory } = require('@/services/autotagger/strategies')

/** 
 * Tags a ticket based on its title and description using the tagger API.
 *
 * @param {any=} ticket - The ticket to classify
 * @returns {Promise.<Array.<any> | undefined>} The tags that most match the ticket
 */
const tagTicket = async (ticket) => {
  if (!ticket) {
    logger.warn("[tagger] No ticket provided. Ignoring clasification request")
    return  undefined
  }

  if (ticket.tags && ticket.tags.length > 0) {
    logger.info("[tagger] Ticket already has tags assigned to it")
    return undefined 
  }

  const {
    tagger_host,
    tagger_preferences,
    tagger_basictoken,
    tagger_strategy = 'highest-score',
    tagger_strategy_options = { count: 3 },
  } = await Setting.getSettingsObjectByName([
    'tagger:host',
    'tagger:preferences',
    'tagger:basictoken',
    'tagger:strategy',
    'tagger:strategy:options'
  ])

  if (!tagger_host) {
    logger.warn("[tagger] No tagger host configured. Ignoring classification request")
    return undefined 
  }

  /** @type {Array.<any>} */
  const tags = !!tagger_preferences
    ? await Tag.getTagByNames(tagger_preferences)
    : await Tag.getTags()

  if (!tags || tags.length === 0) {
    logger.warn("[tagger] No tags found/configured. Ignoring autotagging request")
    return undefined
  }

  const response = await TaggerClient.classify({
    text: `${ticket.subject}\n${ticket.issue}`,
    labels: tags.map(tag => tag.name),
  }, tagger_host, tagger_basictoken)

  const classificationStrategy = ClassifierStrategyFactory.create(tagger_strategy)
  const { labels } = classificationStrategy.decide(response.labels, response.scores, tagger_strategy_options)

  return labels.map(label => tags.find(tag => tag.name === label))
}

module.exports = {
  tagTicket
}
