const logger = require('@/logger')

/**
 * Selects labels based on the provided thresholds.
 * - If both min and max are provided, then all labels whose score is in between are selected
 * - If only max is provided, then all labels whose score falls bellow max is selected
 * - If only min is provided, then all lables whose scores are above the min is selected
 *
 * @type {import('./types').Strategy<import('./types').ThresholdStrategyOptions>} 
 */
const ThresholdStrategy = {}

ThresholdStrategy.decide = (labels, scores, options) => {
  logger.info(`tagging ticket using [threshold] strategy with max - ${options?.maximumThreshold} min - ${options?.minimumThreshold}`)

  if (!options) {
    throw new Error('Atleast one threshold needs to be specified')
  }

  /** @type {number | undefined} */
  const max = options?.maximumThreshold && options.maximumThreshold > 0
    ? options.maximumThreshold
    : undefined

  /** @type {number | undefined} */
  const min = options.minimumThreshold && options.minimumThreshold > 0
    ? options.minimumThreshold
    : undefined

  if (max && min) {
    return {
      labels: labels.filter((_, index) => {
        const score = scores[index]
        return score <= max && score >= min
      })
    }
  }

  if (max) {
    return {
      labels: labels.filter((_, index) => scores[index] <= max)
    }
  }

  if (min) {
    return {
      labels: labels.filter((_, index) => scores[index] >= min)
    }
  }

  throw new Error('Atleast one threshold needs to be specified')
}

module.exports = {
  ThresholdStrategy
}
