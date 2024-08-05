/**
 * Event fired when a user is created during public ticket creation
 *
 * @typedef {object} PublicUserCreatedEvent
 * @prop {import('../../models/user').User} user
 * @prop {string} plainTextPass
 */

/**
 * @param {PublicUserCreatedEvent} event
 */
module.exports = async ({ user, plainTextPass }) => {

}
