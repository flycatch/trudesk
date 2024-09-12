const Joi = require("joi");

const SearchRequest = Joi.object({
  limit: Joi.number().default(20).min(1).max(50).required(),
  query: Joi.string().max(500, 'utf-8').required(),
}).required()

module.exports = {
  SearchRequest
}
