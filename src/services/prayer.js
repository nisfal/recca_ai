import { Coordinates, CalculationMethod, Madhab, PrayerTimes } from 'adhan';
import { env } from '../env.js';
import { formatHHmm } from '../utils/time.js';

const coords = new Coordinates(env.PRAYER_LAT, env.PRAYER_LNG);

function getParams() {
  const m = {
    MWL: CalculationMethod.MuslimWorldLeague(),
    ISNA: CalculationMethod.NorthAmerica(),
    Egypt: CalculationMethod.Egyptian(),
    UmmAlQura: CalculationMethod.UmmAlQura(),
    Turkey: CalculationMethod.Turkey(),
    Singapore: CalculationMethod.Singapore()
  };
  const params = (m[env.PRAYER_METHOD] || CalculationMethod.MuslimWorldLeague());
  params.madhab = env.PRAYER_MADHAB === 'Hanafi' ? Madhab.Hanafi : Madhab.Shafi;
  return params;
}

export function getTodayPrayerTimesStrings(date = new Date()) {
  const params = getParams();
  const pt = new PrayerTimes(coords, date, params);
  return {
    Fajr: formatHHmm(pt.fajr),
    Dhuhr: formatHHmm(pt.dhuhr),
    Asr: formatHHmm(pt.asr),
    Maghrib: formatHHmm(pt.maghrib),
    Isha: formatHHmm(pt.isha)
  };
}
