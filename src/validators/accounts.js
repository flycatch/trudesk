const Joi = require("joi");


const VerifyEmailSchema = Joi.object({
    email: Joi.string().email().required(),
})

module.exports = {
    VerifyEmailSchema
}
