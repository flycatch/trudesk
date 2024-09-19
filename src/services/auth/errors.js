
/**
  * 
  * @class OtpError
  * @extends Error
  * @constructor
  */
class OtpError extends Error {
  /**
   * @param {string} message [TODO:parameter]
   * @param {number} status [TODO:parameter]
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
