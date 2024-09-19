/*
 *       .                             .o8                     oooo
 *    .o8                             "888                     `888
 *  .o888oo oooo d8b oooo  oooo   .oooo888   .ooooo.   .oooo.o  888  oooo
 *    888   `888""8P `888  `888  d88' `888  d88' `88b d88(  "8  888 .8P'
 *    888    888      888   888  888   888  888ooo888 `"Y88b.   888888.
 *    888 .  888      888   888  888   888  888    .o o.  )88b  888 `88b.
 *    "888" d888b     `V88V"V8P' `Y8bod88P" `Y8bod8P' 8""888P' o888o o888o
 *  ========================================================================
 *  Author:     Chris Brame
 *  Updated:    1/20/19 4:43 PM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

const nodeMailer = require('nodemailer')
const Email = require('email-templates')

const { resolve } = require('path')
const Setting = require('../models/setting')
const {
  MAILER_ENABLE,
  MAILER_HOST,
  MAILER_SSL,
  MAILER_PORT,
  MAILER_USERNAME,
  MAILER_PASSWORD,
  MAILER_FROM,
} = require('@/settings/settings-keys')
const logger = require('@/logger')
const { emitter, events } = require('@/emitter')

/**
 * @typedef {object} TemplatedMail
 * @prop {string} template
 * @prop {any} templateProps
 * @prop {string} to
 * @prop {string} subject
 *
 * @typedef {object} Mail
 * @prop {string} to
 * @prop {string} subject
 * @prop {string} body
 *
 * @typedef {object} MailerSettings
 * @prop {boolean} enabled
 * @prop {boolean} from
 * @prop {import('nodemailer').Transporter=} transport
 */
const mailer = {}

/** @type {MailerSettings=} */
mailer.__settings = undefined
mailer.__renderer = new Email({
  views: {
    root: resolve(__dirname, 'templates'),
    options: {
      extension: 'handlebars'
    }
  }
})

/** @type {Array.<string>} */
const KEYS = [
  MAILER_ENABLE,
  MAILER_HOST,
  MAILER_SSL,
  MAILER_PORT,
  MAILER_USERNAME,
  MAILER_PASSWORD,
  MAILER_FROM,
]

emitter.on(events.SETTINGS_UPDATED, (/** @type {import('@/models/setting').Setting} */ setting) => {
  if (!KEYS.includes(setting.name)) {
    return
  }
  mailer.__settings = undefined
})


/** 
 * Returns config for mailer
 * @returns {Promise.<MailerSettings>}
 */
async function getConfig() {
  if (mailer.__settings !== undefined) {
    return mailer.__settings
  }
  const settings = await Setting.getSettingsObjectByName(KEYS)

  /** @type {import('nodemailer/lib/smtp-transport').Options} */
  const transport = {
    host: settings.mailer_host ?? '127.0.0.1',
    port: settings.mailer_port ?? 25,
    secure: settings.mailer_ssl ?? false,
    tls: {
      rejectUnauthorized: false
    },
    from: settings.mailer_from
  }

  if (settings.mailer_username && settings.mailer_password) {
    transport.auth = {
      user: settings.mailer_username,
      pass: settings.mailer_password ?? '',
    }
  }

  mailer.__settings = {
    enabled: settings.mailer_enable,
    from: settings.mailer_from,
    transport: nodeMailer.createTransport(transport)
  }
  return mailer.__settings
}

/**
 * Sends email with templates defined in src/mailer/templates
 *
 * @param {TemplatedMail} mail
 * @returns {Promise.<void>}
 */
mailer.sendTemplatedMail = async (mail) => {
  const settings = await getConfig()
  if (!settings.enabled) {
    return
  }

  const html = await mailer.__renderer.render(mail.template, mail.templateProps)
  return new Promise((res, rej) => settings.transport?.sendMail(
    { to: mail.to, subject: mail.subject, html },
    (err, info) => {
      logger.debug(`email to ${mail.to} info : ${JSON.stringify(info)}`)
      if (err) {
        logger.error('Failed to send email', err)
        return rej(err)
      }
      return res()
    }
  ))
}

/** 
  * Sends an email.
  *
  * @param {import('nodemailer').SendMailOptions} data
  * @param {function(any=): void} callback
  */
mailer.sendMail = function(data, callback) {
  getConfig().then(config => {
    if (!config.enabled) {
      // Mail Disabled
      return callback('Mail Disabled')
    }
    if (!config.from) {
      return callback('No From Address Set.')
    }
    config.transport?.sendMail(data, callback)
  }).catch(err => callback(err))

}

/** 
  * Tests if the email server is reachable
  *
  * @param {function(any=): void} callback
  */
mailer.verify = function(callback) {
  getConfig().then(config => {
    if (!config.enabled) {
      return callback({ code: 'Mail Disabled' })
    }
    config.transport?.verify(function(err) {
      if (err) {
        return callback(err)
      }
      return callback()
    })

  }).catch(callback)
}


module.exports = mailer
