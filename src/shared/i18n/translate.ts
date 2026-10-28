import messages from './ky.json';
import type { Locale } from './locale-store';

const catalog: Record<string, string> = messages;
const reverse = new Map<string, string>();
const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const templates: { ru: string; ky: string; ruPattern: RegExp; kyPattern: RegExp; ruKeys: string[]; kyKeys: string[] }[] = [];
function pattern(value: string) {
  const keys: string[] = [];
  let cursor = 0;
  let result = '^';
  for (const match of value.matchAll(/\{(\d+)\}/g)) {
    result += escapeRegex(value.slice(cursor, match.index)) + '(.*?)';
    keys.push(match[1]);
    cursor = match.index! + match[0].length;
  }
  return { regex: new RegExp(result + escapeRegex(value.slice(cursor)) + '$'), keys };
}
for (const [ru, ky] of Object.entries(catalog)) {
  if (ru.includes('{')) {
    const a = pattern(ru), b = pattern(ky);
    templates.push({ ru, ky, ruPattern: a.regex, kyPattern: b.regex, ruKeys: a.keys, kyKeys: b.keys });
  } else if (!reverse.has(ky)) reverse.set(ky, ru);
}
templates.sort((a, b) => b.ru.length - a.ru.length);

/** Translate interface messages only. User-entered content must not be passed here. */
export function translate<T>(value: T, locale: Locale): T {
  if (typeof value !== 'string' || !value) return value;
  const key = normalize(value);
  let translated: string | undefined;
  if (locale === 'ky') translated = catalog[key];
  else if (Object.hasOwn(catalog, key)) return value;
  else translated = reverse.get(key);
  if (translated === undefined) {
    for (const entry of templates) {
      const match = (locale === 'ky' ? entry.ruPattern : entry.kyPattern).exec(key);
      if (!match) continue;
      const keys = locale === 'ky' ? entry.ruKeys : entry.kyKeys;
      const values = Object.fromEntries(keys.map((name, index) => [name, match[index + 1]]));
      translated = (locale === 'ky' ? entry.ky : entry.ru).replace(/\{(\d+)\}/g, (_, name: string) => values[name] ?? '');
      break;
    }
  }
  if (translated === undefined) return value;
  return ((value.match(/^\s*/)?.[0] ?? '') + translated + (value.match(/\s*$/)?.[0] ?? '')) as T;
}

/** Localize immutable interface definitions, never records from the application store. */
export function localizeUI<T>(value: T, locale: Locale): T {
  if (typeof value === 'string') return translate(value, locale);
  if (Array.isArray(value)) return value.map((item) => localizeUI(item, locale)) as T;
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const stableKeys = new Set(['id', 'value', 'key', 'href', 'type', 'status', 'source', 'role', 'icon', 'emoji', 'color', 'className']);
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, stableKeys.has(key) ? item : localizeUI(item, locale)])) as T;
  }
  return value;
}
