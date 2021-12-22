const { MessageEmbed } = require('discord.js');

/**
 * Represents a MessageEmbed.
 * @extends {MessageEmbed}
 */
class ExtendedMessageEmbed extends MessageEmbed {
  /**
   * Potentially add a field.
   * @param {boolean} condition The condition which determine if field is added
   * @param {string} name The name of the field
   * @param {string} value The value of the string
   * @param {boolean} [inline] If the field is inline
   * @returns {this}
   */
  addPotentialField(condition, name, value, inline = false) {
    if (condition) return super.addField(name, value, inline);
    else return this;
  }

  /**
   * Potentially set an image.
   * @param {boolean} condition The condition which determine if image is set
   * @param {string} url The image url
   * @returns {this}
   */
  setPotentialImage(condition, url) {
    if (condition) return super.setImage(url);
    else return this;
  }
}

module.exports = ExtendedMessageEmbed;
