const { Intents } = require('discord.js');
const Client = require('./struct/Client');
const client = new Client({
  clientOptions: {
    intents: [
      Intents.FLAGS.GUILDS,
      Intents.FLAGS.GUILD_MESSAGES,
      Intents.FLAGS.DIRECT_MESSAGES,
    ],
    partials: ['MESSAGE', 'CHANNEL'],
  },
});
const { connect } = require('mongoose');
const { dbconnection, token } = require('./util/config.js');

connect(dbconnection, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('[^^] MongoDB connecté !');
  })
  .catch((error) => {
    client.logError(error);
  });

client.loadCommands();
client.loadEvents();

process.on('uncaughtException', (error) => {
  client.logError(error);
});

process.on('unhandledRejection', (error) => {
  client.logError(error);
});

client.login(token);
