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

const mongoose = require('mongoose')

const COLLECTION = 'settings'

/**
 * @typedef {object} ISettings
 * @property {Required<string>} name - the setting name
 * @property {Required<any>} value - the setting value
 *
 * @typedef {mongoose.Document & ISettings} Setting
 * @typedef {mongoose.Model<Setting> & typeof statics} SettingModel
 */

/** @type {mongoose.Schema<Setting, SettingModel>} */
const settingSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true }
})

settingSchema.post('save', async function(doc, next) {
  const { emitter } = require('@/emitter')
  emitter.emit('setting:updated', doc)
})

const statics = {}

/**
 * @this {SettingModel}
 * @param {function=} callback
 * @returns {Promise.<Array.<Setting>>}
 */
statics.getSettings = function(callback) {
  const q = Setting.find().select('name value')

  return q.exec(callback)
}

/**
 * @param {string} name
 * @param {function=} callback
 * @return {Promise.<Setting>}
 */
statics.getSettingByName = async function(name, callback) {
  const q = Setting.findOne({ name })
  try {
    const result = await q.exec()
    if (typeof callback === 'function') callback(null, result)

    return result
  } catch (e) {
    if (typeof callback === 'function') callback(e)

    throw e
  }
}

/**
  * Finds the provided setting keys and returns as an object with
  * keys as the name of the setting and value of the key as the setting value
  *
  * @param {string | Array.<string>} names The setting keys to select
  * @returns {Promise.<Object.<string, any>>} The setting object
  */
statics.getSettingsObjectByName = async (names) => {
  /** @type {Array.<Setting>} */
  const settings = await Setting.find({ name: names }).exec()
  if (!settings) {
    return {}
  }

  /** @type {Object.<string, any>} */
  const obj = {}
  settings.forEach(item => obj[item.name.replace(/:/g, '_')] = item.value)
  return obj
}

/**
 * @param {string | string[]} names
 * @param {function=} callback
 * @returns {Promise.<Array.<Setting>>}
 */
statics.getSettingsByName = async function(names, callback) {
  try {
    const q = Setting.find({ name: names })
    const result = await q.exec()
    if (typeof callback === 'function') callback(null, result)

    return result
  } catch (e) {
    if (typeof callback === 'function') callback(e)

    throw e
  }
}

statics.getSetting = statics.getSettingByName

settingSchema.statics = statics

/** @type {SettingModel} */
const Setting = mongoose.model(COLLECTION, settingSchema)
module.exports = Setting
