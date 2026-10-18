import { Lang } from '../types';

/** Minutes after midnight to a clock time in the player's style (10:15 PM / 22:15). */
export function formatMin(min: number, lang: Lang): string {
  const h = Math.floor(min / 60) % 24;
  const m = String(min % 60).padStart(2, '0');
  if (lang === 'es') return `${h}:${m}`;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${h < 12 ? 'AM' : 'PM'}`;
}
