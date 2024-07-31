const Joi = require('joi')

const FaqCreateSchema = Joi.object({
    question: Joi.string().required().max(1000, 'utf-8'),
    answer: Joi.string().required().max(5000, 'utf-8')
})

const FaqUpdateSchema = Joi.object({
    question: Joi.string().optional().max(1000, 'utf-8'),
    answer: Joi.string().optional().max(5000, 'utf-8')
})

module.exports = {
    FaqCreateSchema,
    FaqUpdateSchema,
}
