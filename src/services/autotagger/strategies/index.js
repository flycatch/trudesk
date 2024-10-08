const { TopNStrategy } = require("@/services/autotagger/strategies/top-n");
const { ThresholdStrategy } = require("@/services/autotagger/strategies/threshold");
const { TopPercentStrategy } = require("@/services/autotagger/strategies/top-percent");

const ClassifierStrategyFactory = {}

/** 
 *
 * @param {import("./types").StrategyTypes} strategy
 * @returns {import('./types').Strategy.<any>}
 */
ClassifierStrategyFactory.create = (strategy) => {
    switch (strategy) {
        case 'top-n': return TopNStrategy
        case 'threshold': return ThresholdStrategy
        case 'top-percent': return TopPercentStrategy
        default:
            throw new Error('Unknown strategy')
    }
}


module.exports = {
    ClassifierStrategyFactory
}

