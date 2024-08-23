const logger = require('@/logger')

/** @type {import("./types").Strategy<import("./types").TopPercentStrategyOptions>} */
const TopPercentStrategy = {}

TopPercentStrategy.decide = (labels, scores, options) => {

  logger.info(`tagging ticket using [top-percent] strategy with - percentage ${options?.percentage}`)
  if (!options) {
    throw new Error("Top percentage strategy options is undefined.")
  }

  options.percentage = options.percentage ?? 50

  // 100% => count
  // 1% => count/100
  // n% => (count/100) * n

  const topNpercentCount = Math.ceil((labels.length / 100.0) * options.percentage)

  return {
    labels: labels
      .map((label, index) => ({ label, score: scores[index] }))
      .sort((a, b) => a.score - b.score)
      .map(label => label.label)
      .filter((_, index) => index <= topNpercentCount)
  }
}

module.exports = {
  TopPercentStrategy
}
