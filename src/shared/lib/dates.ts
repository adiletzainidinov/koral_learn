import { format, formatDistanceToNow, parseISO, isToday, isBefore, startOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'dd.MM.yyyy');
}

export function formatShortDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'd MMM yyyy', { locale: ru });
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'dd.MM.yyyy, HH:mm');
}

export function formatRelative(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: ru });
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
