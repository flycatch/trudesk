const { HighScoreStrategy } = require("@/services/autotagger/strategies/highest-score");


const ClassifierStrategyFactory = {}

/** 
 *
 * @param {string} strategy
 * @returns {import('@/services/autotagger/strategies/types').Strategy.<any>}
 */
ClassifierStrategyFactory.create = (strategy) => {
    switch (strategy) {
        case 'highest-score': return HighScoreStrategy
        default:
            throw new Error('Unknown strategy')
    }
}


module.exports = {
    ClassifierStrategyFactory
}

