import { formatLocalizedDate, formatKyrgyzRelative } from '@/shared/i18n/date-format';
import { type Locale } from '@/shared/i18n/locale-store';
import { format, formatDistanceToNow, parseISO, isToday, isBefore, startOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'dd.MM.yyyy');
}

export function formatShortDate(date: string | Date, locale: Locale = 'ru'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatLocalizedDate(d, { day: 'numeric', month: 'short', year: 'numeric' }, locale);
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'dd.MM.yyyy, HH:mm');
}

export function formatRelative(date: string | Date, locale: Locale = 'ru'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (locale === 'ru') return formatDistanceToNow(d, { addSuffix: true, locale: ru });
  return formatKyrgyzRelative(d);
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
