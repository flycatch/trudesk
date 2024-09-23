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

// var _               = require('lodash');
var mongoose = require('mongoose')
require('moment-duration-format')
var utils = require('../helpers/utils')
const _ = require('lodash')

var COLLECTION = 'statuses'

/**
  * @typedef {object} ITicketStatus
  * @prop {string} name
  * @prop {string} htmlColor
  * @prop {number} uid
  * @prop {number} order
  * @prop {boolean} slatimer
  * @prop {boolean} isResolved
  * @prop {boolean} isLocked
  *
  * @typedef {mongoose.Document & ITicketStatus} TicketStatus
  * @typedef {mongoose.Model<TicketStatus> & typeof statics} TicketModel
  */


/** @type {mongoose.Schema<TicketStatus>} */
const statusSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    htmlColor: { type: String, default: '#29b955' },
    uid: { type: Number, unique: true, index: true },
    order: { type: Number, index: true },
    slatimer: { type: Boolean, default: true },
    isResolved: { type: Boolean, default: false },
    isLocked: { type: Boolean, default: false }
  },
  {
    toJSON: {
      virtuals: true
    }
  }
)

statusSchema.pre('save', function (next) {
  this.name = utils.sanitizeFieldPlainText(this.name.trim())

  if (!_.isUndefined(this.uid) || this.uid) {
    return next()
  }

  const c = require('./counters')

  const self = this
  c.increment('status', function (err, res) {
    if (err) return next(err)

    self.uid = res.value.next

    if (_.isUndefined(self.uid)) {
      const error = new Error('Invalid UID.')
      return next(error)
    }

    return next()
  })
})

const statics = {}

statics.getStatus = function (callback) {
  return TicketStatus
    .find({})
    .sort({ order: 1 })
    .exec(callback)
}

/**
  * @param {string} _id
  * @param {function=} callback
  *
  * @returns {Promise.<TicketStatus>}
  * */
statics.getStatusById = function (_id, callback) {
  return TicketStatus
    .findOne({ _id: _id })
    .exec(callback)
}

statics.getStatusByUID = function (uid, callback) {
  return TicketStatus
    .findOne({ uid: uid })
    .exec(callback)
}

statusSchema.statics = statics

/** @type {TicketModel} */
const TicketStatus = mongoose.model(COLLECTION, statusSchema)
module.exports = TicketStatus
