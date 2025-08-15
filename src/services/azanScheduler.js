import cron from 'node-cron';
import { env } from '../env.js';
import { getTodayPrayerTimesStrings } from './prayer.js';
import { formatHHmm, ymdStr } from '../utils/time.js';

export function initAzanScheduler({ bot, subscribers }) {
  let sentFlags = new Set(); // per-hari

  const makeKey = (ymd, name) => `${ymd}:${name}`;
  const reset = () => { sentFlags = new Set(); };

  // cek tiap menit
  cron.schedule('* * * * *', async () => {
    if (subscribers.size === 0) return;

    const nowHHmm = formatHHmm(new Date(), env.PRAYER_TZ);
    const ymd = ymdStr(env.PRAYER_TZ);
    const times = getTodayPrayerTimesStrings();

    for (const [name, hhmm] of Object.entries(times)) {
      if (hhmm === nowHHmm) {
        const key = makeKey(ymd, name);
        if (sentFlags.has(key)) continue;

        const msg =
          `🕋 Waktu ${name} telah masuk (${hhmm} ${env.PRAYER_TZ}).\n` +
          `Semoga Allah menerima ibadah kita.`;
        for (const chatId of subscribers) {
          try {
            await bot.telegram.sendMessage(chatId, msg);
          } catch (e) {
            console.error('Failed to send azan to', chatId, e);
          }
        }
        sentFlags.add(key);
      }
    }
  });

  // reset flag harian 00:01
  cron.schedule('1 0 * * *', () => reset());

  return { resetFlags: reset };
}
