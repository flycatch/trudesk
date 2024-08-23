const logger = require('@/logger')


/** @type {import('./types').Strategy.<import('./types').HighestScoreStrategyOptions>} */
const HighScoreStrategy = {}

HighScoreStrategy.decide = (labels, scores, options) => {
  logger.info('tagging ticket using [highest-score] strategy')

  let maxScore = 0
  let maxScoreIndex = 0
  labels.forEach((_, index) => {
    const score = scores[index]
    if (maxScore < score) {
      maxScore = score
      maxScoreIndex = index
    }
  })
  return { labels: [labels[maxScoreIndex]] }
}

module.exports = {
  HighScoreStrategy
} 
