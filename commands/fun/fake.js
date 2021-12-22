const { Message } = require('discord.js');
const Client = require('../../struct/Client');

module.exports = {
  name: 'fake',
  usage: 'fake [membre] [message]',
  description:
    'Génère un webhook similaire à un membre qui enverra le message spécifié.',
  category: 'Fun',
  img: 'https://image.flaticon.com/icons/png/512/1750/1750186.png',

  /**
   * @param {Client} client
   * @param {Message} message
   * @param {string[]} args
   */
  async execute(client, message, args) {
    if (message.channel.type !== 'GUILD_TEXT') return;
    if (!args.length) return client.sendHelpPage(this.name, message);

    const member = client.detectMember(message, args[0]);
    if (!member)
      return message.reply(
        '<:unchecked:860839603098877953> • Membre spécifié invalide.'
      );

    const name = member.displayName || member.user.username;
    const channelWebhooks = await message.channel.fetchWebhooks();

    const webhook = channelWebhooks.find((w) => w.name === name);

    message.delete();
    webhook
      ? webhook.send(args.slice(1).join(' '))
      : (
          await message.channel.createWebhook(name, {
            avatar: member.user.displayAvatarURL({ dynamic: true }),
          })
        ).send(args.slice(1).join(' '));
  },
};
