const { PublicQa } = require('@/services/elasticsearch/indices/public-qa');


/** @type {Array.<import('./types').Index>} */
const indices = [
    PublicQa,
]

module.exports = { indices }
