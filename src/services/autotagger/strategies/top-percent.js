const logger = require('@/logger')

/** 
  * Selects top `N%` labels with the highes score.
  * N is a percentage value that specifies the proportion of labels to select.
  * By default the top 50% of labels will be selected.
  *
  * @type {import("./types").Strategy<import("./types").TopPercentStrategyOptions>} */
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
      .sort((a, b) => b.score - a.score)
      .map(label => label.label)
      .slice(0, topNpercentCount)
  }
}

module.exports = {
  TopPercentStrategy
}
