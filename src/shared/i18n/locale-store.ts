export type Locale = 'ru' | 'ky';
const STORAGE_KEY = 'quranlearn-language';
let locale: Locale = 'ru';
let initialized = false;
const listeners = new Set<() => void>();

export function getLocale(): Locale {
  if (typeof window === 'undefined') return 'ru';
  if (!initialized) {
    initialized = true;
    try { locale = localStorage.getItem(STORAGE_KEY) === 'ky' ? 'ky' : 'ru'; } catch { /* Storage may be unavailable in private browsing. */ }
  }
  return locale;
}

export function setLocale(next: Locale) {
  if (next !== 'ru' && next !== 'ky') return;
  locale = next;
  initialized = true;
  try { localStorage.setItem(STORAGE_KEY, next); } catch { /* The current session still supports switching. */ }
  listeners.forEach((listener) => listener());
}

function onStorage(event: StorageEvent) {
  if (event.key !== STORAGE_KEY && event.key !== null) return;
  initialized = false;
  getLocale();
  listeners.forEach((listener) => listener());
}

export function subscribeLocale(listener: () => void) {
  if (listeners.size === 0) window.addEventListener('storage', onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener('storage', onStorage);
  };
}

export const getServerLocale = (): Locale => 'ru';
export const getIntlLocale = (value: Locale) => value === 'ky' ? 'ky-KG' : 'ru-RU';
