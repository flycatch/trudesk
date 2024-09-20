const Joi = require("joi");


const VerifyEmailSchema = Joi.object({
  email: Joi.string().email().required(),
})

const VerifyOtpSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().required(),
})

module.exports = {
  VerifyEmailSchema,
  VerifyOtpSchema,
}
