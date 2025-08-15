import 'dotenv/config';
import { Telegraf, session } from 'telegraf';
import { GoogleGenerativeAI } from '@google/generative-ai';

const {
  BOT_TOKEN,
  GEMINI_API_KEY,
  SYSTEM_PROMPT = 'Jawab singkat, jelas, dan dalam bahasa Indonesia bila user berbahasa Indonesia.',
  MAX_HISTORY = '6' // jumlah pesan history (user+assistant) yang disertakan
} = process.env;

if (!BOT_TOKEN) {
  console.error('Missing BOT_TOKEN');
  process.exit(1);
}
if (!GEMINI_API_KEY) {
  console.error('Missing GEMINI_API_KEY');
  process.exit(1);
}

// Model hemat & cepat. Bisa ganti ke "gemini-1.5-pro" bila perlu.
const MODEL_NAME = 'gemini-1.5-flash';

const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

// Gemini client
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// util simpan riwayat obrolan singkat per chat
function ensureSession(ctx) {
  if (!ctx.session) ctx.session = {};
  if (!ctx.session.history) ctx.session.history = [];
}

// Konversi dari history gaya OpenAI {role:'user'|'assistant', content:string}
// ke format Gemini chat history: {role:'user'|'model', parts:[{text:string}]}
function toGeminiHistory(history) {
  return history.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));
}

bot.start(async (ctx) => {
  await ctx.reply(
    'Hai! Aku bot Gemini 🤖\n' +
    'Kirim pertanyaan apa pun.\n' +
    'Perintah: /help /reset'
  );
});

bot.help(async (ctx) => {
  await ctx.reply(
    'Perintah:\n' +
    '/help - Bantuan\n' +
    '/reset - Hapus konteks percakapan\n\n' +
    'Tips: kirim teks biasa, aku akan jawab pakai Gemini.'
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
    // Siapkan model dengan system instruction
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: SYSTEM_PROMPT
    });

    // Ambil history terbatas agar hemat token
    const recent = ctx.session.history.slice(-Number(MAX_HISTORY));
    const geminiHistory = toGeminiHistory(recent);

    // Mulai sesi chat dengan history sebelumnya
    const chat = model.startChat({ history: geminiHistory });

    // Kirim pesan user
    const result = await chat.sendMessage(userText);
    const answer = result.response.text()?.trim() || 'Maaf, tidak ada jawaban.';

    // simpan ke history
    ctx.session.history.push({ role: 'user', content: userText });
    ctx.session.history.push({ role: 'assistant', content: answer });

    await ctx.reply(answer, { reply_to_message_id: ctx.message.message_id });
  } catch (err) {
    console.error('Gemini error:', err);
    await ctx.reply('⚠️ Terjadi error saat menghubungi Gemini. Coba lagi ya.');
  }
});

// Jalankan long polling (cukup untuk Railway)
bot.launch().then(() => {
  console.log('Bot started (polling)');
});

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
