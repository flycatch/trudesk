const logger = require("@/logger")
const { Setting, Ticket } = require("@/models")
const { tagTicket } = require("@/services/autotagger")
const { AUTOTAGGER_ENABLE } = require("@/settings/settings-keys")

/** @type {import('@/taskrunner').Task} */
const AutotaggerJob = {}

AutotaggerJob.name = 'autotagger:job'

AutotaggerJob.enable = async () => {
  const enabled = (await Setting.getSettingByName(AUTOTAGGER_ENABLE))
  if (!enabled) {
    return false
  }
  return !!(enabled.value)
}

AutotaggerJob.task = async () => {
    logger.debug('initiating autotagging')
    const tickets = await Ticket.getNonTagged()

    for (const ticket of tickets) {
      try {
        logger.debug(`[autotagger:job] tagging ticket ${ticket.uid}`)
        const tags = await tagTicket(ticket)
        if (!tags) {
          logger.warn(`[autotagger:job] failed to tag the ticket ${ticket.uid}`)
          continue
        }
        ticket.tags = tags
        await ticket.save()
      } catch (e) {
        logger.warn(`[autotagger:job] error in autotagging : ${e}`)
      }
    }
}

module.exports = {
  AutotaggerJob
}
