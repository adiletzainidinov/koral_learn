import { format, subDays } from 'date-fns';
import type { Student } from '@/entities/student/model/types';
import type { AttendanceRecord, AttendanceStatus } from '@/entities/attendance/model/types';

export type StatusFilter = 'ALL' | AttendanceStatus | 'unmarked';
export type ActivityFilter = 'ALL' | 'today' | 'days3' | 'days7' | 'days14';
export type ProblemFilter = 'ALL' | 'absent_often' | 'late_often' | 'no_records';

export interface Filters {
  search: string;
  group: string;       // 'ALL' or group name
  status: StatusFilter;
  activity: ActivityFilter;
  problem: ProblemFilter;
}

export const DEFAULT_FILTERS: Filters = {
  search: '',
  group: 'ALL',
  status: 'ALL',
  activity: 'ALL',
  problem: 'ALL',
};

export function isFiltersActive(f: Filters): boolean {
  return (
    f.search.trim() !== '' ||
    f.group !== 'ALL' ||
    f.status !== 'ALL' ||
    f.activity !== 'ALL' ||
    f.problem !== 'ALL'
  );
}

function isoToday(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

function isoBefore(days: number): string {
  return format(subDays(new Date(), days), 'yyyy-MM-dd');
}

export function applyFilters(
  students: Student[],
  allRecords: AttendanceRecord[],
  dateRecords: AttendanceRecord[],
  filters: Filters,
): Student[] {
  let result = students;

  // ── Search: partial match on name or group ────────────────────────
  const q = filters.search.trim().toLowerCase();
  if (q) {
    result = result.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.group.toLowerCase().includes(q) ||
        `группа ${s.group.toLowerCase()}`.includes(q),
    );
  }

  // ── Group chip ────────────────────────────────────────────────────
  if (filters.group !== 'ALL') {
    result = result.filter((s) => s.group === filters.group);
  }

  // ── Status for selected date ──────────────────────────────────────
  // 'unmarked' = no real record; explicit 'absent' = record with status=absent
  if (filters.status !== 'ALL') {
    result = result.filter((s) => {
      const rec = dateRecords.find((r) => r.studentId === s.id);
      if (filters.status === 'unmarked') return !rec;
      return rec?.status === filters.status;
    });
  }

  // ── Activity: based on most recent real record across all dates ───
  if (filters.activity !== 'ALL') {
    const today = isoToday();
    result = result.filter((s) => {
      const lastDate = allRecords
        .filter((r) => r.studentId === s.id)
        .map((r) => r.date)
        .sort()
        .at(-1);

      switch (filters.activity) {
        case 'today':  return lastDate === today;
        case 'days3':  return !lastDate || lastDate <= isoBefore(3);
        case 'days7':  return !lastDate || lastDate <= isoBefore(7);
        case 'days14': return !lastDate || lastDate <= isoBefore(14);
        default:       return true;
      }
    });
  }

  // ── Problem: last 5 real records ─────────────────────────────────
  if (filters.problem !== 'ALL') {
    result = result.filter((s) => {
      const recent = allRecords
        .filter((r) => r.studentId === s.id)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 5);

      switch (filters.problem) {
        case 'no_records':   return recent.length === 0;
        case 'absent_often': return recent.filter((r) => r.status === 'absent').length >= 3;
        case 'late_often':   return recent.filter((r) => r.status === 'late').length >= 2;
        default:             return true;
      }
    });
  }

  return result;
}
