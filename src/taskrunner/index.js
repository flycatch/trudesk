/*
      .                              .o8                     oooo
   .o8                             "888                     `888
 .o888oo oooo d8b oooo  oooo   .oooo888   .ooooo.   .oooo.o  888  oooo
   888   `888""8P `888  `888  d88' `888  d88' `88b d88(  "8  888 .8P'
   888    888      888   888  888   888  888ooo888 `"Y88b.   888888.
   888 .  888      888   888  888   888  888    .o o.  )88b  888 `88b.
   "888" d888b     `V88V"V8P' `Y8bod88P" `Y8bod8P' 8""888P' o888o o888o
 ========================================================================
*/

const _ = require('lodash')
const { CronJob } = require('cron')
const async = require('async')
const request = require('request')
const ticketSchema = require('../models/ticket')
const userSchema = require('../models/user')
const groupSchema = require('../models/group')
const conversationSchema = require('../models/chat/conversation')
const settingSchema = require('../models/setting')
const logger = require('@/logger')
const { AutotaggerJob } = require('@/taskrunner/autotagger-job')

/**
 * @typedef {object} Task
 * @property {string} name
 * @property {boolean | function():Promise.<boolean>} enable
 * @property {function():Promise.<void>} task
 */

const taskRunner = {}

/** @type {Object.<string, import('cron').CronJob>} */
const jobs = {}

taskRunner.init = function(callback) {
  // taskRunner.sendStats(function (err) {
  //   if (!err) setInterval(taskRunner.sendStats, 86400000) // 24 hours
  // })

  taskRunner.registerCronJob('*/5 * * * *', AutotaggerJob)

  return callback()
}

taskRunner.sendStats = function (callback) {
  settingSchema.getSettingsByName(['gen:installid', 'gen:version', 'gen:siteurl'], function (err, settings) {
    if (err) return callback(err)
    if (!settings || settings.length < 1) return callback()

    let versionSetting = _.find(settings, function (x) {
      return x.name === 'gen:version'
    })
    const installIdSetting = _.find(settings, function (x) {
      return x.name === 'gen:installid'
    })

    let hostnameSetting = _.find(settings, function (x) {
      return x.name === 'gen:siteurl'
    })

    if (!installIdSetting) return callback()

    versionSetting = _.isUndefined(versionSetting) ? { value: '--' } : versionSetting

    hostnameSetting = _.isUndefined(hostnameSetting) ? { value: '--' } : hostnameSetting

    const result = {
      ticketCount: 0,
      agentCount: 0,
      customerGroupCount: 0,
      conversationCount: 0
    }

    async.parallel(
      [
        function (done) {
          ticketSchema.countDocuments({ deleted: false }, function (err, count) {
            if (err) return done(err)

            result.ticketCount = count
            return done()
          })
        },
        function (done) {
          userSchema.getAgents({}, function (err, agents) {
            if (err) return done(err)

            if (!agents) return done()
            result.agentCount = agents.length

            return done()
          })
        },
        function (done) {
          groupSchema.countDocuments({}, function (err, count) {
            if (err) return done(err)

            result.customerGroupCount = count

            return done()
          })
        },
        function (done) {
          conversationSchema.countDocuments({}, function (err, count) {
            if (err) return done(err)

            result.conversationCount = count

            return done()
          })
        }
      ],
      function (err) {
        // if (typeof callback === 'function') return callback()
        // return
        if (err) return callback()
        request(
          'https://stats.trudesk.app/api/v1/installation',
          {
            method: 'POST',
            json: true,
            body: {
              statsKey: 'trudesk',
              id: installIdSetting.value,
              version: versionSetting.value,
              hostname: hostnameSetting.value,
              ticketCount: result.ticketCount,
              agentCount: result.agentCount,
              customerGroupCount: result.customerGroupCount,
              conversationCount: result.conversationCount
            }
          },
          callback
        )
      }
    )
  })
}

/**
 * Resgisters a cron job and starts it if its enabled
 *
 * @param {string} pattern
 * @param {Task} task
 */
taskRunner.registerCronJob = function(pattern, task) {
  const name = task.name
  logger.info(`registering job [${name}]`)
  if (jobs[name]) {
    logger.warn(`job [${name}] is already registered. Ignoring register request`)
    return
  }
  try {
    jobs[name] = CronJob.from({
      cronTime: pattern,
      onTick: () => {
        task.task().catch(e => logger.error(`failed to run job [${name}]. Next run will be at ${jobs[name].nextDate().toUTC()}`, e))
      },
      start: false,
      timeZone: 'UTC'
    })
    taskRunner.startCronJob(task)
  } catch (e) {
    logger.error(`failed to register job [${name}]`, e)
  }
}

/**
 * Starts the task if it is enabled
 * @param {Task} task 
 */
taskRunner.startCronJob = function(task) {
  const name = task.name
  logger.info(`starting job [${name}]`)
  if (!jobs[name]) {
    logger.warn(`job [${name}] does not exists`)
    return
  }

  if (jobs[name].running) {
    logger.warn(`job [${name}] is already running`)
    return
  }

  function start_job(/** @type {boolean} */enable) {
      if (!enable) {
        logger.warn(`job [${name}] is disabled. ignoring start request`)
        return
      }
      jobs[name].start()
      logger.info(`job [${name}] started. First execution at ${jobs[name].nextDate().toJSDate()}`)
  }


  if (typeof task.enable === 'function') {
    task.enable()
      .then(start_job)
      .catch(e => logger.error(`failed to start job [${name}]`, e))
    return
  }

  try {
    start_job(task.enable)
  } catch (e) {
    logger.error(`failed to start job [${name}]`, e)
  }
}

/**
 * Stops the task if its already running
 * @param {Task} task 
 */
taskRunner.stopCronJob = function(task) {
  const name = task.name
  logger.info(`stopping job [${name}].`)
  if (!jobs[name]) {
    logger.warn(`job [${name}] does not exists`)
    return
  }
  const job = jobs[name]
  if (!job.running) {
    logger.warn(`job [${name}] is already stopped. Removing from memmory`)
    return
  }
  job.stop()
  logger.info(`job [${name}] stopped. Last execution was ${job.lastDate()}`)
}

module.exports = taskRunner
