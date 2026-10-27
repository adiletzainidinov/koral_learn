import { getIntlLocale, type Locale } from '@/shared/i18n/locale-store';
import { format, formatDistanceToNow, parseISO, isToday, isBefore, startOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'dd.MM.yyyy');
}

export function formatShortDate(date: string | Date, locale: Locale = 'ru'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return new Intl.DateTimeFormat(getIntlLocale(locale), { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'dd.MM.yyyy, HH:mm');
}

export function formatRelative(date: string | Date, locale: Locale = 'ru'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (locale === 'ru') return formatDistanceToNow(d, { addSuffix: true, locale: ru });
  const seconds = Math.round((d.getTime() - Date.now()) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60], ['second', 1]];
  const [unit, size] = units.find(([, size]) => Math.abs(seconds) >= size) ?? units[units.length - 1];
  return new Intl.RelativeTimeFormat('ky-KG', { numeric: 'auto' }).format(Math.round(seconds / size), unit);
}

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function isTodayDate(date: string): boolean {
  return isToday(parseISO(date));
}

export function isOverdue(date: string): boolean {
  return isBefore(startOfDay(parseISO(date)), startOfDay(new Date()));
}

export function formatInputDate(date: string): string {
  return date;
}
