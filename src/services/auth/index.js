const moment = require('moment')
const { OtpService } = require('@/services/auth/otp')
const { OtpError } = require('./errors')
const apiUtils = require('@/controllers/api/apiUtils')
const logger = require('@/logger')

const auth = {}

auth.__verifiedSessionKey = 'verified'
// TODO: maybe make this configurable for admin?
auth.__tempSessionMaxAge = 10 * 60 // 10 minutes

/**
 * Starts an temperory verified session for an email
 *
 * @param {import('express').Response} res
 * @param {string} otp - the one time password send to the email for starting the session
 * @param {string} email - the email for which session should be started
 * @returns {Promise.<import('express').Response>} The response object with session cookies set.
 */
auth.createVerifiedSession = async (res, otp, email) => {
  const verified = await OtpService.verifyOtp(email, otp)
  if (!verified) {
    throw new OtpError('Invalid Otp', 403)
  }
  await OtpService.deleteOtp(email)

  const expiry = moment.utc().add(auth.__verifiedSessionKey, 'seconds').toJSON()

  logger.debug(`A verified session has been created for ${email}`)
  return res.cookie(auth.__verifiedSessionKey, { email, expiry }, {
    secure: global.env === 'production',
    signed: true,
    httpOnly: true,
    maxAge: auth.__tempSessionMaxAge * 1000
  })
}

/**
 * @typedef {object} MiddlewareOptions
 * @prop {boolean} verify 
 *   - whether or not to verify the session cookie.
 *   The session is not verified if its tampered with, expired or missing.
 *   If set to false, session will not be verified, and if a valid session is
 *   present the decoded email is passed to the next handler as req.verifiedEmail field.
 *   Otherwise, invalid session, will return an http error.
 */

// TODO: move this to middleware.js ? 
/**
 * A middleware that checks if the request has the verified status.
 *
 * @param {MiddlewareOptions} options
 * @returns {import('express').RequestHandler} 
 */
auth.verifiedEmail = (options) => (req, res, next) => {
  const info = req.signedCookies[auth.__verifiedSessionKey]
  if (info == undefined || info === false) {
    if (options.verify) {
      return apiUtils.sendApiError(
        res.clearCookie(auth.__verifiedSessionKey),
        403,
        'Email not verified'
      )
    }
    return next()
  }
  if (!info.email || !info.expiry) {
    if (options.verify) {
      return apiUtils.sendApiError(
        res.clearCookie(auth.__verifiedSessionKey),
        500,
        'Invalid request'
      )
    }
    return next()
  }
  const expired = moment.utc().diff(moment(info.expiry), 'seconds', true) >= 0
  if (expired) {
    if (options.verify) {
      return apiUtils.sendApiError(
        res.clearCookie(auth.__verifiedSessionKey),
        403,
        'Email not verified'
      )
    }
    return next()
  }
  req.verifiedEmail = info.email
  next()
}

module.exports = {
  auth
}
