const logger = require("@/logger")
const { validate } = require("@/validators")
const { SearchRequest } = require("@/validators/search")
const { catchAsync, sendApiError, sendApiSuccess } = require("@/controllers/api/apiUtils")
const { Search } = require("@/services/semantic-search")


/**
  * @typedef {Object.<string, any> & { query: string; limit: number }} SearchQuery
  *
  */

const api = {}

api.search = catchAsync(async (req, res) => {
  const [query, errors] = validate(SearchRequest, /** @type {SearchQuery} */(req.query))
  if (errors) {
    logger.error(errors)
    return sendApiError(res, 400, errors)
  }
  const results = await Search.search(query.query, query.limit) ?? []
  return sendApiSuccess(res, { results })
})

module.exports = api
