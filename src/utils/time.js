import { env } from '../env.js';

export function formatNow(tz = env.PRAYER_TZ) {
  const now = new Date();
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: tz, dateStyle: 'full', timeStyle: 'medium'
  }).format(now);
}

export function formatHHmm(date, tz = env.PRAYER_TZ) {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false
  }).format(date);
}

export function ymdStr(tz = env.PRAYER_TZ) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date()); // YYYY-MM-DD
}
