import { subDays } from 'date-fns';
import type { Student, StudentLevel } from '@/entities/student/model/types';
import type { Assignment } from '@/entities/assignment/model/types';
import type { AttendanceRecord } from '@/entities/attendance/model/types';
import type { PointHistoryItem } from '@/entities/points/model/types';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ActivityFilter =
  | 'ALL'
  | 'active'
  | 'few_assignments'
  | 'often_absent'
  | 'inactive'
  | 'growing';

export type SortKey = 'points' | 'attendance' | 'assignments' | 'growth' | 'name' | 'age';
export type SortDir = 'asc' | 'desc';

export interface LeaderboardFilters {
  search: string;
  group: string;
  level: StudentLevel | 'ALL';
  activity: ActivityFilter;
  sortKey: SortKey;
  sortDir: SortDir;
}

export const DEFAULT_LB_FILTERS: LeaderboardFilters = {
  search: '',
  group: 'ALL',
  level: 'ALL',
  activity: 'ALL',
  sortKey: 'points',
  sortDir: 'desc',
};

export function isLbFiltersActive(f: LeaderboardFilters): boolean {
  return (
    f.search.trim() !== '' ||
    f.group !== 'ALL' ||
    f.level !== 'ALL' ||
    f.activity !== 'ALL'
  );
}

// ── Labels ────────────────────────────────────────────────────────────────────

export const SORT_LABELS: Record<SortKey, string> = {
  points:      'Баллы',
  attendance:  'Посещения',
  assignments: 'Задания',
  growth:      'Рост',
  name:        'Имя',
  age:         'Возраст',
};

export const ACTIVITY_LABELS: Record<ActivityFilter, string> = {
  ALL:              'Все',
  active:           'Активные',
  few_assignments:  'Мало заданий',
  often_absent:     'Часто отсутствуют',
  inactive:         'Без активности',
  growing:          'Растут',
};

// ── Metrics ───────────────────────────────────────────────────────────────────

export interface StudentMetrics {
  doneCount: number;
  presentCount: number;
  absentRate: number;   // fraction of last-5 records that are absent
  growth: number;       // (points last 7d) − (points prev 7d)
  lastActivityAt: string | null;
}

export function computeMetrics(
  students: Student[],
  assignments: Assignment[],
  attendance: AttendanceRecord[],
  pointHistory: PointHistoryItem[],
): Map<string, StudentMetrics> {
  const sevenDaysAgo    = subDays(new Date(), 7).toISOString();
  const fourteenDaysAgo = subDays(new Date(), 14).toISOString();
  const map = new Map<string, StudentMetrics>();

  for (const s of students) {
    const sAssign  = assignments.filter((a) => a.studentId === s.id);
    const sAttend  = attendance.filter((a) => a.studentId === s.id);
    const sHistory = pointHistory.filter((h) => h.studentId === s.id);

    const doneCount    = sAssign.filter((a) => a.status !== 'pending' && a.status !== 'not_done').length;
    const presentCount = sAttend.filter((a) => a.status === 'present').length;

    const last5 = [...sAttend].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
    const absentRate = last5.length > 0 ? last5.filter((a) => a.status === 'absent').length / last5.length : 0;

    const lastWeekPts = sHistory.filter((h) => h.createdAt >= sevenDaysAgo).reduce((n, h) => n + h.points, 0);
    const prevWeekPts = sHistory.filter((h) => h.createdAt >= fourteenDaysAgo && h.createdAt < sevenDaysAgo).reduce((n, h) => n + h.points, 0);

    const lastEntry = [...sHistory].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

    map.set(s.id, {
      doneCount,
      presentCount,
      absentRate,
      growth: lastWeekPts - prevWeekPts,
      lastActivityAt: lastEntry?.createdAt ?? null,
    });
  }

  return map;
}

// ── Filter + sort ─────────────────────────────────────────────────────────────

const LEVEL_RU: Record<string, string> = {
  beginner:     'начинающий',
  intermediate: 'средний',
  advanced:     'продвинутый',
};

export function applyLbFilters(
  students: Student[],
  metrics: Map<string, StudentMetrics>,
  filters: LeaderboardFilters,
): Student[] {
  let result = students;

  // Search
  const q = filters.search.trim().toLowerCase();
  if (q) {
    result = result.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.group.toLowerCase().includes(q) ||
        `группа ${s.group.toLowerCase()}`.includes(q) ||
        (LEVEL_RU[s.level] ?? '').includes(q),
    );
  }

  // Group
  if (filters.group !== 'ALL') {
    result = result.filter((s) => s.group === filters.group);
  }

  // Level
  if (filters.level !== 'ALL') {
    result = result.filter((s) => s.level === filters.level);
  }

  // Activity
  if (filters.activity !== 'ALL') {
    const thirtyDaysAgo   = subDays(new Date(), 30).toISOString();
    const fourteenDaysAgo = subDays(new Date(), 14).toISOString();

    result = result.filter((s) => {
      const m = metrics.get(s.id);
      if (!m) return false;
      switch (filters.activity) {
        case 'active':          return m.lastActivityAt !== null && m.lastActivityAt >= thirtyDaysAgo;
        case 'few_assignments': return m.doneCount < 3;
        case 'often_absent':    return m.absentRate >= 0.6;
        case 'inactive':        return m.lastActivityAt === null || m.lastActivityAt < fourteenDaysAgo;
        case 'growing':         return m.growth > 0;
        default:                return true;
      }
    });
  }

  // Sort
  return [...result].sort((a, b) => {
    const ma = metrics.get(a.id)!;
    const mb = metrics.get(b.id)!;
    let cmp = 0;
    switch (filters.sortKey) {
      case 'points':      cmp = a.totalPoints - b.totalPoints; break;
      case 'attendance':  cmp = ma.presentCount - mb.presentCount; break;
      case 'assignments': cmp = ma.doneCount - mb.doneCount; break;
      case 'growth':      cmp = ma.growth - mb.growth; break;
      case 'name':        cmp = a.fullName.localeCompare(b.fullName); break;
      case 'age':         cmp = a.age - b.age; break;
    }
    return filters.sortDir === 'desc' ? -cmp : cmp;
  });
}
