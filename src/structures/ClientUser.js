'use strict';

const User = require('./User');
const RelationshipManager = require('../managers/RelationshipManager');
const DataResolver = require('../util/DataResolver');

/**
 * Represents the logged in client's Discord user.
 * @extends {User}
 */
class ClientUser extends User {
  constructor(client, data) {
    super(client, data);
    this._typing = new Map();

    /**
     * All of the {@link Relationship}s that the client is currently handling, mapped by their IDs
     * @type {RelationshipManager<Snowflake, Relationship>}
     */
    this.relationships = new RelationshipManager(this.client);
  }

  _patch(data) {
    super._patch(data);

    if ('verified' in data) {
      /**
       * Whether or not this account has been verified
       * @type {boolean}
       */
      this.verified = data.verified;
    }

    if ('mfa_enabled' in data) {
      /**
       * If the bot's {@link ClientApplication#owner Owner} has MFA enabled on their account
       * @type {?boolean}
       */
      this.mfaEnabled = typeof data.mfa_enabled === 'boolean' ? data.mfa_enabled : null;
    } else {
      this.mfaEnabled ??= null;
    }

    if ('token' in data) this.client.token = data.token;
  }

  /**
   * Represents the client user's presence
   * @type {ClientPresence}
   * @readonly
   */
  get presence() {
    return this.client.presence;
  }

  /**
   * Data used to edit the logged in client
   * @typedef {Object} ClientUserEditData
   * @property {string} [username] The new username
   * @property {?(BufferResolvable|Base64Resolvable)} [avatar] The new avatar
   */

  /**
   * Edits the logged in client.
   * @param {ClientUserEditData} data The new data
   * @returns {Promise<ClientUser>}
   */
  async edit(data) {
    if (typeof data.avatar !== 'undefined') data.avatar = await DataResolver.resolveImage(data.avatar);
    const newData = await this.client.api.users('@me').patch({ data });
    this.client.token = newData.token;
    const { updated } = this.client.actions.UserUpdate.handle(newData);
    return updated ?? this;
  }

  /**
   * Sets the username of the logged in client.
   * <info>Changing usernames in Discord is heavily rate limited, with only 2 requests
   * every hour. Use this sparingly!</info>
   * @param {string} username The new username
   * @returns {Promise<ClientUser>}
   * @example
   * // Set username
   * client.user.setUsername('discordjs')
   *   .then(user => console.log(`My new username is ${user.username}`))
   *   .catch(console.error);
   */
  setUsername(username) {
    return this.edit({ username });
  }

  /**
   * Sets the avatar of the logged in client.
   * @param {?(BufferResolvable|Base64Resolvable)} avatar The new avatar
   * @returns {Promise<ClientUser>}
   * @example
   * // Set avatar
   * client.user.setAvatar('./avatar.png')
   *   .then(user => console.log(`New avatar set!`))
   *   .catch(console.error);
   */
  setAvatar(avatar) {
    return this.edit({ avatar });
  }

  /**
   * Options for setting activities
   * @typedef {Object} ActivitiesOptions
   * @property {string} [name] Name of the activity
   * @property {ActivityType|number} [type] Type of the activity
   * @property {string} [url] Twitch / YouTube stream URL
   */

  /**
   * Data resembling a raw Discord presence.
   * @typedef {Object} PresenceData
   * @property {PresenceStatusData} [status] Status of the user
   * @property {boolean} [afk] Whether the user is AFK
   * @property {ActivitiesOptions[]} [activities] Activity the user is playing
   * @property {number|number[]} [shardId] Shard id(s) to have the activity set on
   */

  /**
   * Sets the full presence of the client user.
   * @param {PresenceData} data Data for the presence
   * @returns {ClientPresence}
   * @example
   * // Set the client user's presence
   * client.user.setPresence({ activities: [{ name: 'with discord.js' }], status: 'idle' });
   */
  setPresence(data) {
    return this.client.presence.set(data);
  }

  /**
   * A user's status. Must be one of:
   * * `online`
   * * `idle`
   * * `invisible`
   * * `dnd` (do not disturb)
   * @typedef {string} PresenceStatusData
   */

  /**
   * Sets the status of the client user.
   * @param {PresenceStatusData} status Status to change to
   * @param {number|number[]} [shardId] Shard id(s) to have the activity set on
   * @returns {ClientPresence}
   * @example
   * // Set the client user's status
   * client.user.setStatus('idle');
   */
  setStatus(status, shardId) {
    return this.setPresence({ status, shardId });
  }

  /**
   * Options for setting an activity.
   * @typedef {Object} ActivityOptions
   * @property {string} [name] Name of the activity
   * @property {string} [url] Twitch / YouTube stream URL
   * @property {ActivityType|number} [type] Type of the activity
   * @property {number|number[]} [shardId] Shard Id(s) to have the activity set on
   */

  /**
   * Sets the activity the client user is playing.
   * @param {string|ActivityOptions} [name] Activity being played, or options for setting the activity
   * @param {ActivityOptions} [options] Options for setting the activity
   * @returns {ClientPresence}
   * @example
   * // Set the client user's activity
   * client.user.setActivity('discord.js', { type: 'WATCHING' });
   */
  setActivity(name, options = {}) {
    if (!name) return this.setPresence({ activities: [], shardId: options.shardId });

    const activity = Object.assign({}, options, typeof name === 'object' ? name : { name });
    return this.setPresence({ activities: [activity], shardId: activity.shardId });
  }

  /**
   * Sets/removes the AFK flag for the client user.
   * @param {boolean} [afk=true] Whether or not the user is AFK
   * @param {number|number[]} [shardId] Shard Id(s) to have the AFK flag set on
   * @returns {ClientPresence}
   */
  setAFK(afk = true, shardId) {
    return this.setPresence({ afk, shardId });
  }
}

module.exports = ClientUser;
