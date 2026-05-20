'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useShallow } from 'zustand/shallow';
import type { Student, CreateStudentInput, UpdateStudentInput } from '@/entities/student/model/types';
import type { Assignment, AssignmentStatus, CreateAssignmentInput, CreateAssignmentContent, UpdateAssignmentInput } from '@/entities/assignment/model/types';
import type { AttendanceRecord, AttendanceStatus, TimerStatus } from '@/entities/attendance/model/types';
import type { PointHistoryItem } from '@/entities/points/model/types';
import { getAssignmentPoints } from '@/entities/assignment/model/types';
import {
  getAttendancePoints,
  getCompletedHours,
  getHoursBonus,
  ATTENDANCE_STATUS_LABELS,
} from '@/entities/attendance/model/types';
import { generateId } from '@/shared/lib/ids';
import { todayISO } from '@/shared/lib/dates';
import {
  mockStudents,
  mockAssignments,
  mockAttendanceRecords,
  mockPointHistory,
} from '@/mock';

interface AppState {
  _seeded: boolean;

  students: Student[];
  assignments: Assignment[];
  attendanceRecords: AttendanceRecord[];
  pointHistory: PointHistoryItem[];

  _seed: () => void;

  addStudent: (data: CreateStudentInput) => string;
  updateStudent: (id: string, data: UpdateStudentInput) => void;
  removeStudent: (id: string) => void;

  createAssignment: (data: CreateAssignmentInput) => void;
  createAssignmentsForStudents: (content: CreateAssignmentContent, studentIds: string[]) => void;
  updateAssignment: (id: string, data: UpdateAssignmentInput) => void;
  updateAssignmentStatus: (id: string, status: AssignmentStatus) => void;
  updateAssignmentComment: (id: string, comment: string) => void;
  removeAssignment: (id: string) => void;

  markAttendance: (studentId: string, date: string, status: AttendanceStatus) => void;
  stopAttendanceTimer: (studentId: string, date: string) => void;
  expireAttendanceTimer: (studentId: string, date: string) => void;

  awardBonusPoints: (studentId: string, reason: string, points: number) => void;
  updateBonusHistoryItem: (id: string, patch: { reason: string; points: number; comment?: string }) => void;
}

// ─── point-history helper ─────────────────────────────────────────────────────

function buildPointHistory(
  pointHistory: PointHistoryItem[],
  attendanceId: string,
  studentId: string,
  newPoints: number,
  reason: string,
): PointHistoryItem[] {
  const idx = pointHistory.findIndex((h) => h.attendanceId === attendanceId);
  if (idx !== -1) {
    if (newPoints === 0) return pointHistory.filter((_, i) => i !== idx);
    return pointHistory.map((h, i) => i === idx ? { ...h, points: newPoints, reason } : h);
  }
  if (newPoints > 0) {
    return [
      ...pointHistory,
      {
        id: generateId(),
        studentId,
        source: 'attendance' as const,
        reason,
        points: newPoints,
        createdAt: new Date().toISOString(),
        attendanceId,
      },
    ];
  }
  return pointHistory;
}

// ─────────────────────────────────────────────────────────────────────────────

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      _seeded: false,
      students: [],
      assignments: [],
      attendanceRecords: [],
      pointHistory: [],

      _seed: () => {
        const { _seeded } = get();
        if (_seeded) return;
        set({
          _seeded: true,
          students: mockStudents,
          assignments: mockAssignments,
          attendanceRecords: mockAttendanceRecords,
          pointHistory: mockPointHistory,
        });
      },

      addStudent: (data) => {
        const id = generateId();
        const student: Student = {
          ...data,
          id,
          totalPoints: 0,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ students: [...state.students, student] }));
        return id;
      },

      updateStudent: (id, data) => {
        set((state) => ({
          students: state.students.map((s) => (s.id === id ? { ...s, ...data } : s)),
        }));
      },

      removeStudent: (id) => {
        set((state) => ({
          students: state.students.filter((s) => s.id !== id),
          assignments: state.assignments.filter((a) => a.studentId !== id),
          attendanceRecords: state.attendanceRecords.filter((r) => r.studentId !== id),
          pointHistory: state.pointHistory.filter((p) => p.studentId !== id),
        }));
      },

      createAssignment: (data) => {
        const assignment: Assignment = {
          ...data,
          id: generateId(),
          issuedAt: new Date().toISOString(),
          status: 'pending',
          pointsAwarded: 0,
        };
        set((state) => ({ assignments: [...state.assignments, assignment] }));
      },

      createAssignmentsForStudents: (content, studentIds) => {
        const issuedAt = new Date().toISOString();
        const newAssignments: Assignment[] = studentIds.map((studentId) => ({
          ...content,
          id: generateId(),
          studentId,
          issuedAt,
          status: 'pending',
          pointsAwarded: 0,
        }));
        set((state) => ({ assignments: [...state.assignments, ...newAssignments] }));
      },

      updateAssignmentStatus: (id, status) => {
        const { assignments, students, pointHistory } = get();
        const assignment = assignments.find((a) => a.id === id);
        if (!assignment) return;

        const newPoints = getAssignmentPoints(status, assignment.assignmentType);
        const oldPoints = assignment.pointsAwarded;
        const delta = newPoints - oldPoints;

        const updatedAssignments = assignments.map((a) =>
          a.id === id ? { ...a, status, pointsAwarded: newPoints } : a
        );

        const updatedStudents = delta !== 0
          ? students.map((s) =>
              s.id === assignment.studentId
                ? { ...s, totalPoints: Math.max(0, s.totalPoints + delta) }
                : s
            )
          : students;

        const newHistory: PointHistoryItem[] = delta !== 0
          ? [
              ...pointHistory,
              {
                id: generateId(),
                studentId: assignment.studentId,
                source: 'assignment',
                reason: `Задание: ${assignment.title} — ${statusLabel(status)}`,
                points: delta,
                createdAt: new Date().toISOString(),
                assignmentId: id,
              },
            ]
          : pointHistory;

        set({ assignments: updatedAssignments, students: updatedStudents, pointHistory: newHistory });
      },

      updateAssignment: (id, data) => {
        set((state) => ({
          assignments: state.assignments.map((a) =>
            a.id === id ? { ...a, ...data } : a
          ),
        }));
      },

      updateAssignmentComment: (id, comment) => {
        set((state) => ({
          assignments: state.assignments.map((a) =>
            a.id === id ? { ...a, teacherComment: comment } : a
          ),
        }));
      },

      removeAssignment: (id) => {
        const { assignments, students } = get();
        const assignment = assignments.find((a) => a.id === id);
        if (!assignment) return;

        const updatedStudents = assignment.pointsAwarded > 0
          ? students.map((s) =>
              s.id === assignment.studentId
                ? { ...s, totalPoints: Math.max(0, s.totalPoints - assignment.pointsAwarded) }
                : s
            )
          : students;

        set({
          assignments: assignments.filter((a) => a.id !== id),
          students: updatedStudents,
        });
      },

      markAttendance: (studentId, date, status) => {
        const { attendanceRecords, students, pointHistory } = get();
        const existing = attendanceRecords.find(
          (r) => r.studentId === studentId && r.date === date
        );

        // Timer state resolution
        let checkInAt: string | null = null;
        let checkOutAt: string | null = null;
        let timerStatus: TimerStatus = 'not_started';
        let completedHours = 0;
        let bonusPoints = 0;

        if (status === 'present') {
          // Preserve existing timer if already present; restart only when switching from another status
          if (existing?.status === 'present' && existing.timerStatus !== 'not_started') {
            checkInAt = existing.checkInAt;
            checkOutAt = existing.checkOutAt;
            timerStatus = existing.timerStatus;
            completedHours = existing.completedHours;
            bonusPoints = existing.bonusPoints;
          } else {
            checkInAt = new Date().toISOString();
            timerStatus = 'running';
          }
        }

        const newPoints = getAttendancePoints(status, timerStatus, completedHours);
        const oldPoints = existing?.pointsAwarded ?? 0;
        const delta = newPoints - oldPoints;
        const attendanceId = existing?.id ?? generateId();

        const newRecord: AttendanceRecord = {
          id: attendanceId,
          studentId,
          date,
          status,
          checkInAt,
          checkOutAt,
          timerStatus,
          completedHours,
          bonusPoints,
          pointsAwarded: newPoints,
        };

        const updatedRecords = existing
          ? attendanceRecords.map((r) => r.id === attendanceId ? newRecord : r)
          : [...attendanceRecords, newRecord];

        const updatedStudents = delta !== 0
          ? students.map((s) =>
              s.id === studentId ? { ...s, totalPoints: Math.max(0, s.totalPoints + delta) } : s
            )
          : students;

        const dateFormatted = date.split('-').reverse().join('.');
        const reason = `Посещение ${dateFormatted} — ${ATTENDANCE_STATUS_LABELS[status]}`;
        const updatedHistory = buildPointHistory(pointHistory, attendanceId, studentId, newPoints, reason);

        set({ attendanceRecords: updatedRecords, students: updatedStudents, pointHistory: updatedHistory });
      },

      stopAttendanceTimer: (studentId, date) => {
        const { attendanceRecords, students, pointHistory } = get();
        const existing = attendanceRecords.find(
          (r) => r.studentId === studentId && r.date === date
        );
        if (!existing || existing.status !== 'present' || existing.timerStatus !== 'running') return;

        const now = new Date().toISOString();
        const completedHours = getCompletedHours(existing.checkInAt, now);
        const bonusPoints = getHoursBonus(completedHours);
        const newPoints = 5 + bonusPoints;
        const delta = newPoints - existing.pointsAwarded;

        const updatedRecord: AttendanceRecord = {
          ...existing,
          checkOutAt: now,
          timerStatus: 'stopped',
          completedHours,
          bonusPoints,
          pointsAwarded: newPoints,
        };

        const updatedRecords = attendanceRecords.map((r) =>
          r.id === existing.id ? updatedRecord : r
        );

        const updatedStudents = delta !== 0
          ? students.map((s) =>
              s.id === studentId ? { ...s, totalPoints: Math.max(0, s.totalPoints + delta) } : s
            )
          : students;

        const dateFormatted = date.split('-').reverse().join('.');
        const hoursStr = completedHours > 0 ? `, ${completedHours}ч` : '';
        const reason = `Посещение ${dateFormatted} — Присутствовал${hoursStr}`;
        const updatedHistory = buildPointHistory(pointHistory, existing.id, studentId, newPoints, reason);

        set({ attendanceRecords: updatedRecords, students: updatedStudents, pointHistory: updatedHistory });
      },

      expireAttendanceTimer: (studentId, date) => {
        const { attendanceRecords, pointHistory } = get();
        const existing = attendanceRecords.find(
          (r) => r.studentId === studentId && r.date === date
        );
        if (!existing || existing.timerStatus !== 'running') return;

        const updatedRecord: AttendanceRecord = {
          ...existing,
          checkOutAt: null,
          timerStatus: 'expired',
          completedHours: 0,
          bonusPoints: 0,
          pointsAwarded: 5,
        };

        const updatedRecords = attendanceRecords.map((r) =>
          r.id === existing.id ? updatedRecord : r
        );

        const dateFormatted = date.split('-').reverse().join('.');
        const reason = `Посещение ${dateFormatted} — Присутствовал, таймер не остановлен`;
        // points stay at 5 — no student.totalPoints delta needed
        const updatedHistory = buildPointHistory(pointHistory, existing.id, studentId, 5, reason);

        set({ attendanceRecords: updatedRecords, pointHistory: updatedHistory });
      },

      awardBonusPoints: (studentId, reason, points) => {
        const { students, pointHistory } = get();
        if (points === 0) return;

        const updatedStudents = students.map((s) =>
          s.id === studentId
            ? { ...s, totalPoints: Math.max(0, s.totalPoints + points) }
            : s
        );

        const newEntry: PointHistoryItem = {
          id: generateId(),
          studentId,
          source: 'bonus',
          reason,
          points,
          createdAt: new Date().toISOString(),
        };

        set({ students: updatedStudents, pointHistory: [...pointHistory, newEntry] });
      },

      updateBonusHistoryItem: (id, patch) => {
        const { pointHistory, students } = get();
        const item = pointHistory.find((h) => h.id === id);
        if (!item || item.source !== 'bonus') return;

        const delta = patch.points - item.points;

        const updatedHistory = pointHistory.map((h) =>
          h.id === id ? { ...h, ...patch } : h
        );
        const updatedStudents = delta !== 0
          ? students.map((s) =>
              s.id === item.studentId
                ? { ...s, totalPoints: Math.max(0, s.totalPoints + delta) }
                : s
            )
          : students;

        set({ pointHistory: updatedHistory, students: updatedStudents });
      },
    }),
    {
      name: 'quranlearn-v2',
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined') return localStorage;
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
    }
  )
);

function statusLabel(status: AssignmentStatus): string {
  const labels: Record<AssignmentStatus, string> = {
    pending: 'На проверке',
    not_done: 'Не сделано',
    done: 'Сделано',
    good: 'Хорошо',
    excellent: 'Отлично',
  };
  return labels[status];
}

// Selectors that return raw store slices — stable references, no useShallow needed
export const useStudents = () => useAppStore((s) => s.students);
export const useAssignments = () => useAppStore((s) => s.assignments);
export const useAttendanceRecords = () => useAppStore((s) => s.attendanceRecords);
export const usePointHistory = () => useAppStore((s) => s.pointHistory);

// Derived selectors — useShallow prevents infinite loops caused by new array
// references on every render when using useSyncExternalStore (React 19 + Zustand 5)
export const useActiveStudents = () =>
  useAppStore(useShallow((s) => s.students.filter((st) => st.isActive)));

export const useStudentById = (id: string) =>
  useAppStore((s) => s.students.find((st) => st.id === id));

export const useStudentAssignments = (studentId: string) =>
  useAppStore(useShallow((s) => s.assignments.filter((a) => a.studentId === studentId)));

export const useStudentAttendance = (studentId: string) =>
  useAppStore(
    useShallow((s) =>
      s.attendanceRecords
        .filter((r) => r.studentId === studentId)
        .sort((a, b) => b.date.localeCompare(a.date))
    )
  );

export const useStudentPointHistory = (studentId: string) =>
  useAppStore(
    useShallow((s) =>
      s.pointHistory
        .filter((p) => p.studentId === studentId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    )
  );

export const usePendingAssignments = () =>
  useAppStore(useShallow((s) => s.assignments.filter((a) => a.status === 'pending')));

export const useTodayAttendance = () =>
  useAppStore(
    useShallow((s) => {
      const today = todayISO();
      return s.attendanceRecords.filter((r) => r.date === today);
    })
  );

export const useLeaderboard = () =>
  useAppStore(
    useShallow((s) =>
      [...s.students]
        .filter((st) => st.isActive)
        .sort((a, b) => b.totalPoints - a.totalPoints)
    )
  );

export const useRecentActivity = (limit = 10) =>
  useAppStore(
    useShallow((s) =>
      [...s.pointHistory]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit)
    )
  );
