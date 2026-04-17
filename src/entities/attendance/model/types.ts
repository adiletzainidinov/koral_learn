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

export const ATTENDANCE_STATUS_POINTS: Record<AttendanceStatus, number> = {
  present: 1,
  late: 0,
  absent: 0,
  excused: 0,
};
