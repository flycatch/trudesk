const apiUtils = require('@/controllers/api/apiUtils')
const { catchAsync } = require('@/controllers/api/apiUtils')
const logger = require('@/logger')
const Faq = require('@/models/faq')
const { validate, validateObjectId } = require('@/validators')
const { FaqCreateSchema, FaqUpdateSchema } = require('@/validators/faq')


/**
 * @typedef {Object} FaqDeleteParams
 * @prop {string} id
 *
 * @typedef {import('express').Request<FaqDeleteParams>} FaqDeleteRequest
 *
 * @typedef {object} FaqCreateBody
 * @prop {string} question
 * @prop {string} answer
 *
 * @typedef {import('express').Request<any, any, FaqCreateBody>} FaqCreateRequest
 *
 * @typedef {Object} FaqUpdateParams
 * @prop {string} id
 *
 * @typedef {object} FaqUpdateBody
 * @prop {string} question
 * @prop {string} answer
 *
 * @typedef {import('express').Request<FaqUpdateParams, any, FaqUpdateBody>} FaqUpdateRequest 
*/

const api = {}

api.findAll = catchAsync(async (_, res) => {
  const faqs = await Faq.getAll()
  return apiUtils.sendApiSuccess(res, { data: faqs })
})

api.create = catchAsync(async (/** @type {FaqCreateRequest} */req, res) => {
  const [body, errors] = validate(FaqCreateSchema, req.body)
  if (errors) {
    logger.error(errors)
    return apiUtils.sendApiError(res, 400, errors)
  }

  const faq = await Faq.build({
    question: body.question,
    answer: body.answer
  }).save()
  return apiUtils.sendApiSuccess(res, { data: faq })
})

api.delete = catchAsync(async (/** @type {FaqDeleteRequest} */req, res) => {
  const [id, errors] = validateObjectId(req.params.id)
  if (errors) {
    logger.error(errors)
    return apiUtils.sendApiError(res, 400, errors)
  }
  await Faq.deleteFaq(id)
  return apiUtils.sendApiSuccess(res)
})

api.update = catchAsync(async (/** @type {FaqUpdateRequest} */req, res) => {
  const [id, errors] = validateObjectId(req.params.id)
  if (errors) {
    logger.error(errors)
    return apiUtils.sendApiError(res, 400, errors)
  }

  const [body, bodyErrors] = validate(FaqUpdateSchema, req.body)
  if (bodyErrors) {
    logger.error(bodyErrors)
    return apiUtils.sendApiError(res, 400, bodyErrors)
  }

  let faq = await Faq.getFaqById(id)
  if (!faq) {
    return apiUtils.sendApiError(res, 400, "Unable to find FAQ. Aboarting...")
  }
  faq.question = body.question
  faq.answer = body.answer
  faq = await faq.save()

  return apiUtils.sendApiSuccess(res, { data: faq })
})

module.exports = api
