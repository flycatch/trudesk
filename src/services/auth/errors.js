
/**
  * 
  * @class OtpError
  * @extends Error
  * @constructor
  */
class OtpError extends Error {
  /**
   * @param {string} message
   * @param {number} status
   */
  constructor(message, status) {
    super(message)
    /**
      * @type {number}
      * @public
      */
    this.status = status
  }
}

class TooManyOtpRequests extends Error {
  /**
   * @param {number} status
   * @param {number} retryAfter
   * @param {number} remainingRetries
   */
  constructor(status, retryAfter, remainingRetries) {
    super(`Too many otps requested. Retry after ${retryAfter / 60} minutes`)
    this.status = status
    this.retryAfter = retryAfter
    this.remainingRetries = remainingRetries
  }
}

module.exports = { OtpError, TooManyOtpRequests }
