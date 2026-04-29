'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useShallow } from 'zustand/shallow';
import type { Student, CreateStudentInput, UpdateStudentInput } from '@/entities/student/model/types';
import type { Assignment, AssignmentStatus, CreateAssignmentInput, CreateAssignmentContent, UpdateAssignmentInput } from '@/entities/assignment/model/types';
import type { AttendanceRecord, AttendanceStatus } from '@/entities/attendance/model/types';
import type { PointHistoryItem } from '@/entities/points/model/types';
import { getAssignmentPoints } from '@/entities/assignment/model/types';
import { getAttendancePoints } from '@/entities/attendance/model/types';
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

  awardBonusPoints: (studentId: string, reason: string, points: number) => void;
  updateBonusHistoryItem: (id: string, patch: { reason: string; points: number; comment?: string }) => void;
}

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

        const newPoints = getAttendancePoints(status);
        const oldPoints = existing?.pointsAwarded ?? 0;
        const delta = newPoints - oldPoints;

        // Resolve the stable id for this attendance record
        const attendanceId = existing?.id ?? generateId();

        const updatedRecords: AttendanceRecord[] = existing
          ? attendanceRecords.map((r) =>
              r.id === attendanceId ? { ...r, status, pointsAwarded: newPoints } : r
            )
          : [
              ...attendanceRecords,
              { id: attendanceId, studentId, date, status, pointsAwarded: newPoints },
            ];

        const updatedStudents = delta !== 0
          ? students.map((s) =>
              s.id === studentId
                ? { ...s, totalPoints: Math.max(0, s.totalPoints + delta) }
                : s
            )
          : students;

        // One history entry per attendance record — update in-place rather than appending
        const dateFormatted = date.split('-').reverse().join('.');
        const reason = `Посещение ${dateFormatted}`;
        const existingHistoryIdx = pointHistory.findIndex(
          (h) => h.attendanceId === attendanceId
        );

        let updatedHistory: PointHistoryItem[];
        if (existingHistoryIdx !== -1) {
          if (newPoints === 0) {
            // Status changed to one that gives no points — remove the entry
            updatedHistory = pointHistory.filter((_, i) => i !== existingHistoryIdx);
          } else {
            // Update absolute points in the existing entry
            updatedHistory = pointHistory.map((h, i) =>
              i === existingHistoryIdx ? { ...h, points: newPoints, reason } : h
            );
          }
        } else if (newPoints > 0) {
          // First time earning points for this date
          updatedHistory = [
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
        } else {
          updatedHistory = pointHistory;
        }

        set({ attendanceRecords: updatedRecords, students: updatedStudents, pointHistory: updatedHistory });
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
