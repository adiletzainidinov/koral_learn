'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useShallow } from 'zustand/shallow';
import type { Student, CreateStudentInput, UpdateStudentInput } from '@/entities/student/model/types';
import type { Assignment, AssignmentStatus, CreateAssignmentInput, CreateAssignmentContent, UpdateAssignmentInput } from '@/entities/assignment/model/types';
import type { AttendanceRecord, AttendanceStatus, TimerStatus } from '@/entities/attendance/model/types';
import type { PointHistoryItem } from '@/entities/points/model/types';
import type {
  Team, TeamPointHistory, TeamGame, TeamSeason, RichTeamGoal, TeamBadge,
  CreateTeamInput, UpdateTeamInput, CreateTeamGameInput, CreateRichTeamGoalInput,
  TeamBadgeType,
} from '@/entities/team/model/types';
import { TEAM_BADGE_META as BADGE_META } from '@/entities/team/model/types';
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
  mockTeams,
  mockTeamPointHistory,
  mockTeamGames,
  mockTeamSeasons,
  mockTeamGoals,
  mockFamilies,
  mockFamilyPayments,
  mockPaymentHistory,
} from '@/mock';
import type {
  Family, FamilyPayment, PaymentHistoryItem, CreateFamilyInput, UpdateFamilyInput,
  SupportPlanType, PaymentMethod,
} from '@/entities/support/model/types';
import {
  calculateExpectedPayment, getPaymentStatus, formatMonth,
} from '@/entities/support/model/helpers';

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

  // ─── Teams ───────────────────────────────────────────────────────────────
  teams: Team[];
  teamPointHistory: TeamPointHistory[];
  teamGames: TeamGame[];
  teamSeasons: TeamSeason[];
  teamGoals: RichTeamGoal[];
  activeSeasonId: string | null;

  createTeam: (input: CreateTeamInput) => string;
  updateTeam: (id: string, patch: UpdateTeamInput) => void;
  deleteTeam: (id: string) => void;
  addStudentToTeam: (teamId: string, studentId: string) => void;
  removeStudentFromTeam: (teamId: string, studentId: string) => void;
  moveStudentToTeam: (studentId: string, toTeamId: string) => void;
  setTeamMemberRole: (teamId: string, studentId: string, role: 'captain' | 'assistant' | 'discipline' | 'revision') => void;
  awardTeamPoints: (teamId: string, points: number, reason: string, source: TeamPointHistory['source'], opts?: { seasonId?: string | null; relatedGameId?: string | null; relatedGoalId?: string | null }) => void;
  createTeamGoal: (teamId: string, goal: { title: string; targetPoints: number; reward?: string; deadline?: string }) => void;
  updateTeamGoal: (teamId: string, patch: Partial<Omit<Team['goal'], 'id'>>) => void;
  completeTeamGoal: (teamId: string) => void;
  createTeamGame: (input: CreateTeamGameInput) => void;
  startTeamGame: (gameId: string) => void;
  finishTeamGame: (gameId: string, winnerTeamId: string) => void;
  deleteTeamGame: (gameId: string) => void;
  // Seasons
  createTeamSeason: (input: { title: string; description?: string; startDate: string; endDate?: string }) => string;
  finishTeamSeason: (seasonId: string) => void;
  setActiveTeamSeason: (seasonId: string | null) => void;
  resetSeasonPoints: () => void;
  // Rich goals
  createRichTeamGoal: (input: CreateRichTeamGoalInput) => void;
  updateRichTeamGoal: (id: string, patch: Partial<Pick<RichTeamGoal, 'title' | 'description' | 'targetValue' | 'currentValue' | 'reward' | 'deadline' | 'status' | 'type'>>) => void;
  completeRichTeamGoal: (id: string) => void;
  failRichTeamGoal: (id: string) => void;
  deleteRichTeamGoal: (id: string) => void;
  // Badges
  awardTeamBadge: (teamId: string, type: TeamBadgeType) => void;
  removeTeamBadge: (teamId: string, badgeId: string) => void;

  // ─── Support / Families ──────────────────────────────────────────────────
  families: Family[];
  familyPayments: FamilyPayment[];
  paymentHistory: PaymentHistoryItem[];

  createFamily: (input: CreateFamilyInput) => string;
  updateFamily: (id: string, patch: UpdateFamilyInput) => void;
  deleteFamily: (id: string) => void;
  assignStudentToFamily: (familyId: string, studentId: string) => void;
  removeStudentFromFamily: (familyId: string, studentId: string) => void;
  setFamilySupportPlan: (familyId: string, planType: SupportPlanType) => void;
  createMonthlyPayments: (month: string) => void;
  markFamilyPaymentPaid: (familyId: string, month: string, amount: number, method: PaymentMethod, comment?: string) => void;
  updateFamilyPayment: (paymentId: string, patch: Partial<Pick<FamilyPayment, 'paidAmount' | 'expectedAmount' | 'paymentMethod' | 'comment'>>) => void;
  deleteFamilyPayment: (paymentId: string) => void;
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
      teams: [],
      teamPointHistory: [],
      teamGames: [],
      teamSeasons: [],
      teamGoals: [],
      activeSeasonId: null,
      families: [],
      familyPayments: [],
      paymentHistory: [],

      _seed: () => {
        const { _seeded } = get();
        if (_seeded) return;
        set({
          _seeded: true,
          students: mockStudents,
          assignments: mockAssignments,
          attendanceRecords: mockAttendanceRecords,
          pointHistory: mockPointHistory,
          teams: mockTeams,
          teamPointHistory: mockTeamPointHistory,
          teamGames: mockTeamGames,
          teamSeasons: mockTeamSeasons,
          teamGoals: mockTeamGoals,
          activeSeasonId: 'season1',
          families: mockFamilies,
          familyPayments: mockFamilyPayments,
          paymentHistory: mockPaymentHistory,
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

      // ─── Team actions ─────────────────────────────────────────────────────

      createTeam: (input) => {
        const id = generateId();
        const { teams } = get();
        const movedStudents = new Set(input.studentIds);
        const updatedTeams = movedStudents.size > 0
          ? teams.map((t) => ({ ...t, studentIds: t.studentIds.filter((sid) => !movedStudents.has(sid)) }))
          : teams;

        const goal = input.goal
          ? { id: generateId(), ...input.goal, currentPoints: 0, status: 'active' as const }
          : undefined;

        const newTeam: Team = {
          id,
          name: input.name,
          description: input.description,
          color: input.color,
          emoji: input.emoji,
          studentIds: input.studentIds,
          points: 0,
          seasonPoints: 0,
          badges: [],
          createdAt: new Date().toISOString(),
          goal,
        };
        set({ teams: [...updatedTeams, newTeam] });
        return id;
      },

      updateTeam: (id, patch) => {
        set((state) => ({
          teams: state.teams.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        }));
      },

      deleteTeam: (id) => {
        set((state) => ({
          teams: state.teams.filter((t) => t.id !== id),
          teamPointHistory: state.teamPointHistory.filter((h) => h.teamId !== id),
          teamGoals: state.teamGoals.filter((g) => g.teamId !== id),
          teamGames: state.teamGames.map((g) => ({
            ...g,
            teamIds: g.teamIds.filter((tid) => tid !== id),
            winnerTeamId: g.winnerTeamId === id ? undefined : g.winnerTeamId,
          })),
        }));
      },

      addStudentToTeam: (teamId, studentId) => {
        set((state) => ({
          teams: state.teams.map((t) => {
            if (t.id === teamId) {
              return { ...t, studentIds: [...t.studentIds.filter((id) => id !== studentId), studentId] };
            }
            return { ...t, studentIds: t.studentIds.filter((id) => id !== studentId) };
          }),
        }));
      },

      removeStudentFromTeam: (teamId, studentId) => {
        set((state) => ({
          teams: state.teams.map((t) =>
            t.id === teamId
              ? { ...t, studentIds: t.studentIds.filter((id) => id !== studentId) }
              : t
          ),
        }));
      },

      awardTeamPoints: (teamId, points, reason, source, opts) => {
        const { teams, teamPointHistory, activeSeasonId } = get();
        const team = teams.find((t) => t.id === teamId);
        if (!team) return;

        const updatedGoal =
          team.goal && team.goal.status === 'active'
            ? { ...team.goal, currentPoints: team.goal.currentPoints + points }
            : team.goal;

        const updatedTeams = teams.map((t) =>
          t.id === teamId
            ? { ...t, points: t.points + points, seasonPoints: (t.seasonPoints ?? 0) + points, goal: updatedGoal }
            : t
        );

        const entry: TeamPointHistory = {
          id: generateId(),
          teamId,
          points,
          reason,
          source,
          createdAt: new Date().toISOString(),
          seasonId: opts?.seasonId !== undefined ? opts.seasonId : activeSeasonId,
          relatedGameId: opts?.relatedGameId,
          relatedGoalId: opts?.relatedGoalId,
        };

        set({ teams: updatedTeams, teamPointHistory: [...teamPointHistory, entry] });
      },

      createTeamGoal: (teamId, goal) => {
        const newGoal = { id: generateId(), ...goal, currentPoints: 0, status: 'active' as const };
        set((state) => ({
          teams: state.teams.map((t) => (t.id === teamId ? { ...t, goal: newGoal } : t)),
        }));
      },

      updateTeamGoal: (teamId, patch) => {
        set((state) => ({
          teams: state.teams.map((t) =>
            t.id === teamId && t.goal ? { ...t, goal: { ...t.goal, ...patch } } : t
          ),
        }));
      },

      completeTeamGoal: (teamId) => {
        set((state) => ({
          teams: state.teams.map((t) =>
            t.id === teamId && t.goal
              ? { ...t, goal: { ...t.goal, status: 'completed' } }
              : t
          ),
        }));
      },

      createTeamGame: (input) => {
        const game: TeamGame = {
          ...input,
          id: generateId(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ teamGames: [...state.teamGames, game] }));
      },

      startTeamGame: (gameId) => {
        set((state) => ({
          teamGames: state.teamGames.map((g) =>
            g.id === gameId ? { ...g, status: 'active' as const } : g
          ),
        }));
      },

      finishTeamGame: (gameId, winnerTeamId) => {
        const { teamGames } = get();
        const game = teamGames.find((g) => g.id === gameId);
        if (!game) return;

        const now = new Date().toISOString();
        const updatedGames = teamGames.map((g) =>
          g.id === gameId ? { ...g, status: 'finished' as const, winnerTeamId, finishedAt: now } : g
        );
        set({ teamGames: updatedGames });
        get().awardTeamPoints(winnerTeamId, game.pointsForWinner, `Победа в игре: ${game.title}`, 'game', { relatedGameId: gameId });
      },

      deleteTeamGame: (gameId) => {
        set((state) => ({
          teamGames: state.teamGames.filter((g) => g.id !== gameId),
        }));
      },

      moveStudentToTeam: (studentId, toTeamId) => {
        set((state) => ({
          teams: state.teams.map((t) => {
            if (t.id === toTeamId) {
              if (t.studentIds.includes(studentId)) return t;
              return { ...t, studentIds: [...t.studentIds, studentId] };
            }
            return { ...t, studentIds: t.studentIds.filter((id) => id !== studentId) };
          }),
        }));
      },

      setTeamMemberRole: (teamId, studentId, role) => {
        set((state) => ({
          teams: state.teams.map((t) => {
            if (t.id !== teamId) return t;
            const patch: Partial<Team> = {};
            if (role === 'captain') {
              patch.captainId = studentId;
            } else if (role === 'assistant') {
              patch.assistantCaptainId = studentId;
            } else if (role === 'discipline') {
              patch.disciplineResponsibleId = studentId;
            } else if (role === 'revision') {
              patch.revisionResponsibleId = studentId;
            }
            return { ...t, ...patch };
          }),
        }));
      },

      // ─── Seasons ─────────────────────────────────────────────────────────

      createTeamSeason: (input) => {
        const id = generateId();
        const season: TeamSeason = {
          id,
          ...input,
          status: 'active',
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          teamSeasons: [...state.teamSeasons, season],
          activeSeasonId: id,
        }));
        return id;
      },

      finishTeamSeason: (seasonId) => {
        const { teams, teamSeasons } = get();
        const sorted = [...teams].sort((a, b) => (b.seasonPoints ?? 0) - (a.seasonPoints ?? 0));
        const winnerTeamId = sorted[0]?.id ?? null;
        set({
          teamSeasons: teamSeasons.map((s) =>
            s.id === seasonId ? { ...s, status: 'finished' as const, winnerTeamId, endDate: new Date().toISOString().split('T')[0] } : s
          ),
          activeSeasonId: null,
        });
      },

      setActiveTeamSeason: (seasonId) => {
        set({ activeSeasonId: seasonId });
      },

      resetSeasonPoints: () => {
        set((state) => ({
          teams: state.teams.map((t) => ({ ...t, seasonPoints: 0 })),
        }));
      },

      // ─── Rich goals ───────────────────────────────────────────────────────

      createRichTeamGoal: (input) => {
        const goal: RichTeamGoal = {
          ...input,
          id: generateId(),
          currentValue: 0,
          status: 'active',
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ teamGoals: [...state.teamGoals, goal] }));
      },

      updateRichTeamGoal: (id, patch) => {
        set((state) => ({
          teamGoals: state.teamGoals.map((g) => (g.id === id ? { ...g, ...patch } : g)),
        }));
      },

      completeRichTeamGoal: (id) => {
        const now = new Date().toISOString();
        set((state) => ({
          teamGoals: state.teamGoals.map((g) =>
            g.id === id ? { ...g, status: 'completed' as const, completedAt: now } : g
          ),
        }));
      },

      failRichTeamGoal: (id) => {
        set((state) => ({
          teamGoals: state.teamGoals.map((g) =>
            g.id === id ? { ...g, status: 'failed' as const } : g
          ),
        }));
      },

      deleteRichTeamGoal: (id) => {
        set((state) => ({
          teamGoals: state.teamGoals.filter((g) => g.id !== id),
        }));
      },

      // ─── Badges ───────────────────────────────────────────────────────────

      awardTeamBadge: (teamId, type) => {
        const meta = BADGE_META[type];
        const badge: TeamBadge = {
          id: generateId(),
          teamId,
          type,
          title: meta.title,
          icon: meta.icon,
          description: meta.description,
          awardedAt: new Date().toISOString(),
        };
        set((state) => ({
          teams: state.teams.map((t) =>
            t.id === teamId
              ? { ...t, badges: [...(t.badges ?? []), badge] }
              : t
          ),
        }));
        get().awardTeamPoints(teamId, 0, `Бейдж: ${meta.title}`, 'badge');
      },

      removeTeamBadge: (teamId, badgeId) => {
        set((state) => ({
          teams: state.teams.map((t) =>
            t.id === teamId
              ? { ...t, badges: (t.badges ?? []).filter((b) => b.id !== badgeId) }
              : t
          ),
        }));
      },

      // ─── Support / Families ────────────────────────────────────────────────

      createFamily: (input) => {
        const id = generateId();
        const family: Family = { ...input, id, createdAt: new Date().toISOString() };
        set((state) => ({
          families: [
            ...state.families.map((f) => ({
              ...f,
              studentIds: f.studentIds.filter((sid) => !input.studentIds.includes(sid)),
            })),
            family,
          ],
        }));
        return id;
      },

      updateFamily: (id, patch) => {
        set((state) => ({
          families: state.families.map((f) => f.id === id ? { ...f, ...patch } : f),
        }));
      },

      deleteFamily: (id) => {
        set((state) => ({
          families: state.families.filter((f) => f.id !== id),
          familyPayments: state.familyPayments.filter((p) => p.familyId !== id),
          paymentHistory: state.paymentHistory.filter((h) => h.familyId !== id),
        }));
      },

      assignStudentToFamily: (familyId, studentId) => {
        set((state) => ({
          families: state.families.map((f) => {
            if (f.id === familyId) {
              return { ...f, studentIds: [...f.studentIds.filter((s) => s !== studentId), studentId] };
            }
            return { ...f, studentIds: f.studentIds.filter((s) => s !== studentId) };
          }),
        }));
      },

      removeStudentFromFamily: (familyId, studentId) => {
        set((state) => ({
          families: state.families.map((f) =>
            f.id === familyId ? { ...f, studentIds: f.studentIds.filter((s) => s !== studentId) } : f
          ),
        }));
      },

      setFamilySupportPlan: (familyId, planType) => {
        set((state) => ({
          families: state.families.map((f) =>
            f.id === familyId ? { ...f, supportPlanType: planType } : f
          ),
        }));
      },

      createMonthlyPayments: (month) => {
        const { families, familyPayments } = get();
        const now = new Date().toISOString();
        const newPayments: FamilyPayment[] = [];
        const newHistory: PaymentHistoryItem[] = [];

        families.forEach((family) => {
          if (familyPayments.some((p) => p.familyId === family.id && p.month === month)) return;
          const expectedAmount = calculateExpectedPayment(family.supportPlanType, family.studentIds.length);
          const paymentId = generateId();
          newPayments.push({
            id: paymentId,
            familyId: family.id,
            month,
            expectedAmount,
            paidAmount: 0,
            status: getPaymentStatus(expectedAmount, 0),
            createdAt: now,
          });
          newHistory.push({
            id: generateId(),
            familyId: family.id,
            paymentId,
            amount: expectedAmount,
            action: 'created',
            comment: `Начислено за ${formatMonth(month)}`,
            createdAt: now,
          });
        });

        if (newPayments.length > 0) {
          set((state) => ({
            familyPayments: [...state.familyPayments, ...newPayments],
            paymentHistory: [...state.paymentHistory, ...newHistory],
          }));
        }
      },

      markFamilyPaymentPaid: (familyId, month, amount, method, comment) => {
        const now = new Date().toISOString();
        const state = get();
        const existing = state.familyPayments.find((p) => p.familyId === familyId && p.month === month);

        if (existing) {
          const newPaid = existing.paidAmount + amount;
          const newStatus = getPaymentStatus(existing.expectedAmount, newPaid);
          const histAction = newStatus === 'paid' || newStatus === 'overpaid' ? 'paid' : 'partial_paid';
          const histItem: PaymentHistoryItem = {
            id: generateId(), familyId, paymentId: existing.id, amount,
            action: histAction, comment, createdAt: now,
          };
          set((s) => ({
            familyPayments: s.familyPayments.map((p) =>
              p.id === existing.id
                ? { ...p, paidAmount: newPaid, status: newStatus, paidAt: now, paymentMethod: method, comment: comment ?? p.comment, updatedAt: now }
                : p
            ),
            paymentHistory: [...s.paymentHistory, histItem],
          }));
        } else {
          const family = state.families.find((f) => f.id === familyId);
          const expectedAmount = family
            ? calculateExpectedPayment(family.supportPlanType, family.studentIds.length)
            : 0;
          const newStatus = getPaymentStatus(expectedAmount, amount);
          const paymentId = generateId();
          const payment: FamilyPayment = {
            id: paymentId, familyId, month, expectedAmount, paidAmount: amount,
            status: newStatus, paidAt: now, paymentMethod: method, comment, createdAt: now, updatedAt: now,
          };
          const histItem: PaymentHistoryItem = {
            id: generateId(), familyId, paymentId, amount,
            action: newStatus === 'paid' || newStatus === 'overpaid' ? 'paid' : 'partial_paid',
            comment, createdAt: now,
          };
          set((s) => ({
            familyPayments: [...s.familyPayments, payment],
            paymentHistory: [...s.paymentHistory, histItem],
          }));
        }
      },

      updateFamilyPayment: (paymentId, patch) => {
        set((state) => ({
          familyPayments: state.familyPayments.map((p) => {
            if (p.id !== paymentId) return p;
            const updated = { ...p, ...patch, updatedAt: new Date().toISOString() };
            updated.status = getPaymentStatus(updated.expectedAmount, updated.paidAmount);
            return updated;
          }),
        }));
      },

      deleteFamilyPayment: (paymentId) => {
        set((state) => ({
          familyPayments: state.familyPayments.filter((p) => p.id !== paymentId),
          paymentHistory: state.paymentHistory.filter((h) => h.paymentId !== paymentId),
        }));
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

// ─── Team selectors ───────────────────────────────────────────────────────────

export const useTeams = () => useAppStore((s) => s.teams);
export const useTeamGames = () => useAppStore((s) => s.teamGames);

export const useTeamById = (id: string) =>
  useAppStore((s) => s.teams.find((t) => t.id === id));

export const useTeamPointHistory = (teamId: string) =>
  useAppStore(
    useShallow((s) =>
      s.teamPointHistory
        .filter((h) => h.teamId === teamId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    )
  );

export const useStudentTeam = (studentId: string) =>
  useAppStore((s) => s.teams.find((t) => t.studentIds.includes(studentId)));

export const useTeamSeasons = () => useAppStore((s) => s.teamSeasons);
export const useActiveSeasonId = () => useAppStore((s) => s.activeSeasonId);
export const useActiveSeason = () =>
  useAppStore((s) => s.teamSeasons.find((ts) => ts.id === s.activeSeasonId) ?? null);

export const useTeamGoals = () => useAppStore((s) => s.teamGoals);
export const useTeamGoalsByTeamId = (teamId: string) =>
  useAppStore(
    useShallow((s) =>
      s.teamGoals
        .filter((g) => g.teamId === teamId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    )
  );


// ─── Support selectors ────────────────────────────────────────────────────────

export const useFamilies = () => useAppStore((s) => s.families);

export const useFamilyById = (id: string) =>
  useAppStore((s) => s.families.find((f) => f.id === id));

export const useFamilyPayments = () => useAppStore((s) => s.familyPayments);

export const useFamilyPaymentsByFamilyId = (familyId: string) =>
  useAppStore(
    useShallow((s) =>
      s.familyPayments
        .filter((p) => p.familyId === familyId)
        .sort((a, b) => b.month.localeCompare(a.month))
    )
  );

export const usePaymentHistoryByFamilyId = (familyId: string) =>
  useAppStore(
    useShallow((s) =>
      s.paymentHistory
        .filter((h) => h.familyId === familyId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    )
  );

export const useStudentFamily = (studentId: string) =>
  useAppStore((s) => s.families.find((f) => f.studentIds.includes(studentId)));
