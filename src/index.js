import { validateConfig } from './config.js';
import { createBot } from './bot.js';
import { registerCommands } from './handlers/commands.js';
import { registerChat } from './handlers/chat.js';
import { initAzanScheduler } from './services/azanScheduler.js';

validateConfig();

const bot = createBot();
const subscribers = new Set();

registerCommands(bot, { subscribers });
registerChat(bot);

initAzanScheduler({ bot, subscribers });

bot.launch().then(() => {
  console.log('Bot started (polling)');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
