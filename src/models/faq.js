const mongoose = require("mongoose");

const COLLECTION = 'faq'

/**
* @typedef {object} FAQType
* @property {Required<string>} question - question of an FAQ
* @property {Required<string>} answer - answer of the question
* 
* @typedef {import('mongoose').Document & FAQType} FAQ
* @typedef {import('mongoose').Model<FAQ> & typeof statics} FAQModel
*/


/** @type {mongoose.Schema<FAQ, FAQModel>} */
const FaqSchema = new mongoose.Schema({
    question: { type: String, required: true },
    answer: { type: String, required: true },
})

FaqSchema.pre('save', function (next) {
    this.question = this.question.trim()
    this.answer = this.answer.trim()
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
}

FaqSchema.statics = statics;

/** @type FAQModel */
const Faq = mongoose.model(COLLECTION, FaqSchema)

/** @type {FAQModel} */
module.exports = Faq
