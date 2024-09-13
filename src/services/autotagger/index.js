const logger = require('@/logger')

const Setting = require('@/models/setting')
const Tag = require('@/models/tag')
const { ClassifierStrategyFactory } = require('@/services/autotagger/strategies')
const { AIClient } = require('@/services/ai-client')
const { TAGGER_STRATEGY, TAGGER_PREFERENCES, TAGGER_STRATEGY_OPTIONS, TAGGER_USE_INFERENCE } = require('@/settings/settings-keys')

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
    tagger_preferences,
    tagger_strategy = 'top-n',
    tagger_strategy_options = { count: 3 },
    tagging_inference_enable = false
  } = await Setting.getSettingsObjectByName([
    TAGGER_STRATEGY,
    TAGGER_PREFERENCES,
    TAGGER_STRATEGY_OPTIONS,
    TAGGER_USE_INFERENCE
  ])

  /** @type {Array.<any>} */
  const tags = !!tagger_preferences
    ? await Tag.getTagByNames(tagger_preferences)
    : await Tag.getTags()

  if (!tags || tags.length === 0) {
    logger.warn("[tagger] No tags found/configured. Ignoring autotagging request")
    return undefined
  }

  const response = await AIClient.classify({
    text: `${ticket.subject}\n${ticket.issue}`,
    labels: tags.map(tag => tag.name),
    use_inference: tagging_inference_enable
  })

  const classificationStrategy = ClassifierStrategyFactory.create(tagger_strategy)
  const { labels } = classificationStrategy.decide(response.labels, response.scores, tagger_strategy_options)

  return labels.map(label => tags.find(tag => tag.name === label))
}

module.exports = {
  tagTicket
}
