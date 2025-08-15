import 'dotenv/config';
import { Telegraf, session } from 'telegraf';
import { GoogleGenerativeAI } from '@google/generative-ai';
import cron from 'node-cron';
import { Coordinates, CalculationMethod, Madhab, PrayerTimes } from 'adhan';

// ====== ENV ======
const {
  BOT_TOKEN,
  GEMINI_API_KEY,
  SYSTEM_PROMPT = 'Jawab singkat, jelas, dan dalam bahasa Indonesia bila user berbahasa Indonesia.',
  MAX_HISTORY = '6',
  // typing action Telegram: 'typing', 'upload_photo', 'record_voice', 'upload_video', dst.
  TYPING_ACTION = 'typing',
  // Lokasi & zona waktu untuk waktu salat + penanggalan
  PRAYER_LAT = '-6.2000',        // default Jakarta
  PRAYER_LNG = '106.8167',       // default Jakarta
  PRAYER_TZ  = 'Asia/Jakarta',
  // Metode perhitungan (pilihan umum: MWL, ISNA, UmmAlQura, Egypt, Turkey, Singapore, JAKIM/my, dsb.)
  PRAYER_METHOD = 'MWL',         // Muslim World League (default)
  // Madhab: Shafi (default) atau Hanafi (mempengaruhi Asr)
  PRAYER_MADHAB = 'Shafi'
} = process.env;

if (!BOT_TOKEN) {
  console.error('Missing BOT_TOKEN');
  process.exit(1);
}
if (!GEMINI_API_KEY) {
  console.error('Missing GEMINI_API_KEY');
  process.exit(1);
}

const MODEL_NAME = 'gemini-1.5-flash';
const bot = new Telegraf(BOT_TOKEN);
bot.use(session());
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// ====== UTIL ======
function ensureSession(ctx) {
  if (!ctx.session) ctx.session = {};
  if (!ctx.session.history) ctx.session.history = [];
}

// OpenAI-style -> Gemini history
function toGeminiHistory(history) {
  return history.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));
}

// Format waktu di timezone tertentu
function formatNow(tz = PRAYER_TZ) {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('id-ID', {
    timeZone: tz,
    dateStyle: 'full',
    timeStyle: 'medium'
  });
  return fmt.format(now);
}

function formatHHmm(date, tz = PRAYER_TZ) {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);
}

// ====== PRAYER TIMES ======
const coords = new Coordinates(parseFloat(PRAYER_LAT), parseFloat(PRAYER_LNG));

function getParams(methodKey = PRAYER_METHOD) {
  // Mapping beberapa metode populer ke adhan CalculationMethod
  const m = {
    MWL: CalculationMethod.MuslimWorldLeague(),
    ISNA: CalculationMethod.NorthAmerica(),
    Egypt: CalculationMethod.Egyptian(),
    UmmAlQura: CalculationMethod.UmmAlQura(),
    Turkey: CalculationMethod.Turkey(),
    Singapore: CalculationMethod.Singapore()
  };
  const params = (m[methodKey] || CalculationMethod.MuslimWorldLeague());
  params.madhab = PRAYER_MADHAB === 'Hanafi' ? Madhab.Hanafi : Madhab.Shafi;
  return params;
}

// Hitung waktu salat untuk tanggal tertentu (local server date), dibandingkan sebagai string HH:mm di TZ target
function todayPrayerTimesStrings(date = new Date()) {
  const params = getParams(PRAYER_METHOD);
  const pt = new PrayerTimes(coords, date, params);
  return {
    Fajr: formatHHmm(pt.fajr),
    Dhuhr: formatHHmm(pt.dhuhr),
    Asr: formatHHmm(pt.asr),
    Maghrib: formatHHmm(pt.maghrib),
    Isha: formatHHmm(pt.isha)
  };
}

// ====== SUBSCRIPTION (in-memory) ======
const subscribers = new Set(); // chat_id yang ingin terima notifikasi azan (hilang kalau restart)
let sentFlags = new Set();     // penanda "sudah kirim notifikasi" per hari-per-prayer

function resetSentFlagsForToday() {
  sentFlags = new Set();
}

function makeFlagKey(ymd, prayerName) {
  return `${ymd}:${prayerName}`;
}

function ymdStr(tz = PRAYER_TZ) {
  const now = new Date();
  // Ambil tanggal di TZ target
  const d = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now); // "YYYY-MM-DD"
  return d;
}

// Cron tiap menit: cek apakah masuk waktu salat di TZ target
cron.schedule('* * * * *', async () => {
  if (subscribers.size === 0) return; // tak ada subscriber, lewati

  const nowHHmm = formatHHmm(new Date()); // waktu saat ini (HH:mm) di PRAYER_TZ
  const ymd = ymdStr();
  const times = todayPrayerTimesStrings();

  for (const [prayerName, hhmm] of Object.entries(times)) {
    if (hhmm === nowHHmm) {
      const key = makeFlagKey(ymd, prayerName);
      if (sentFlags.has(key)) continue; // sudah kirim menit ini

      // Kirim ke semua subscriber
      const msg =
        `🕋 Waktu ${prayerName} telah masuk (${hhmm} ${PRAYER_TZ}).\n` +
        `Semoga Allah menerima ibadah kita.`;
      for (const chatId of subscribers) {
        try {
          await bot.telegram.sendMessage(chatId, msg);
        } catch (e) {
          console.error('Failed to send azan notif to', chatId, e);
        }
      }
      sentFlags.add(key);
    }
  }
});

// Cron harian jam 00:01 TZ target: reset flag harian
cron.schedule('1 0 * * *', () => {
  resetSentFlagsForToday();
});

// ====== COMMANDS ======
bot.start(async (ctx) => {
  ensureSession(ctx);
  const nowStr = formatNow();
  await ctx.reply(
    'Hai! Aku bot Reca 🤖 (Gemini)\n' +
    `Waktu saat ini: ${nowStr}\n\n` +
    'Kirim pertanyaan apa pun.\n' +
    'Perintah: /help /reset /subscribe_azan /unsubscribe_azan /jadwal_azan'
  );
});

bot.help(async (ctx) => {
  await ctx.reply(
    'Perintah:\n' +
    '/help - Bantuan\n' +
    '/reset - Hapus konteks percakapan\n' +
    '/subscribe_azan - Aktifkan notifikasi azan untuk chat ini\n' +
    '/unsubscribe_azan - Matikan notifikasi azan untuk chat ini\n' +
    '/jadwal_azan - Lihat jadwal salat hari ini (ringkas)\n\n' +
    `Zona waktu: ${PRAYER_TZ} | Metode: ${PRAYER_METHOD} | Madhab: ${PRAYER_MADHAB}`
  );
});

bot.command('reset', async (ctx) => {
  ensureSession(ctx);
  ctx.session.history = [];
  await ctx.reply('Konteks direset ✅');
});

bot.command('subscribe_azan', async (ctx) => {
  subscribers.add(ctx.chat.id);
  await ctx.reply(
    '✅ Notifikasi azan diaktifkan untuk chat ini.\n' +
    'Aku akan kirim pemberitahuan saat waktu Fajr, Dhuhr, Asr, Maghrib, dan Isha.'
  );
});

bot.command('unsubscribe_azan', async (ctx) => {
  subscribers.delete(ctx.chat.id);
  await ctx.reply('🚫 Notifikasi azan dimatikan untuk chat ini.');
});

bot.command('jadwal_azan', async (ctx) => {
  const times = todayPrayerTimesStrings();
  await ctx.reply(
    `🗓️ Jadwal Salat Hari Ini (${PRAYER_TZ})\n` +
    `Fajr    : ${times.Fajr}\n` +
    `Dhuhr   : ${times.Dhuhr}\n` +
    `Asr     : ${times.Asr}\n` +
    `Maghrib : ${times.Maghrib}\n` +
    `Isha    : ${times.Isha}`
  );
});

// ====== CHAT HANDLER ======
bot.on('text', async (ctx) => {
  ensureSession(ctx);
  const userText = ctx.message.text?.trim();
  if (!userText) return;

  // aksi mengetik bisa diganti via env TYPING_ACTION
  try { await ctx.sendChatAction(TYPING_ACTION); } catch {}

  try {
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: SYSTEM_PROMPT
    });

    const recent = ctx.session.history.slice(-Number(MAX_HISTORY));
    const geminiHistory = toGeminiHistory(recent);

    const chat = model.startChat({ history: geminiHistory });
    const result = await chat.sendMessage(userText);
    const answer = result.response.text()?.trim() || 'Maaf, tidak ada jawaban.';

    ctx.session.history.push({ role: 'user', content: userText });
    ctx.session.history.push({ role: 'assistant', content: answer });

    await ctx.reply(answer, { reply_to_message_id: ctx.message.message_id });
  } catch (err) {
    console.error('Gemini error:', err);
    await ctx.reply('⚠️ Terjadi error saat menghubungi Gemini. Coba lagi ya.');
  }
});

// ====== START ======
bot.launch().then(() => {
  console.log('Bot started (polling)');
  resetSentFlagsForToday();
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
