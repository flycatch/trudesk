const Joi = require("joi");

const OtpRangeSchema = Joi.object({
  min: Joi.number().min(0).required(),
  max: Joi.number().min(1).required()
})


const OtpSettingsSchema = Joi.object({
  otp_limit: Joi.number().required(),
  otp_expiry: Joi.number().required(),
  otp_range: OtpRangeSchema.required(),
  otp_retryAfter: Joi.number().required()
})

module.exports = {
  OtpSettingsSchema
}
