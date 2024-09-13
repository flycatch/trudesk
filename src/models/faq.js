const { emitter, events } = require("@/emitter");
const logger = require("@/logger");
const mongoose = require("mongoose");

const COLLECTION = 'faq'

/**
* @typedef {object} FAQType
* @property {Required<string>} question - question of an FAQ
* @property {Required<string>} answer - answer of the question
* 
* @typedef {import('mongoose').Document & FAQType} FAQ
* @typedef {import('mongoose').Model<FAQType, {}, {}, any, typeof FaqSchema> & typeof statics} FAQModel
*/


/** @type {mongoose.Schema<FAQ>} */
const FaqSchema = new mongoose.Schema({
    question: { type: String, required: true },
    answer: { type: String, required: true },
})

FaqSchema.pre('save', function (next) {
    this.question = this.question.trim()
    this.answer = this.answer.trim()
    this.wasNew = this.isNew
    next()
})

FaqSchema.post('save', function (doc, next) {
    if (this.wasNew) {
        emitter.emit(events.FAQ_CREATED, doc)
        return next()
    }
    emitter.emit(events.FAQ_UPDATED, doc)
    return next()
})

FaqSchema.pre('deleteOne', { query: true }, async function(next) {
  const id = this.getFilter()["_id"]
  if (id === undefined) {
    try {
      const faq = await Faq.findOne(this.getFilter())
      this.faq = faq
      next()
    } catch (err) {
      next(err)
    }
  }
  this.id = id
  next()
})

FaqSchema.post('deleteOne', { document: true }, function(doc, next) {
    emitter.emit(events.FAQ_DELETED, doc._id)
    next()
})

FaqSchema.post('deleteOne', { query: true }, function(doc, next) {
    const id = this.id ?? this.faq?._id
    if (id === undefined) {
        logger.warn("Not able to determin FAQ id. Deleted FAQ will leave inconsistant elastic search data")
        next()
    }
    emitter.emit(events.FAQ_DELETED, id)
    next()
})

const statics = {
    /**
     * Builds an faq object
     *
     * @param {FAQType} faq - The faq object
     * @returns {FAQ}
     */
    build(faq) {
        return new Faq(faq)
    },


    /**
     * @returns {Promise<FAQ[]>}
     */
    async getAll() {
        return Faq.find()
    },

    /**
    *  Fetches FAQ object by mongoose id
    *
     * @param {string} _id - mongoose object id
     * @returns {Promise<FAQ | undefined>} faq
     */
    async getFaqById(_id) {
        return Faq.findOne({ _id }).exec()
    },

    /**
     * Deletes FAQ by id.
     *
     * Note: The delete of faq should trigger the post delete middleware
     * which requires the id or the document that was deleted
     *
     * @param {string} _id - mongoose object id
     * @returns {Promise.<void>}
     */
    async deleteFaq(_id) {
        await Faq.deleteOne({ _id }).exec()
    }
}

FaqSchema.statics = statics;

/** @type FAQModel */
const Faq = mongoose.model(COLLECTION, FaqSchema)

/** @type {FAQModel} */
module.exports = Faq
