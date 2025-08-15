import { env } from './env.js';

export function validateConfig() {
  if (!env.BOT_TOKEN) {
    console.error('Missing BOT_TOKEN');
    process.exit(1);
  }
  if (!env.GEMINI_API_KEY) {
    console.error('Missing GEMINI_API_KEY');
    process.exit(1);
  }
}
