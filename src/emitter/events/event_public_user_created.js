/**
 * Event fired when a user is created during public ticket creation
 *
 * @typedef {object} PublicUserCreatedEvent
 * @prop {import('../../models/user').User} user
 * @prop {string} plainTextPass
 */

const path = require('path')
const Email = require('email-templates')
const { head, filter } = require('lodash')

const logger = require('@/logger')
const Template = require('@/models/template')
const Mailer = require('@/mailer')
const { Setting } = require('@/models')


const templateDir = path.resolve(__dirname, '../..', 'mailer', 'templates')

/**
 * @param {PublicUserCreatedEvent} event
 * @param {Array.<string> | string | undefined} emails
 * @param {string} baseUrl
 * @param {boolean} betaEnabled
 */
const sendMail = async (event, emails, baseUrl, betaEnabled) => {
  if (!emails || emails.length < 1) {
    logger.warn('[PublicUserCreateEvent::SendMail] - No recipients defined for sendMail')
    return
  }

  let email = null

  // if (betaEnabled) {
  //   email = new Email({
  //     render: async (view, locals) => {
  //       if (!global.Handlebars) {
  //         throw new Error('Could not load global.Handlebars')
  //       }
  //       const template = await Template.findOne({ name: view })
  //       if (!template) {
  //         throw new Error('Invalid Template')
  //       }
  //       const html = global.Handlebars.compile(template.data['gjs-fullHtml'])(locals)
  //       return await email.juiceResources(html)
  //     }
  //   })
  // } else {
    email = new Email({
      views: {
        root: templateDir,
        options: {
          extension: 'handlebars'
        }
      }
    })
  // }

  const template = await Template.findOne({ name: 'public-account-created' })
  if (template) {
    const context = { base_url: baseUrl, username: event.user.email, plainTextPassword: event.plainTextPass }

    const html = await email.render('public-account-created', context)
    const subjectParsed = global.Handlebars.compile(template.subject)(context)
    const mailOptions = {
      to: typeof emails === 'string' ? emails : emails.join(),
      subject: subjectParsed,
      html,
      generateTextFromHTML: true
    }

    Mailer.sendMail(mailOptions, function (err) {
      if (err) {
        logger.error(err)
        throw err
      }
      logger.debug(`Sent [${emails.length}] emails.`)
    })
  }
}



/**
 * @param {PublicUserCreatedEvent} event
 */
module.exports = async (event) => {
  const settings = await Setting.getSettingsByName(['gen:siteurl', 'mailer:enable', 'beta:email'])


  const baseUrl = head(filter(settings, ['name', 'gen:siteurl'])).value
  let mailerEnabled = head(filter(settings, ['name', 'mailer:enable']))
  mailerEnabled = !mailerEnabled ? false : mailerEnabled.value
  let betaEnabled = head(filter(settings, ['name', 'beta:email']))
  betaEnabled = !betaEnabled ? false : betaEnabled.value

  if (!mailerEnabled) {
    return
  }
  await sendMail(event, event.user.email, baseUrl, betaEnabled)

}
