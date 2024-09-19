const { default: mongoose } = require("mongoose");

const COLLECTION = "OTP"


/**
  * @typedef {object} IOtp
  * @property {Date} updatedAt - the last time otp was updated
  * @property {string} password - the otp password
  * @property {string} email - the email to verify the otp against
  * @property {Date} expiry - the expiry of the otp
  * @property {number} retries - the no:of times in a verification session that the otp is recreated for the same email
  *
  * @typedef {mongoose.Document & IOtp} Otp
  * @typedef {mongoose.Model<Otp> & typeof statics} OtpModel
  */

/** @type {mongoose.Schema<Otp>} */
const OtpSchema = new mongoose.Schema({
  updatedAt: { type: Date },
  // TODO: should otp be hashed?
  // since its short lived do we even need to hash it?
  password: { type: String, required: true },
  email: { type: String, required: true },
  expiry: { type: Date, required: true },
  retries: { type: 'number', required: true, default: 0 }
}, { timestamps: { updatedAt: 'updatedAt' } })


const statics = {}

/**
 * Find otp based on the password
 *
 * @param {string} password - the password to search for.
 * @returns {Promise.<Otp>} - the otp
 */
statics.findByPassword = async (password) => {
  return Otp.findOne({ otp: password }).exec()
}


/**
  * Get Otp by email.
  *
  * @param {string} email
  * @returns {Promise.<Otp | undefined>}
  */
statics.findByEmail = async (email) => {
  return Otp.findOne({ email }).exec()
}


OtpSchema.statics = statics

/** @type {OtpModel} */
const Otp = mongoose.model(COLLECTION, OtpSchema)

module.exports = Otp
