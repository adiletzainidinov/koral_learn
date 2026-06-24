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
  mockFamilyContacts,
  mockStudentContactLinks,
} from '@/mock';
import type {
  FamilyContact,
  StudentFamilyContactLink,
  CreateFamilyContactInput,
  UpdateFamilyContactInput,
  CreateStudentContactLinkInput,
  UpdateStudentContactLinkInput,
  FamilyRelationType,
} from '@/entities/family-contact/model/types';
import type {
  Family, FamilyPayment, PaymentHistoryItem, CreateFamilyInput, UpdateFamilyInput,
  SupportPlanType, PaymentMethod, LessonSelection, StudentPaymentRecord,
  SupportPayment, CreateSupportPaymentInput, ApplyAdvanceInput,
} from '@/entities/support/model/types';
import {
  calculateFamilyExpectedAmount, getPaymentStatus, formatMonth, derivePlanType,
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

  // ─── Family Contacts (replaces Parents) ──────────────────────────────────
  familyContacts: FamilyContact[];
  studentFamilyContactLinks: StudentFamilyContactLink[];

  createFamilyContact: (input: CreateFamilyContactInput) => string;
  updateFamilyContact: (id: string, patch: UpdateFamilyContactInput) => void;
  archiveFamilyContact: (id: string) => void;
  restoreFamilyContact: (id: string) => void;

  linkContactToStudent: (input: CreateStudentContactLinkInput) => string | null;
  updateStudentContactLink: (id: string, patch: UpdateStudentContactLinkInput) => void;
  unlinkContactFromStudent: (linkId: string) => boolean;

  setFamilyPrimaryContact: (familyId: string, contactId: string) => void;
  setFamilyBillingContact: (familyId: string, contactId: string) => void;

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
  updateFamilyLessonSelections: (familyId: string, lessonSelections: LessonSelection[]) => void;
  deduplicateSupportAccounts: () => void;
  createMonthlyPayments: (month: string) => void;
  markFamilyPaymentPaid: (familyId: string, month: string, amount: number, method: PaymentMethod, comment?: string) => void;
  markStudentPaymentPaid: (familyId: string, studentId: string, month: string, amount: number, method: PaymentMethod, comment?: string) => void;
  toggleStudentBadge: (familyId: string, studentId: string) => void;
  updateFamilyPayment: (paymentId: string, patch: Partial<Pick<FamilyPayment, 'paidAmount' | 'expectedAmount' | 'paymentMethod' | 'comment'>>) => void;
  deleteFamilyPayment: (paymentId: string) => void;

  // ─── New transaction-based payment system ──────────────────────────────────
  supportPayments: SupportPayment[];
  createSupportPayment: (input: CreateSupportPaymentInput) => string;
  updateSupportPayment: (id: string, patch: Partial<Omit<SupportPayment, 'id' | 'createdAt'>>) => void;
  deleteSupportPayment: (id: string) => void;
  /** Apply available advance balance using the provided allocation plan. */
  applyAdvanceToMonth: (input: ApplyAdvanceInput) => void;
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

// ─── Legacy relation mapping (for migration of old parent.relation strings) ──

function mapLegacyRelation(rel?: string): FamilyRelationType {
  if (!rel) return 'other';
  const map: Record<string, FamilyRelationType> = {
    'Мама': 'mother',
    'Папа': 'father',
    'Бабушка': 'grandmother',
    'Дедушка': 'grandfather',
    'Брат': 'brother',
    'Сестра': 'sister',
    'Дядя': 'uncle',
    'Тётя': 'aunt',
    'Опекун': 'guardian',
    'Родственник': 'relative',
    'Другое': 'other',
    mother: 'mother',
    father: 'father',
    guardian: 'guardian',
    relative: 'relative',
    other: 'other',
    'Приёмный родитель': 'guardian',
    'Отчим': 'stepfather',
    'Мачеха': 'stepmother',
    'Старший брат': 'brother',
    'Старшая сестра': 'sister',
  };
  return map[rel] ?? 'other';
}

// ─── Migration v1 → v2 ───────────────────────────────────────────────────────
// Converts old `parents[]` + Student.parentId + Family.parentId structure into
// `familyContacts[]` + `studentFamilyContactLinks[]` + Family.contactIds.

interface LegacyParent {
  id: string;
  fullName: string;
  whatsapp?: string;
  phone?: string;
  telegram?: string;
  instagram?: string;
  preferredContact?: 'whatsapp' | 'phone' | 'telegram' | 'instagram';
  relation?: string;
  notes?: string;
  description?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface LegacyFamily {
  id: string;
  parentId?: string;
  name?: string;
  studentIds?: string[];
  contactIds?: string[];
  primaryContactId?: string;
  billingContactId?: string;
  [k: string]: unknown;
}

interface LegacyStudent {
  id: string;
  parentId?: string;
  [k: string]: unknown;
}

function migrateV1ToV2(state: Record<string, unknown>): Record<string, unknown> {
  const oldParents = (state.parents as LegacyParent[] | undefined) ?? [];
  const students = (state.students as LegacyStudent[] | undefined) ?? [];
  const families = (state.families as LegacyFamily[] | undefined) ?? [];

  const familyContacts: FamilyContact[] = [];
  const studentFamilyContactLinks: StudentFamilyContactLink[] = [];
  const now = new Date().toISOString();

  for (const parent of oldParents) {
    // Find the family linked to this parent (if any)
    const family = families.find((f) => f.parentId === parent.id);
    const familyId = family?.id ?? generateId();

    const contactId = parent.id; // reuse same id so existing references stay valid

    const contact: FamilyContact = {
      id: contactId,
      familyId,
      fullName: parent.fullName,
      whatsapp: parent.whatsapp ?? '',
      phone: parent.phone,
      telegram: parent.telegram,
      instagram: parent.instagram,
      preferredContact: parent.preferredContact,
      notes: parent.notes ?? parent.description,
      isArchived: parent.isActive === false,
      archivedAt: parent.isActive === false ? now : undefined,
      createdAt: parent.createdAt ?? now,
      updatedAt: parent.updatedAt,
    };
    familyContacts.push(contact);

    // Create links for every student of this parent
    const parentStudents = students.filter((s) => s.parentId === parent.id);
    for (const student of parentStudents) {
      const link: StudentFamilyContactLink = {
        id: generateId(),
        familyId,
        studentId: student.id,
        contactId,
        relation: mapLegacyRelation(parent.relation),
        isPrimaryContact: true,
        canDecideEducation: true,
        canReceiveNotifications: true,
        isEmergencyContact: true,
        isBillingContact: true,
        createdAt: now,
      };
      studentFamilyContactLinks.push(link);
    }
  }

  const updatedFamilies = families.map((f) => {
    const contacts = familyContacts.filter((c) => c.familyId === f.id);
    const contactIds = contacts.map((c) => c.id);
    const primaryId =
      f.parentId && contactIds.includes(f.parentId) ? f.parentId : contactIds[0];
    return {
      ...f,
      contactIds: f.contactIds ?? contactIds,
      primaryContactId: f.primaryContactId ?? primaryId,
      billingContactId: f.billingContactId ?? primaryId,
    };
  });

  const updatedStudents = students.map((s) => {
    const next: Record<string, unknown> = { ...s };
    delete next.parentId;
    return next;
  });

  return {
    ...state,
    students: updatedStudents,
    families: updatedFamilies,
    familyContacts,
    studentFamilyContactLinks,
    parents: [],
  };
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
      familyContacts: [],
      studentFamilyContactLinks: [],
      families: [],
      familyPayments: [],
      paymentHistory: [],
      supportPayments: [],

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
          familyContacts: mockFamilyContacts,
          studentFamilyContactLinks: mockStudentContactLinks,
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
          students: state.students
            .filter((s) => s.id !== id)
            .map((s) =>
              s.friendIds?.includes(id)
                ? { ...s, friendIds: s.friendIds.filter((fid) => fid !== id) }
                : s
            ),
          assignments: state.assignments.filter((a) => a.studentId !== id),
          attendanceRecords: state.attendanceRecords.filter((r) => r.studentId !== id),
          pointHistory: state.pointHistory.filter((p) => p.studentId !== id),
          studentFamilyContactLinks: state.studentFamilyContactLinks.filter((l) => l.studentId !== id),
          families: state.families.map((f) =>
            f.studentIds.includes(id)
              ? { ...f, studentIds: f.studentIds.filter((sid) => sid !== id) }
              : f
          ),
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

      // ─── Family Contacts ─────────────────────────────────────────────────

      createFamilyContact: (input) => {
        const id = generateId();
        const now = new Date().toISOString();
        const contact: FamilyContact = {
          id,
          familyId: input.familyId,
          fullName: input.fullName,
          whatsapp: input.whatsapp,
          phone: input.phone,
          telegram: input.telegram,
          instagram: input.instagram,
          preferredContact: input.preferredContact,
          notes: input.notes,
          createdAt: now,
        };
        set((state) => ({
          familyContacts: [...state.familyContacts, contact],
          families: state.families.map((f) =>
            f.id === input.familyId
              ? {
                  ...f,
                  contactIds: f.contactIds.includes(id) ? f.contactIds : [...f.contactIds, id],
                  primaryContactId: f.primaryContactId ?? id,
                  billingContactId: f.billingContactId ?? id,
                }
              : f
          ),
        }));
        return id;
      },

      updateFamilyContact: (id, patch) => {
        const now = new Date().toISOString();
        set((state) => ({
          familyContacts: state.familyContacts.map((c) =>
            c.id === id ? { ...c, ...patch, updatedAt: now } : c
          ),
        }));
      },

      archiveFamilyContact: (id) => {
        const now = new Date().toISOString();
        set((state) => ({
          familyContacts: state.familyContacts.map((c) =>
            c.id === id ? { ...c, isArchived: true, archivedAt: now, updatedAt: now } : c
          ),
        }));
      },

      restoreFamilyContact: (id) => {
        const now = new Date().toISOString();
        set((state) => ({
          familyContacts: state.familyContacts.map((c) =>
            c.id === id ? { ...c, isArchived: false, archivedAt: undefined, updatedAt: now } : c
          ),
        }));
      },

      linkContactToStudent: (input) => {
        const { studentFamilyContactLinks, familyContacts } = get();
        const contact = familyContacts.find((c) => c.id === input.contactId);
        if (!contact) return null;
        if (contact.familyId !== input.familyId) return null;
        const duplicate = studentFamilyContactLinks.some(
          (l) => l.studentId === input.studentId && l.contactId === input.contactId
        );
        if (duplicate) return null;
        const id = generateId();
        const now = new Date().toISOString();
        const link: StudentFamilyContactLink = {
          id,
          familyId: input.familyId,
          studentId: input.studentId,
          contactId: input.contactId,
          relation: input.relation,
          customRelation: input.customRelation,
          isPrimaryContact: input.isPrimaryContact ?? false,
          canDecideEducation: input.canDecideEducation ?? false,
          canReceiveNotifications: input.canReceiveNotifications ?? true,
          isEmergencyContact: input.isEmergencyContact ?? false,
          isBillingContact: input.isBillingContact ?? false,
          createdAt: now,
        };
        set((state) => ({
          studentFamilyContactLinks: [...state.studentFamilyContactLinks, link],
        }));
        return id;
      },

      updateStudentContactLink: (id, patch) => {
        const now = new Date().toISOString();
        set((state) => ({
          studentFamilyContactLinks: state.studentFamilyContactLinks.map((l) =>
            l.id === id ? { ...l, ...patch, updatedAt: now } : l
          ),
        }));
      },

      unlinkContactFromStudent: (linkId) => {
        const state = get();
        const link = state.studentFamilyContactLinks.find((l) => l.id === linkId);
        if (!link) return false;
        const remaining = state.studentFamilyContactLinks.filter(
          (l) => l.studentId === link.studentId && l.id !== linkId
        );
        // Guard: must keep at least one link per student that already had any link
        if (remaining.length === 0) return false;
        set((s) => ({
          studentFamilyContactLinks: s.studentFamilyContactLinks.filter((l) => l.id !== linkId),
        }));
        return true;
      },

      setFamilyPrimaryContact: (familyId, contactId) => {
        set((state) => ({
          families: state.families.map((f) => {
            if (f.id !== familyId) return f;
            if (!f.contactIds.includes(contactId)) return f;
            return { ...f, primaryContactId: contactId };
          }),
        }));
      },

      setFamilyBillingContact: (familyId, contactId) => {
        set((state) => ({
          families: state.families.map((f) => {
            if (f.id !== familyId) return f;
            if (!f.contactIds.includes(contactId)) return f;
            return { ...f, billingContactId: contactId };
          }),
        }));
      },

      // ─── Support / Families ────────────────────────────────────────────────

      createFamily: (input) => {
        const { families, familyContacts } = get();
        const primaryContactId = input.primaryContactId ?? input.contactIds[0];
        const billingContactId = input.billingContactId ?? primaryContactId;
        const primaryContact = familyContacts.find((c) => c.id === primaryContactId);
        const id = generateId();
        const name = input.name ?? (primaryContact ? `Семья ${primaryContact.fullName}` : 'Семья');
        const family: Family = {
          id,
          name,
          studentIds: input.studentIds,
          contactIds: input.contactIds,
          primaryContactId,
          billingContactId,
          lessonSelections: input.lessonSelections,
          supportPlanType: input.supportPlanType,
          notes: input.notes,
          createdAt: new Date().toISOString(),
        };
        set({
          families: [
            ...families.map((f) => ({
              ...f,
              studentIds: f.studentIds.filter((sid) => !input.studentIds.includes(sid)),
            })),
            family,
          ],
        });
        // Re-home contacts and links to this family
        set((state) => ({
          familyContacts: state.familyContacts.map((c) =>
            input.contactIds.includes(c.id) ? { ...c, familyId: id } : c
          ),
          studentFamilyContactLinks: state.studentFamilyContactLinks.map((l) =>
            input.contactIds.includes(l.contactId) ? { ...l, familyId: id } : l
          ),
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
          studentFamilyContactLinks: state.studentFamilyContactLinks.filter(
            (l) => !(l.studentId === studentId && l.familyId === familyId)
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

      updateFamilyLessonSelections: (familyId, lessonSelections) => {
        const dominantPlan = derivePlanType(lessonSelections);
        set((state) => ({
          families: state.families.map((f) =>
            f.id === familyId
              ? { ...f, lessonSelections, supportPlanType: dominantPlan, updatedAt: new Date().toISOString() }
              : f
          ),
        }));
      },

      deduplicateSupportAccounts: () => {
        const { families, familyPayments, paymentHistory } = get();
        // Dedup by primaryContactId (replacement for old parentId-based dedup)
        const byPrimary = new Map<string, Family[]>();
        for (const f of families) {
          const key = f.primaryContactId ?? f.parentId;
          if (!key) continue;
          const group = byPrimary.get(key) ?? [];
          group.push(f);
          byPrimary.set(key, group);
        }

        const toDelete = new Set<string>();
        const mergedMap = new Map<string, Family>();
        let updatedPayments = [...familyPayments];
        let updatedHistory = [...paymentHistory];

        for (const [, group] of byPrimary) {
          if (group.length <= 1) continue;
          const [keeper, ...duplicates] = [...group].sort((a, b) => b.studentIds.length - a.studentIds.length);
          const mergedStudentIds = Array.from(new Set([...keeper.studentIds, ...duplicates.flatMap((d) => d.studentIds)]));
          const mergedContactIds = Array.from(new Set([...keeper.contactIds, ...duplicates.flatMap((d) => d.contactIds)]));
          mergedMap.set(keeper.id, { ...keeper, studentIds: mergedStudentIds, contactIds: mergedContactIds });
          const dupIds = new Set(duplicates.map((d) => d.id));
          updatedPayments = updatedPayments.map((p) => dupIds.has(p.familyId) ? { ...p, familyId: keeper.id } : p);
          updatedHistory = updatedHistory.map((h) => dupIds.has(h.familyId) ? { ...h, familyId: keeper.id } : h);
          duplicates.forEach((d) => toDelete.add(d.id));
        }

        const finalFamilies = families
          .filter((f) => !toDelete.has(f.id))
          .map((f) => mergedMap.get(f.id) ?? f);
        set({ families: finalFamilies, familyPayments: updatedPayments, paymentHistory: updatedHistory });
      },

      createMonthlyPayments: (month) => {
        const { families, familyPayments } = get();
        const now = new Date().toISOString();
        const newPayments: FamilyPayment[] = [];
        const newHistory: PaymentHistoryItem[] = [];

        families.forEach((family) => {
          if (familyPayments.some((p) => p.familyId === family.id && p.month === month)) return;
          const expectedAmount = calculateFamilyExpectedAmount(family);
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
          const expectedAmount = family ? calculateFamilyExpectedAmount(family) : 0;
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

      markStudentPaymentPaid: (familyId, studentId, month, amount, method, comment) => {
        const now = new Date().toISOString();
        const state = get();
        const family = state.families.find((f) => f.id === familyId);
        if (!family) return;

        const sel = family.lessonSelections?.find((ls) => ls.studentId === studentId);
        const studentExpected = sel ? sel.monthlyAmount : 0;

        const existing = state.familyPayments.find((p) => p.familyId === familyId && p.month === month);

        if (existing) {
          const prev = existing.studentPayments ?? [];
          const prevRec = prev.find((sp) => sp.studentId === studentId);
          const newStudentPaid = (prevRec?.paidAmount ?? 0) + amount;
          const newStudentStatus = getPaymentStatus(studentExpected, newStudentPaid);
          const updatedStudentPayments: StudentPaymentRecord[] = prevRec
            ? prev.map((sp) => sp.studentId === studentId
                ? { ...sp, paidAmount: newStudentPaid, status: newStudentStatus, paidAt: now }
                : sp)
            : [...prev, { studentId, expectedAmount: studentExpected, paidAmount: amount, status: newStudentStatus, paidAt: now }];

          const newFamilyPaid = updatedStudentPayments.reduce((s, sp) => s + sp.paidAmount, 0);
          const newFamilyStatus = getPaymentStatus(existing.expectedAmount, newFamilyPaid);
          const histAction = newStudentStatus === 'paid' || newStudentStatus === 'overpaid' ? 'paid' : 'partial_paid';
          const histItem: PaymentHistoryItem = {
            id: generateId(), familyId, paymentId: existing.id, amount,
            action: histAction, comment: comment ?? `Оплата за ученика`, createdAt: now,
          };
          set((s) => ({
            familyPayments: s.familyPayments.map((p) =>
              p.id === existing.id
                ? { ...p, paidAmount: newFamilyPaid, status: newFamilyStatus, paidAt: now, paymentMethod: method, updatedAt: now, studentPayments: updatedStudentPayments }
                : p
            ),
            paymentHistory: [...s.paymentHistory, histItem],
          }));
        } else {
          const familyExpected = calculateFamilyExpectedAmount(family);
          const newStudentStatus = getPaymentStatus(studentExpected, amount);
          const studentPayments: StudentPaymentRecord[] = [
            { studentId, expectedAmount: studentExpected, paidAmount: amount, status: newStudentStatus, paidAt: now },
          ];
          const newFamilyStatus = getPaymentStatus(familyExpected, amount);
          const paymentId = generateId();
          const payment: FamilyPayment = {
            id: paymentId, familyId, month, expectedAmount: familyExpected,
            paidAmount: amount, status: newFamilyStatus,
            paidAt: now, paymentMethod: method, comment, createdAt: now, updatedAt: now,
            studentPayments,
          };
          const histItem: PaymentHistoryItem = {
            id: generateId(), familyId, paymentId, amount,
            action: newFamilyStatus === 'paid' || newFamilyStatus === 'overpaid' ? 'paid' : 'partial_paid',
            comment: comment ?? `Оплата за ученика`, createdAt: now,
          };
          set((s) => ({
            familyPayments: [...s.familyPayments, payment],
            paymentHistory: [...s.paymentHistory, histItem],
          }));
        }
      },

      toggleStudentBadge: (familyId, studentId) => {
        const now = new Date().toISOString();
        set((state) => ({
          families: state.families.map((f) => {
            if (f.id !== familyId) return f;
            const sels = f.lessonSelections ?? [];
            return {
              ...f,
              lessonSelections: sels.map((ls) =>
                ls.studentId === studentId
                  ? { ...ls, badgeGiven: !ls.badgeGiven, badgeGivenAt: !ls.badgeGiven ? now : undefined }
                  : ls
              ),
              updatedAt: now,
            };
          }),
        }));
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

      createSupportPayment: (input) => {
        const now = new Date().toISOString();
        const id = generateId();
        const payment: SupportPayment = {
          id,
          familyId: input.familyId,
          month: input.month,
          studentId: input.studentId,
          amount: input.amount,
          appliedAmount: input.appliedAmount,
          overpaidAmount: input.overpaidAmount,
          overpaymentType: input.overpaymentType,
          distribution: input.distribution,
          method: input.method,
          note: input.note,
          paidByContactId: input.paidByContactId,
          paidByNameSnapshot: input.paidByNameSnapshot,
          paidAt: now,
          createdAt: now,
        };
        set((s) => ({ supportPayments: [...s.supportPayments, payment] }));
        return id;
      },

      updateSupportPayment: (id, patch) => {
        set((s) => ({
          supportPayments: s.supportPayments.map((p) =>
            p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p
          ),
        }));
      },

      deleteSupportPayment: (id) => {
        set((s) => ({ supportPayments: s.supportPayments.filter((p) => p.id !== id) }));
      },

      applyAdvanceToMonth: ({ familyId, month, amount, allocations, note }) => {
        if (amount <= 0 || allocations.length === 0) return;
        const now = new Date().toISOString();
        set((state) => ({
          supportPayments: [...state.supportPayments, {
            id: generateId(),
            familyId,
            month,
            amount,
            appliedAmount: amount,
            overpaidAmount: 0,
            kind: 'advance_usage' as const,
            allocations,
            note: note ?? `Применён аванс к ${formatMonth(month)}`,
            paidAt: now,
            createdAt: now,
          }],
        }));
      },
    }),
    {
      name: 'quranlearn-v2',
      version: 2,
      migrate: (persistedState, version) => {
        const state = (persistedState as Record<string, unknown> | null | undefined) ?? {};
        if (version < 2) {
          return migrateV1ToV2(state) as unknown as AppState;
        }
        return state as unknown as AppState;
      },
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


// ─── Family contact selectors ────────────────────────────────────────────────

export const useFamilyContacts = (familyId: string) =>
  useAppStore(
    useShallow((s) =>
      s.familyContacts.filter((c) => c.familyId === familyId && !c.isArchived)
    )
  );

export const useAllFamilyContacts = () =>
  useAppStore((s) => s.familyContacts);

export const useFamilyContactById = (id: string) =>
  useAppStore((s) => s.familyContacts.find((c) => c.id === id));

export const useStudentContactLinks = (studentId: string) =>
  useAppStore(
    useShallow((s) =>
      s.studentFamilyContactLinks.filter((l) => l.studentId === studentId)
    )
  );

export const useFamilyContactLinks = (familyId: string) =>
  useAppStore(
    useShallow((s) =>
      s.studentFamilyContactLinks.filter((l) => l.familyId === familyId)
    )
  );

export const useContactStudentLinks = (contactId: string) =>
  useAppStore(
    useShallow((s) =>
      s.studentFamilyContactLinks.filter((l) => l.contactId === contactId)
    )
  );

export const useFamilyPrimaryContact = (familyId: string) =>
  useAppStore((s) => {
    const family = s.families.find((f) => f.id === familyId);
    if (!family?.primaryContactId) {
      // Fall back to first contact in contactIds if primary not set
      const firstId = family?.contactIds?.[0];
      if (!firstId) return null;
      return s.familyContacts.find((c) => c.id === firstId) ?? null;
    }
    return s.familyContacts.find((c) => c.id === family.primaryContactId) ?? null;
  });

export const useStudentFamilyContacts = (studentId: string) =>
  useAppStore(
    useShallow((s) => {
      const links = s.studentFamilyContactLinks.filter((l) => l.studentId === studentId);
      const result: { link: StudentFamilyContactLink; contact: FamilyContact }[] = [];
      for (const link of links) {
        const contact = s.familyContacts.find((c) => c.id === link.contactId);
        if (contact) result.push({ link, contact });
      }
      return result;
    })
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

export const useSupportPaymentsByFamilyId = (familyId: string) =>
  useAppStore(
    useShallow((s) =>
      s.supportPayments
        .filter((p) => p.familyId === familyId)
        .sort((a, b) => b.paidAt.localeCompare(a.paidAt))
    )
  );
