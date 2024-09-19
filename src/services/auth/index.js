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


// TODO: move this to middleware.js ? 
/**
 * A middleware that checks if the request has the verified status.
 *
 * @type {import('express').RequestHandler} 
 */
auth.hasVerifiedEmailSession = async (req, res, next) => {
  const info = req.signedCookies[auth.__verifiedSessionKey]
  if (info == undefined || info === false) {
    return apiUtils.sendApiError(
      res.clearCookie(auth.__verifiedSessionKey),
      403,
      'Email not verified'
    )
  }
  if (!info.email || !info.expiry) {
    return apiUtils.sendApiError(
      res.clearCookie(auth.__verifiedSessionKey),
      500,
      'Invalid request'
    )
  }
  const expired = moment.utc().diff(moment(info.expiry), 'seconds', true) >= 0
  if (expired) {
    return apiUtils.sendApiError(
      res.clearCookie(auth.__verifiedSessionKey),
      403,
      'Email not verified'
    )
  }
  req.user = { email: info.email }
  next()
}


module.exports = {
  auth
}
