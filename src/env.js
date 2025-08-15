import 'dotenv/config';

export const env = {
  BOT_TOKEN: process.env.BOT_TOKEN,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,

  SYSTEM_PROMPT: process.env.SYSTEM_PROMPT || 'Jawab singkat, jelas, dan dalam bahasa Indonesia bila user berbahasa Indonesia.',
  MAX_HISTORY: Number(process.env.MAX_HISTORY || '6'),
  TYPING_ACTION: process.env.TYPING_ACTION || 'typing',

  GEMINI_PRIMARY_MODEL: process.env.GEMINI_PRIMARY_MODEL || 'gemini-1.5-flash',
  GEMINI_FALLBACK_MODEL: process.env.GEMINI_FALLBACK_MODEL || 'gemini-1.5-flash-8b',

  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
  OPENROUTER_FALLBACK_MODEL: process.env.OPENROUTER_FALLBACK_MODEL || 'deepseek/deepseek-chat:free',

  PRAYER_LAT: parseFloat(process.env.PRAYER_LAT || '-6.2000'),
  PRAYER_LNG: parseFloat(process.env.PRAYER_LNG || '106.8167'),
  PRAYER_TZ: process.env.PRAYER_TZ || 'Asia/Jakarta',
  PRAYER_METHOD: process.env.PRAYER_METHOD || 'MWL',
  PRAYER_MADHAB: process.env.PRAYER_MADHAB || 'Shafi'
};
