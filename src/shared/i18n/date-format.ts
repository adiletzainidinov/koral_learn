import type { Locale } from './locale-store';

export const KY_MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const SHORT_MONTHS = ['янв.', 'фев.', 'март', 'апр.', 'май', 'июнь', 'июль', 'авг.', 'сен.', 'окт.', 'ноя.', 'дек.'];
const WEEKDAYS = ['жекшемби', 'дүйшөмбү', 'шейшемби', 'шаршемби', 'бейшемби', 'жума', 'ишемби'];

/** Some browsers lack Kyrgyz ICU data; keep Kyrgyz dates independent of that fallback. */
export function formatLocalizedDate(date: Date, options: Intl.DateTimeFormatOptions, locale: Locale): string {
  if (locale === 'ru') return new Intl.DateTimeFormat('ru-RU', options).format(date);
  if (!Number.isFinite(date.getTime())) return '';
  const parts: string[] = [];
  if (options.weekday) parts.push(WEEKDAYS[date.getDay()] + ',');
  if (options.day) parts.push(options.day === '2-digit' ? String(date.getDate()).padStart(2, '0') : String(date.getDate()));
  if (options.month) parts.push(options.month === 'long' ? KY_MONTHS[date.getMonth()] : options.month === 'short' ? SHORT_MONTHS[date.getMonth()] : String(date.getMonth() + 1).padStart(options.month === '2-digit' ? 2 : 1, '0'));
  if (options.year) parts.push(`${date.getFullYear()}-ж.`);
  return parts.join(' ');
}

export function formatKyrgyzRelative(date: Date, now = new Date()): string {
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  if (Math.abs(seconds) < 5) return 'азыр';
  const units: [number, string, string][] = [[31536000, 'жыл', 'жылдан'], [2592000, 'ай', 'айдан'], [604800, 'жума', 'жумадан'], [86400, 'күн', 'күндөн'], [3600, 'саат', 'сааттан'], [60, 'мүнөт', 'мүнөттөн'], [1, 'секунд', 'секунддан']];
  const [size, past, future] = units.find(([size]) => Math.abs(seconds) >= size) ?? units[units.length - 1];
  const amount = Math.round(Math.abs(seconds) / size);
  return seconds < 0 ? `${amount} ${past} мурун` : `${amount} ${future} кийин`;
}
