export type AttendanceStatus = 'present' | 'late' | 'absent' | 'excused';
export type TimerStatus = 'not_started' | 'running' | 'stopped' | 'expired';

export interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string;
  status: AttendanceStatus;
  checkInAt: string | null;
  checkOutAt: string | null;
  timerStatus: TimerStatus;
  completedHours: number;
  bonusPoints: number;
  pointsAwarded: number;
}

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: 'Присутствовал',
  late: 'Опоздал',
  absent: 'Отсутствовал',
  excused: 'Уважительная причина',
};

const ATTENDANCE_POINTS_MAP: Record<AttendanceStatus, number> = {
  present: 5,
  late:    3,
  absent:  0,
  excused: 1,
};

export const TIMER_MAX_HOURS = 10;
export const TIMER_MAX_MS = TIMER_MAX_HOURS * 60 * 60 * 1000;

/** Full hours elapsed between checkIn and checkOut, capped at TIMER_MAX_HOURS */
export function getCompletedHours(
  checkInAt: string | null,
  checkOutAt: string | null,
): number {
  if (!checkInAt || !checkOutAt) return 0;
  const ms = new Date(checkOutAt).getTime() - new Date(checkInAt).getTime();
  return Math.min(Math.max(0, Math.floor(ms / 3_600_000)), TIMER_MAX_HOURS);
}

/** Triangular bonus: 1h→+1, 2h→+3, 3h→+6, 10h→+55 */
export function getHoursBonus(completedHours: number): number {
  const h = Math.min(Math.max(0, completedHours), TIMER_MAX_HOURS);
  return (h * (h + 1)) / 2;
}

/**
 * Total points for an attendance record.
 * Bonus is only awarded when status=present AND timerStatus=stopped.
 */
export function getAttendancePoints(
  status: AttendanceStatus,
  timerStatus: TimerStatus = 'not_started',
  completedHours = 0,
): number {
  const base = ATTENDANCE_POINTS_MAP[status] ?? 0;
  if (status !== 'present' || timerStatus !== 'stopped') return base;
  return base + getHoursBonus(completedHours);
}

/** If no record exists for a date, treat it as absent. */
export function getEffectiveAttendanceStatus(record?: AttendanceRecord | null): AttendanceStatus {
  return record?.status ?? 'absent';
}

// kept for badge display; values are base points only
export const ATTENDANCE_STATUS_POINTS = ATTENDANCE_POINTS_MAP;
