import { Telegraf, session } from 'telegraf';
import { env } from './env.js';

export function createBot() {
  const bot = new Telegraf(env.BOT_TOKEN);
  bot.use(session());
  return bot;
}
