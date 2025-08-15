import 'dotenv/config';
import { Telegraf, session } from 'telegraf';
import OpenAI from 'openai';

const {
  BOT_TOKEN,
  OPENAI_API_KEY,
  SYSTEM_PROMPT = 'Jawab singkat, jelas, dan dalam bahasa Indonesia bila user berbahasa Indonesia.',
  MAX_HISTORY = '6' // jumlah pesan history per chat (user+assistant)
} = process.env;

if (!BOT_TOKEN) {
  console.error('Missing BOT_TOKEN');
  process.exit(1);
}
if (!OPENAI_API_KEY) {
  console.error('Missing OPENAI_API_KEY');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
bot.use(session());
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// util simpan riwayat obrolan singkat per chat
function ensureSession(ctx) {
  if (!ctx.session) ctx.session = {};
  if (!ctx.session.history) ctx.session.history = [];
}

bot.start(async (ctx) => {
  await ctx.reply(
    'Hai! Aku bot OpenAI 🤖\n' +
    'Kirim pertanyaan apa pun.\n' +
    'Perintah: /help /reset'
  );
});

bot.help(async (ctx) => {
  await ctx.reply(
    'Perintah:\n' +
    '/help - Bantuan\n' +
    '/reset - Hapus konteks percakapan\n\n' +
    'Tips: kirim teks biasa, aku akan jawab pakai OpenAI.'
  );
});

bot.command('reset', async (ctx) => {
  ensureSession(ctx);
  ctx.session.history = [];
  await ctx.reply('Konteks direset ✅');
});

bot.on('text', async (ctx) => {
  ensureSession(ctx);
  const userText = ctx.message.text?.trim();
  if (!userText) return;

  // tampilkan "typing…" di Telegram
  await ctx.sendChatAction('typing');

  try {
    // bangun messages untuk OpenAI (batasi history agar hemat token)
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...ctx.session.history.slice(-Number(MAX_HISTORY)),
      { role: 'user', content: userText }
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      // batasi token agar biaya terkontrol
      max_tokens: 500
    });

    const answer = completion.choices?.[0]?.message?.content?.trim()
      || 'Maaf, tidak ada jawaban.';

    // simpan ke history
    ctx.session.history.push({ role: 'user', content: userText });
    ctx.session.history.push({ role: 'assistant', content: answer });

    await ctx.reply(answer, { reply_to_message_id: ctx.message.message_id });
  } catch (err) {
    console.error('OpenAI error:', err?.response?.data || err);
    await ctx.reply('⚠️ Terjadi error saat menghubungi OpenAI. Coba lagi ya.');
  }
});

// Jalankan long polling (cukup untuk Railway)
bot.launch().then(() => {
  console.log('Bot started (polling)');
});

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
