const mongoose = require('mongoose');
const {
  Client,
  Collection,
  Guild,
  GuildMember,
  Message,
  Role,
  User,
  ClientOptions
} = require('discord.js');
const MessageEmbed = require('./MessageEmbed');
const Rpg = require('./Rpg');
const helper = require('../util/helper');
const { readdirSync } = require('fs');
const brainfuck = require('brainfuck');
const { defaultSettings, token } = require('../util/config');
const _Guild = require('../models/guild');
const Hate = require('../models/hate');
const Love = require('../models/love');
const Member = require('../models/member');
const Todo = require('../models/todo');

/**
 * Represents a Discord Client.
 * @extends Client
 */
class KyofuClient extends Client {
  /**
   * Initialize the client.
   * @param {object} options The options of the client
   * @param {ClientOptions} options.clientOptions The options of the client
   */
  constructor(options) {
    super(options.clientOptions || {});

    /**
     * @typedef Command
     * @property {string} name The name of the command
     * @property {string} description The description of the command
     * @property {string} usage The usage of the command
     * @property {string} category The category of the command
     * @property {string[]} aliases The aliases of the command
     * @property {string} img The image of the command
     * @property {any} and I don't know what this is
     * @property {any} andImg I don't know what this is too
     */

    /**
     * All the commands of the bot.
     * @type {Collection<string, Command>}
     */
    this.commands = new Collection();

    /**
     * Helper for some stuff.
     */
    this.helper = helper;

    /**
     * Methods about RPG.
     */
    this.rpg = new Rpg(this);
  }

  /**
   * Interprets a brainfuck code.
   * @param {*[]} pointerValues The pointer values
   * @param {string} code The code to read
   */
  bf(pointerValues, code) {
    let util = '++++++++++[';
    pointerValues.forEach((u) => {
      util += `>${'+'.repeat(u / 10)}`;
    });
    util += `${'<'.repeat(pointerValues.length)}-]`;

    brainfuck.exec(`${util}${code}`, (error, output) => {
      if (error) throw error;
      code = output;
    });
    return code;
  }

  /**
   * Load all the commands of the bot.
   */
  loadCommands() {
    const commandsFolder = readdirSync('./commands');

    for (const folder of commandsFolder) {
      const commandFiles = readdirSync(`./commands/${folder}`).filter((file) =>
        file.endsWith('.js')
      );

      for (const file of commandFiles) {
        const command = require(`../commands/${folder}/${file}`);
        this.commands.set(command.name, command);
      }
    }
  }

  /**
   * Load all the events of the bot.
   */
  loadEvents() {
    const eventsFolder = readdirSync('./events');

    for (const folder of eventsFolder) {
      const eventFiles = readdirSync(`./events/${folder}`).filter((file) =>
        file.endsWith('.js')
      );

      for (const file of eventFiles) {
        const event = require(`../events/${folder}/${file}`);
        if (folder === 'client')
          this.on(file.split('.')[0], event.bind(null, this));
      }
    }
  }

  /**
   * Add a new guild to the database.
   * @param {Guild} guild The guild
   * @param {object} options The guild options
   * @param {string} options.prefix The prefix of the guild
   * @param {object} options.leave The leave system on the guild
   * @param {?string} options.leave.channel The id of the leave system channel
   * @param {?string} options.leave.message The leave system message
   * @param {object} options.join The join system on the guild
   * @param {?string} options.join.channel The id of the join system channel
   * @param {?string} options.join.message The join system message
   */
  async createGuild(guild, options) {
    const merged = Object.assign(
      {
        _id: mongoose.Types.ObjectId(),
        guildID: guild.id,
        guildName: guild.name,
      },
      options
    );
    const createGuild = await new _Guild(merged);
    return await createGuild.save();
  }

  /**
   * Add a new level of hate between two users to the database.
   * @param {object} hate The hate level parameters
   * @param {string} hate.users The two users
   * @param {number} hate.level The level of hate
   */
  async createHate(hate) {
    const merged = Object.assign({ _id: mongoose.Types.ObjectId() }, hate);
    const createHate = await new Hate(merged);
    return await createHate.save();
  }

  /**
   * Add a new level of love between two users to the database.
   * @param {object} love The love level parameters
   * @param {string} love.users The two users
   * @param {number} love.level The level of love
   */
  async createLove(love) {
    const merged = Object.assign({ _id: mongoose.Types.ObjectId() }, love);
    const createLove = await new Love(merged);
    return await createLove.save();
  }

  /**
   * Add a new member to the database.
   * @param {GuildMember} member The member
   * @param {Guild} guild The guild where to add the member
   * @param {object} [options] The additional options
   * @param {*[]} [options.warns] The warns of the member on the guild
   */
  async createMember(member, guild, options) {
    const merged = Object.assign(
      {
        _id: mongoose.Types.ObjectId(),
        userID: member.id,
        userName: member.user.username,
        guildID: guild.id,
        guildName: guild.name,
      },
      options
    );
    const createMember = await new Member(merged);
    return await createMember.save();
  }

  /**
   * Create a new todo list for a member.
   * @param {User} user The user
   * @param {object} [options] The additional options
   * @param {*[]} [options.list] The todo list of the user
   */
  async createTodo(user, { list: [] }) {
    const merged = await Object.assign({
      _id: mongoose.Types.ObjectId(),
      userID: user.id,
      userName: user.username,
      list: list,
    });
    const createTodo = await new Todo(merged);
    return await createTodo.save();
  }

  /**
   * Detect a specified member by ID, name or mention in a message.
   * @param {Message} message The message where to find the member
   * @param {*[]|string} args Where to find the specified member potential
   * @returns {?GuildMember} The detected member
   */
  detectMember(message, args) {
    const arg = Array.isArray(args) ? args.join(' ') : args;
    const member =
      message.guild.members.cache.find(
        (m) =>
          m.user.tag.toLowerCase() === arg.toLowerCase() ||
          m.id === arg ||
          [...arg].includes(m.id) ||
          new RegExp(`<@!${m.id}>`).exec(arg) !== null ||
          m.displayName.toLowerCase() === arg.toLowerCase() ||
          m.user.username.toLowerCase() === arg.toLowerCase()
      ) ||
      (!args.length || arg.length < 4
        ? null
        : message.guild.members.cache.find(
            (m) =>
              m.user.username.toLowerCase().startsWith(arg.toLowerCase()) ||
              m.user.username.toLowerCase().includes(arg.toLowerCase()) ||
              m.user.username.toLowerCase().endsWith(arg.toLowerCase()) ||
              m.displayName.toLowerCase().startsWith(arg.toLowerCase()) ||
              m.displayName.toLowerCase().includes(arg.toLowerCase()) ||
              m.displayName.toLowerCase().endsWith(arg.toLowerCase())
          ));
    if (member) return member;
    else return null;
  }

  /**
   * Detect a specified role by ID, name or mention in a message.
   * @param {Message} message The message where to find the role
   * @param {*[]|string} args Where to find the specified role potential
   * @returns {?Role} The detected role
   */
  detectRole(message, args) {
    const arg = Array.isArray(args) ? args.join(' ') : args;
    const role =
      message.guild.roles.cache.find(
        (r) =>
          r.id === arg ||
          [...arg].includes(r.id) ||
          new RegExp(`<@&${r.id}>`).exec(arg) !== null ||
          r.name.toLowerCase() === arg.toLowerCase()
      ) ||
      !args.length ||
      arg.length < 4
        ? null
        : message.guild.roles.cache.find(
            (r) =>
              r.name.toLowerCase().startsWith(arg.toLowerCase()) ||
              r.name.toLowerCase().includes(arg.toLowerCase()) ||
              r.name.toLowerCase().endsWith(arg.toLowerCase())
          );
    if (role) return role;
    else return null;
  }

  /**
   * Detect a specified user by ID, name or mention in a message.
   * @param {*[]|string} args Where to find the specified user potential
   * @returns {?User} The detected user
   */
  detectUser(args) {
    const arg = args instanceof Array ? args.join(' ') : args;

    const user =
      this.users.cache.find(
        (u) =>
          u.tag.toLowerCase() === arg.toLowerCase() ||
          u.id === arg ||
          [...arg].includes(u.id) ||
          new RegExp(`<@!?${u.id}>`).exec(arg) !== null ||
          u.username.toLowerCase() === arg.toLowerCase()
      ) ||
      !args.length ||
      arg.length < 4
        ? null
        : this.users.cache.find(
            (u) =>
              u.username.toLowerCase().startsWith(arg.toLowerCase()) ||
              u.username.toLowerCase().includes(arg.toLowerCase()) ||
              u.username.toLowerCase().endsWith(arg.toLowerCase())
          );
    if (user) return user;
    else return null;
  }

  /**
   * Remove a guild from the database.
   * @param {Guild} guild The guild to remove
   * @returns {Promise<import('mongodb').DeleteResult>} The result of the deletion
   */
  async deleteGuild(guild) {
    if (!this.getGuild(guild)) return;
    return await _Guild.deleteOne({ guildID: guild.id });
  }

  /**
   * Fetch an user (Discord API).
   * @param {string} id The user ID
   * @returns {import('discord-api-types/v9.mjs').default.APIUser} The user data from Discord API
   */
  async fetchUserAPI(id) {
    const fetch = await import('node-fetch');
    const response = await fetch(`https://discord.com/api/users/${id}`, {
      headers: {
        Authorization: `Bot ${token}`,
      },
    });
    if (!response.ok) throw new Error(`Error status code: ${response.status}`);
    return response.json();
  }

  /**
   * Find a guild in the database.
   * @param {Guild} guild The guild to find
   */
  async getGuild(guild) {
    try {
      const data = await _Guild.findOne({ guildID: guild.id });
      if (data) return data;
      else return defaultSettings;
    } catch {
      return defaultSettings;
    }
  }

  /**
   * @typedef {object} HateLevel
   * @property {string} users The users to find
   * @property {string} level The hate level
   */

  /**
   * Find a hate level between two users in the database.
   * @param {string} users The two users
   * @returns {Promise<?HateLevel>} The hate level
   */
  async getHate(users) {
    const data = await Hate.findOne({ users });
    return data;
  }

  /**
   * Find a love level between two users in the database.
   * @param {string} users The two users
   */
  async getLove(users) {
    const data = await Love.findOne({ users: users });
    return data;
  }

  /**
   * Find a member in the database.
   * @param {GuildMember} member The member to find
   * @param {Guild} guild The guild of the member
   */
  async getMember(member, guild) {
    const data = await Member.findOne({ userID: member.id, guildID: guild.id });
    return data;
  }

  /**
   * Choose an aleatory number between 0 and max.
   * @param {number} max The max number
   * @returns {number}
   */
  getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
  }

  /**
   * Choose an aleatory number between min and max.
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  /**
   * Find an user's todo list in the database.
   * @param {User} user The user whose to find list
   */
  async getTodo(user) {
    const data = await Todo.findOne({ userID: user.id });
    return data;
  }

  /**
   * Transform something with the helper page.
   * @param {string} name The name of the helper element
   * @param {string} target What you want to transform
   */
  _helper(name, target) {
    const pageHelper = this.helper[name];
    for (let i = 0; Object.keys(pageHelper).length > i; i++) {
      if (target.includes(Object.keys(pageHelper)[i]))
        target = target.replace(
          Object.keys(pageHelper)[i],
          Object.values(pageHelper)[i]
        );
    }
    return target;
  }

  /**
   * Log an error in the console and a channel in the developer server.
   * @param {Error | unknown} error The error to display
   */
  logError(error) {
    const errorMessage = `Uh! A${
      this.helper.vowels.includes(error.name[0].toLowerCase()) ? 'n' : ''
    } ${error.name}...\n${error.stack}`;
    console.error(errorMessage);
    if (!errorMessage.includes('Error status code'))
      return this.channels.cache
        .get('854697832979234826')
        .send(errorMessage, { code: 'xl' });
  }

  /**
   * Log the sent messages.
   * @param {Message} message The sent message
   */
  logMessage(message) {
    const msg = message.content || '';
    const attachments = message.attachments.array();

    if (message.channel.type === 'dm') {
      const check = message.author === this.user;
      const user = check ? this.user : message.author;

      const embed = new MessageEmbed()
        .setColor(check ? '9ce9eb' : '000dde')
        .setTitle(
          check
            ? `Message envoyé à ${message.channel.recipient.username} :`
            : ''
        )
        .setAuthor(user.username, user.displayAvatarURL({ dynamic: true }))
        .setDescription(msg)
        .setPotentialImage(
          attachments.length,
          attachments[0] != null ? attachments[0].url : ''
        )
        .setFooter(check ? '' : message.author.id);

      return this.channels.cache.get('752075620636426260').send(embed);
    } else if (message.content && !message.channel.name.includes('logs'))
      return console.log(
        `[#${message.channel.name}] => [${
          message.member ? message.member.displayName : message.author.username
        }] : ${msg}`
      );
  }

  /**
   * Find a member by id in a guild.
   * @param {Message} message The guild where to find the member
   * @param {string} [id] The id of the member
   */
  memberByID(message, id) {
    const member = message.guild.members.cache.get(id || message.author.id);
    return member;
  }

  /**
   * Edit parameters of a guild in the database.
   * @param {Guild} guild The guild to edit
   * @param {object} settings The new value(s) for the guild
   */
  async updateGuild(guild, settings) {
    const data = await this.getGuild(guild);
    for (const key in settings) {
      if (data[key] !== settings[key]) data[key] = settings[key];
    }
    return data.updateOne(settings);
  }

  /**
   * Edit parameters of a member in the database.
   * @param {GuildMember} member The member to edit
   * @param {Guild} guild The guild where edit the member
   * @param {object} settings The new value(s) for the member
   */
  async updateMember(member, guild, settings) {
    const data = await this.getMember(member, guild);
    for (const key in settings) {
      if (data[key] !== settings[key]) data[key] = settings[key];
    }
    return data.updateOne(settings);
  }

  /**
   * Edit an user's todo list in the database.
   * @param {User} user The user whose to edit todo list
   * @param {object} settings The new value to add to the list
   */
  async updateTodo(user, settings) {
    const data = await this.getTodo(user);
    for (const key in settings) {
      if (data[key] !== settings[key]) data[key] = settings[key];
    }
    return data.updateOne(settings);
  }

  /**
   * Send the help page of a command.
   * @param {string} commandName The name of the command
   * @param {Message} message The sent message
   */
  async sendHelpPage(commandName, message) {
    const { commands } = this;

    const settings = await this.getGuild(message.guild);
    const prefix = settings.prefix;

    const command =
      commands.get(commandName) ||
      commands.find((c) => c.aliases && c.aliases.includes(commandName));

    if (!command)
      return message.inlineReply(
        "<:unchecked:860839603098877953> • Cette commande n'existe pas."
      );

    const data = [];

    data.push(
      `__Catégorie__ : **${command.category}**\n\n__Usage__ ${
        command.name === 'help'
          ? '[:](https://cdn.discordapp.com/attachments/752433631255068742/862341002080681984/unknown.png)'
          : ':'
      }\`\`\`${prefix}${command.usage}\`\`\`\n__Utilité__ : ${
        command.description
      }`
    );
    if (command.aliases)
      data.push(`\n__Alias__ : \`${command.aliases.join('`, `')}\``);

    const embed = new MessageEmbed()
      .setColor(message.member.roles.highest.color || '')
      .setTitle(`Commande ${command.name} :`)
      .setDescription(
        '*[] = arguments obligatoires ; <> = arguments facultatifs*\n\n' +
          data.join('\n')
      )
      .setThumbnail(command.img);

    if (command.and) embed.setFooter(command.and);
    if (command.andImg) embed.setImage(command.andImg);

    return message.channel.send({ embeds: [embed] });
  }

  /**
   * Update bot status.
   */
  updateStatus() {
    const { statuses } = this.helper;
    const status = `${defaultSettings.prefix}help ─ ${
      statuses[this.getRandomInt(statuses.length)]
    }`;
    this.user.setPresence({
      activities: [{ name: status, type: 'PLAYING' }],
      status: 'online',
    });
  }
}

module.exports = KyofuClient;
