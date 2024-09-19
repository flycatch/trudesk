
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

module.exports = { OtpError }
