import { differenceInCalendarDays, isToday, isYesterday, parseISO } from 'date-fns';

export function getDaysAgoLabel(dateStr: string): string {
  const d = parseISO(dateStr);
  if (isToday(d)) return 'Сегодня';
  if (isYesterday(d)) return 'Вчера';
  const days = differenceInCalendarDays(new Date(), d);
  return `${days} дн. назад`;
}

export function getDaysCount(dateStr: string): number {
  return differenceInCalendarDays(new Date(), parseISO(dateStr));
}

export type AttendanceColorVariant = 'success' | 'warning' | 'danger' | 'slate';

export function getAttendanceVariant(days: number): AttendanceColorVariant {
  if (days === 0) return 'success';
  if (days <= 3) return 'warning';
  return 'danger';
}
