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

const _ = require('lodash')
const xss = require('xss')
const fs = require('fs')
const winston = require('../../logger')
const piexifjs = require('piexifjs')
const { setTimeout } = require('timers/promises')

const MAX_FIELD_TEXT_LENGTH = 255
const MAX_SHORT_FIELD_TEXT_LENGTH = 25
const MAX_EXTREME_TEXT_LENGTH = 2000

module.exports.applyMaxTextLength = function (text) {
  return text.toString().substring(0, MAX_FIELD_TEXT_LENGTH)
}

module.exports.applyMaxShortTextLength = function (text) {
  return text.toString().substring(0, MAX_SHORT_FIELD_TEXT_LENGTH)
}

module.exports.applyExtremeTextLength = function (text) {
  return text.toString().substring(0, MAX_EXTREME_TEXT_LENGTH)
}

module.exports.sanitizeFieldPlainText = function (text) {
  return xss(text, {
    whileList: {},
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script']
  })
}

module.exports.stripExifData = function (path) {
  try {
    const imgData = fs.readFileSync(path).toString('binary')
    const newImgData = piexifjs.remove(imgData)
    fs.writeFileSync(path, newImgData, 'binary')
  } catch (e) {
    winston.warn(e)
  }
}

module.exports.sendToSelf = function (socket, method, data) {
  socket.emit(method, data)
}

module.exports._sendToSelf = function (io, socketId, method, data) {
  _.each(io.sockets.sockets, function (socket) {
    if (socket.id === socketId) {
      socket.emit(method, data)
    }
  })
}

module.exports.sendToAllConnectedClients = function (io, method, data) {
  io.sockets.emit(method, data)
}

module.exports.sendToAllClientsInRoom = function (io, room, method, data) {
  io.sockets.in(room).emit(method, data)
}

module.exports.sendToUser = function (socketList, userList, username, method, data) {
  let userOnline = null
  _.forEach(userList, function (v, k) {
    if (k.toLowerCase() === username.toLowerCase()) {
      userOnline = v
      return true
    }
  })

  if (_.isNull(userOnline)) return true

  _.forEach(userOnline.sockets, function (socket) {
    const o = _.findKey(socketList, { id: socket })
    const i = socketList[o]
    if (_.isUndefined(i)) return true
    i.emit(method, data)
  })
}

module.exports.sendToAllExcept = function (io, exceptSocketId, method, data) {
  _.each(io.sockets.sockets, function (socket) {
    if (socket.id !== exceptSocketId) {
      socket.emit(method, data)
    }
  })
}

module.exports.disconnectAllClients = function (io) {
  Object.keys(io.sockets.sockets).forEach(function (sock) {
    io.sockets.sockets[sock].disconnect(true)
  })
}


/**
 * @typedef {object} RetryOptions
 * @property {number=} maxRetries
 * @property {number=} initialDelay
 * @property {number=} expoentialBase
 * @property {boolean=} jitter
 * @property {Array.<number>=} retryOn - The status codes on which the request should be retried
 */

/** 
 * Adds expoential Retry to Axios instance using interceptors.
 *
 * @param {import('axios').AxiosInstance} instance The axios instance to apply retry
 * @param {RetryOptions=} options - The retry options
 * The default options are:
 *  - maxRetries: 10 - The max amount retries after which the request fails
 *  - initialDelay: 0.5s - the initial delay before the first retry request
 *  - expoentialBase: 1.5 - the exponential base for calculating delays
 *  - jitter: true - weather or not to apply random delay to calculated seconds
 *  - retryOn : 408, 425, 429, 500, 502, 503, 504 - The status codes on which the request should be retried
 * @returns {void}
 * */
module.exports.exponentialRetry = (instance, options = {}) => {
  const {
    jitter = true,
    expoentialBase = 1.5,
    initialDelay = 0.5,
    maxRetries = 10,
    retryOn = [408, 425, 429, 500, 502, 503, 504],
  } = options

  instance.interceptors.response.use(undefined, async (/** @type {import('axios').AxiosError} */ error) => {
    /** @type {{ num_retries?: number; delay?: number; } & import('axios').AxiosRequestConfig} */
    const config = error.config
    const response = error.response
    if (response && !retryOn.includes(response.status)) {
      return Promise.reject(error)
    }
    if (!config.num_retries) {
      config.num_retries = 1
    }
    if (!config.delay) {
      config.delay = initialDelay
    }
    if (config.num_retries > maxRetries) {
      winston.error("Max retries exeeded")
      return Promise.reject(error)
    }

    let finalWaitTime = config.delay
    if (jitter) {
      const jitterFactor = Math.min(config.delay / 2, 1)
      finalWaitTime += jitterFactor * -1 + 2 * jitterFactor * Math.random()
    }
    await setTimeout(finalWaitTime * 1000)
    config.num_retries++
    config.delay *= expoentialBase
    return instance(error.config)
  })
}

