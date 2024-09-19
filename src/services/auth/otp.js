const crypto = require('crypto')
const moment = require('moment')
const { Otp, Setting } = require('@/models')
const { OTP_LIMIT, OTP_EXPIRY, OTP_RANGE, defaults, OTP_RETRY_AFTER } = require('@/settings/settings-keys')
const { validate } = require('@/validators')
const { OtpSettingsSchema } = require('@/validators/setting-keys')
const { OtpError } = require('@/services/auth/errors')
const logger = require('@/logger')

const OtpService = {}

/**
  * @param {{min:number, max:number}} range
  * @returns {number}
  */
const generateSecureRandomNumber = (range) => {
  return crypto.randomInt(range.min, range.max)
}

const DEFAULT_SETTINGS = {
  otp_limit: defaults.OTP_LIMIT,
  otp_expiry: defaults.OTP_EXPIRY,
  otp_range: defaults.OTP_RANGE,
  otp_retryAfter: defaults.OTP_RETRY_AFTER
}

const getSettings = async () => {
  const settings = await Setting.getSettingsObjectByName([
    OTP_LIMIT,
    OTP_EXPIRY,
    OTP_RANGE,
    OTP_RETRY_AFTER,
  ])
  settings.otp_limit ??= defaults.OTP_LIMIT
  settings.otp_expiry ??= defaults.OTP_EXPIRY
  settings.otp_range ??= defaults.OTP_RANGE
  settings.otp_retryAfter ??= defaults.OTP_RETRY_AFTER

  const [setting, errors] = validate(OtpSettingsSchema, settings)
  if (errors) {
    logger.warn(`Invalid otp config configured. Errors: ${errors}. Using default settings`)
    return DEFAULT_SETTINGS
  }
  return setting 
}

/**
  * Generates a one time password for an email.
  *
  * @param {string} email - The email for which otp should be generated
  * @throws {OtpError}
  * @returns {Promise.<import('@/models/otp').Otp>}
  */
OtpService.generateOtp = async (email) => {
  let existingOtp = true
  let emailOtp = await Otp.findByEmail(email)
  if (!emailOtp) {
    existingOtp = false
    emailOtp = new Otp({ email })
  }

  const settings = await getSettings()

  if (!existingOtp && emailOtp.retries >= settings.otp_limit) {
    if (moment.utc().diff(emailOtp.updatedAt, 'seconds') < settings.otp_retryAfter) {
      throw new OtpError(`Too many otps requested. Retry after ${settings.otp_retryAfter / 60} minutes`, 429)
    }
    emailOtp.retries = -1
  }

  emailOtp.password = `${generateSecureRandomNumber(settings.otp_range)}`
  emailOtp.retries = existingOtp ? emailOtp.retries + 1 : 0
  emailOtp.email = email
  emailOtp.expiry = moment.utc().add(settings.otp_expiry, 'seconds').toDate()
  return emailOtp.save()
}

module.exports = {
  OtpService
}
