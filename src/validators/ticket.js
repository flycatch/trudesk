const Joi = require("joi");
const { ObjectIdSchema } = require(".");


const TicketBatchUpdateRequestSchema = Joi.object({
  batch: Joi.array().items({
    id: ObjectIdSchema.required(),
    status: ObjectIdSchema.optional()
  })
})

module.exports = {
  TicketBatchUpdateRequestSchema
}
