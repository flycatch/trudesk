module.exports = /** @type {const} */ ({
  ES_ENABLE: 'es:enable',
  ES_HOST: 'es:host',
  ES_PORT: 'es:port',

  SEMANTICSEARCH_ENABLE: 'semanticsearch:enable',

  AI_HOST: 'ai:host',
  AI_BASIC_TOKEN: 'ai:basicToken',

  AUTOTAGGER_ENABLE:  'autotagger:enable',
  TAGGER_USE_INFERENCE: 'tagger:inference:enable',
  TAGGER_PREFERENCES: 'tagger:preferences',
  TAGGER_STRATEGY: 'tagger:strategy',
  TAGGER_STRATEGY_OPTIONS: 'tagger:strategy:options',

  OTP_ENABLE: 'otp:enable',
  OTP_LIMIT: 'otp:limit', // The no:of times a user can request for a otp resend. defaults to 3
  OTP_EXPIRY: 'otp:expiry', // The expiry time of an otp. defaults to `600` seconds (10 minutes)
  OTP_RANGE: 'otp:range', // The number range in which otp should be generated. defaults to { min: 100000, max: 999999 }
  OTP_RETRY_AFTER: 'otp:retryAfter', // The time after which a user can retry again if he exausts his/her otp resend limit. defaults to 1 min


  defaults: {
    OTP_LIMIT: 3,
    OTP_EXPIRY: 10 * 60, // 10 minutes
    OTP_RANGE: { min: 100000, max: 999999 }, // 6 digit otp
    OTP_RETRY_AFTER: 5 * 60 // 5 minutes
  }
})
