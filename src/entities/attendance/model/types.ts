export type AttendanceStatus = 'present' | 'late' | 'absent' | 'excused';

export interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string;
  status: AttendanceStatus;
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

export function getAttendancePoints(status: AttendanceStatus): number {
  return ATTENDANCE_POINTS_MAP[status] ?? 0;
}

/** If no record exists for a date, treat it as absent. */
export function getEffectiveAttendanceStatus(record?: AttendanceRecord | null): AttendanceStatus {
  return record?.status ?? 'absent';
}

// kept for any legacy reads (e.g. badge display); values mirror getAttendancePoints
export const ATTENDANCE_STATUS_POINTS = ATTENDANCE_POINTS_MAP;
