const { validate } = require('@/validators')
const { VerifyEmailSchema, VerifyOtpSchema } = require('@/validators/accounts')
const apiUtils = require('../apiUtils')
const { OtpService } = require('@/services/auth/otp')
const mailer = require('@/mailer')
const logger = require('@/logger')
const { defaults } = require('@/settings/settings-keys')
const { auth } = require('@/services/auth')

const publicEmailApi = {}

/** Sends OTP to an email */
publicEmailApi.sendOtp = apiUtils.catchAsync(async (req, res) => {
  const [body, errors] = validate(VerifyEmailSchema, req.body)
  if (errors) {
    return apiUtils.sendApiError(res, 400, errors)
  }
  const otp = await OtpService.generateOtp(body.email)
  mailer.sendTemplatedMail({
    to: body.email,
    template: 'email-verify-otp',
    templateProps: { password: otp.password, expiresIn: `${defaults.OTP_EXPIRY / 60} minutes` }
  }).catch(err => logger.error('Failed to send email verification mail', err))
  return apiUtils.sendApiSuccess(res, { message: "Otp succesfully send to email" })
})

/** Verifies the email with provided otp */
publicEmailApi.verifyEmail = apiUtils.catchAsync(async (req, res) => {
  try {
    const [body, errors] = validate(VerifyOtpSchema, req.body)
    if (errors) {
      return apiUtils.sendApiError(res, 400, errors)
    }
    const response = await auth.createVerifiedSession(res, body.otp, body.email)
    return apiUtils.sendApiSuccess(response, { message: "Otp Verified", verified: true })
  } catch (err) {
    logger.warn(`Something unexpected occured when creating a verfied session. Error: ${err}`)
    return apiUtils.sendApiError(res.clearCookie(auth.__verifiedSessionKey), err.status ?? 500, err)
  }
})

module.exports = publicEmailApi
