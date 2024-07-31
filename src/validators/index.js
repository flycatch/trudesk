const joi = require('joi')
const mongoose = require('mongoose')

/** @type {import("joi").ValidationOptions} */
const VALIDATION_OPTIONS = {
  debug: false,
  cache: false,
  convert: true,
  abortEarly: false,
  allowUnknown: false,
  stripUnknown: true,
}

const ObjectIdSchema = joi.string().required().custom((value, helper) => {
  if (mongoose.Types.ObjectId.isValid(value)) {
    return helper.message("Invalid id")
  }
  return value
}, "ObjectId validator")

/**
 * @template T
 * @typedef {[T, Array.<string> | undefined]} ValidationResult<E>
 */

/**
 * Validates the provided value as a mongodb id
 *
 * @template T
 * @param {T} id - The value to be validated
 * 
 * @returns {ValidationResult<T>}
 */
const validateObjectId = (id) => {
  return validate(ObjectIdSchema, id)
}


/**
 * A function that validates anything with the provided Joi Schema.
 *
 * @template T
 * @param {T} obj - The value to validate.
 * @param {import("joi").AnySchema} schema - The joi validation schema.
 * 
 * @returns {ValidationResult<T>} An array containing validated result and errors
 */
const validate = function(schema, obj) {
  const validationResult = schema.validate(obj, VALIDATION_OPTIONS)

  let errors;

  if (validationResult.error) {
    // handle errors
    errors = errors || []

    validationResult
      .error
      .details
      .forEach(detail => errors.push(detail.message))
  }

  if (validationResult.warning) {
    // handle warnings
    errors = errors || []
    validationResult
      .warning
      .details
      .forEach(detail => errors.push(detail.message))
  }

  if (errors && errors.length > 0) {
    return [undefined, errors]
  }

  return [obj, undefined]

}

module.exports = {
  validate,
  validateObjectId,
  ObjectIdSchema,
}
