const logger = require('@/logger')

const DEFAULT_TOP_COUNT = 3

/** 
 * Selects top `N` labels with the highest scores.
 * By default top 3 are selected.
 *
 * @type {import('./types').Strategy.<import('./types').TopNStrategyOptions>} 
 */
const TopNStrategy = {}

TopNStrategy.decide = (labels, scores, options) => {
  logger.info('tagging ticket using [highest-score] strategy')
  const count = options?.count ?? DEFAULT_TOP_COUNT
  if (!options || options.count === undefined) {
    logger.warn(`no default count specified for highest-score strategy - using default count of ${DEFAULT_TOP_COUNT}`)
  }

  return {
    labels: labels
      .map((label, index) => ({ label, score: scores[index] }))
      .sort((a, b) => b.score - a.score)
      .slice(0, count)
      .map(item => item.label)
  }
}

module.exports = {
  TopNStrategy
} 
