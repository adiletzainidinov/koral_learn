'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Star, Users, Target, Zap, Plus, Trophy,
  Trash2, CheckCircle2, Swords, X, Search, MoreVertical,
  TrendingUp, Calendar, Award, Activity, Edit2,
  ChevronRight, Filter,
} from 'lucide-react';
import {
  useAppStore,
  useTeamById,
  useTeamPointHistory,
  useTeamGames,
  useStudents,
  useAttendanceRecords,
  useAssignments,
} from '@/store/app-store';
import {
  TEAM_COLOR_CLASSES,
  TEAM_COLORS,
  TEAM_SOURCE_LABELS,
  TEAM_GAME_STATUS_LABELS,
  type TeamColor,
  type TeamPointHistory,
} from '@/entities/team/model/types';
import { cn } from '@/shared/lib/cn';

// ─── Hydration guard ──────────────────────────────────────────────────────────
// Zustand persist reads localStorage synchronously, but React's first render
// (which must match SSR) sees the empty default state. After useEffect fires
// on the client the store already has the correct data, so we just wait one tick.

function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);
  return hydrated;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtShort(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
}
function weekAgoISO() {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
}
function weekAgoDate() {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
}
function getInitials(name: string) {
  const parts = name.split(' ');
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
}
function motivationalText(weeklyGrowth: number, rank: number, name: string): string {
  if (rank === 1 && weeklyGrowth > 0) return `${name} лидирует! Так держать 🏆`;
  if (weeklyGrowth >= 50) return `Отличная неделя! +${weeklyGrowth} баллов 🔥`;
  if (weeklyGrowth >= 20) return `Хороший прогресс! +${weeklyGrowth} баллов за неделю 💪`;
  if (weeklyGrowth > 0) return `Команда активна — +${weeklyGrowth} баллов за неделю`;
  return 'Начните набирать командные баллы на этой неделе!';
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TeamDetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto p-6 animate-pulse space-y-5">
      <div className="h-4 w-28 bg-slate-100 rounded-full" />
      <div className="h-44 bg-slate-100 rounded-2xl" />
      <div className="grid grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-2xl" />)}
      </div>
      <div className="h-12 bg-slate-100 rounded-xl" />
      <div className="h-64 bg-slate-100 rounded-2xl" />
    </div>
  );
}

// ─── Shared modal shell ───────────────────────────────────────────────────────

function Modal({ children, onClose, maxW = 'max-w-md' }: {
  children: React.ReactNode;
  onClose: () => void;
  maxW?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className={cn('bg-white rounded-2xl shadow-xl w-full p-6', maxW)} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

// ─── Award Points Modal ───────────────────────────────────────────────────────

function AwardModal({ teamId, onClose }: { teamId: string; onClose: () => void }) {
  const award = useAppStore((s) => s.awardTeamPoints);
  const [pts, setPts] = useState('');
  const [reason, setReason] = useState('');
  const [source, setSource] = useState<TeamPointHistory['source']>('manual');

  return (
    <Modal onClose={onClose}>
      <h2 className="text-lg font-bold text-slate-900 mb-5">Начислить баллы команде</h2>
      <form onSubmit={(e) => { e.preventDefault(); const n = parseInt(pts, 10); if (!n || !reason.trim()) return; award(teamId, n, reason.trim(), source); onClose(); }} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Баллы</label>
          <input type="number" min="1" max="9999" value={pts} onChange={(e) => setPts(e.target.value)}
            placeholder="10" autoFocus className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Причина</label>
          <input type="text" value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="Например: Все сдали задание вовремя"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Источник</label>
          <select value={source} onChange={(e) => setSource(e.target.value as typeof source)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
            <option value="manual">Вручную</option>
            <option value="game">Игра</option>
            <option value="attendance">Посещаемость</option>
            <option value="assignment">Задание</option>
            <option value="goal">Цель</option>
          </select>
        </div>
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Отмена</button>
          <button type="submit" disabled={!pts || !reason.trim()} className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-40">Начислить</button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Goal Modal ───────────────────────────────────────────────────────────────

function GoalModal({ teamId, existing, onClose }: {
  teamId: string;
  existing?: { title: string; targetPoints: number; reward?: string; deadline?: string };
  onClose: () => void;
}) {
  const createGoal = useAppStore((s) => s.createTeamGoal);
  const updateGoal = useAppStore((s) => s.updateTeamGoal);
  const [title, setTitle] = useState(existing?.title ?? '');
  const [target, setTarget] = useState(String(existing?.targetPoints ?? ''));
  const [reward, setReward] = useState(existing?.reward ?? '');
  const [deadline, setDeadline] = useState(existing?.deadline ?? '');

  return (
    <Modal onClose={onClose}>
      <h2 className="text-lg font-bold text-slate-900 mb-5">{existing ? 'Изменить цель' : 'Создать цель'}</h2>
      <form onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim() || !target) return;
        const d = { title: title.trim(), targetPoints: parseInt(target, 10), reward: reward.trim() || undefined, deadline: deadline || undefined };
        if (existing) updateGoal(teamId, d); else createGoal(teamId, d);
        onClose();
      }} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Название цели <span className="text-red-400">*</span></label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus
            placeholder="Набрать 100 баллов за месяц"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Баллов нужно <span className="text-red-400">*</span></label>
            <input type="number" min="1" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="100"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Дедлайн</label>
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Награда 🎁</label>
          <input type="text" value={reward} onChange={(e) => setReward(e.target.value)}
            placeholder="Мороженое всей команде"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
        </div>
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Отмена</button>
          <button type="submit" disabled={!title.trim() || !target} className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-40">Сохранить</button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Create Game Modal ────────────────────────────────────────────────────────

function CreateGameModal({ currentTeamId, allTeams, onClose }: {
  currentTeamId: string;
  allTeams: { id: string; name: string; emoji?: string }[];
  onClose: () => void;
}) {
  const createGame = useAppStore((s) => s.createTeamGame);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [pts, setPts] = useState('');
  const [status, setStatus] = useState<'planned' | 'active'>('planned');
  const [teamIds, setTeamIds] = useState<Set<string>>(new Set([currentTeamId]));

  function toggle(id: string) {
    if (id === currentTeamId) return;
    setTeamIds((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-lg font-bold text-slate-900 mb-5">Создать игру</h2>
      <form onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim() || !pts) return;
        createGame({ title: title.trim(), description: desc.trim() || undefined, teamIds: Array.from(teamIds), pointsForWinner: parseInt(pts, 10), status });
        onClose();
      }} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Название <span className="text-red-400">*</span></label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus placeholder="Турнир по таджвиду"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Описание</label>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Баллы победителю</label>
            <input type="number" min="1" value={pts} onChange={(e) => setPts(e.target.value)} placeholder="15"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Статус</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
              <option value="planned">Запланирована</option>
              <option value="active">Начать сейчас</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Команды</label>
          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {allTeams.map((t) => (
              <label key={t.id} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={teamIds.has(t.id)} onChange={() => toggle(t.id)}
                  disabled={t.id === currentTeamId} className="rounded border-slate-300 text-emerald-600" />
                <span className="text-sm">{t.emoji} {t.name}{t.id === currentTeamId ? ' (эта команда)' : ''}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Отмена</button>
          <button type="submit" disabled={!title.trim() || !pts} className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-40">Создать</button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Add Members Modal ────────────────────────────────────────────────────────

function AddMembersModal({ teamId, currentMemberIds, onClose }: {
  teamId: string;
  currentMemberIds: string[];
  onClose: () => void;
}) {
  const addStudent = useAppStore((s) => s.addStudentToTeam);
  const students = useStudents();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const available = useMemo(() =>
    students.filter((s) => s.isActive && !currentMemberIds.includes(s.id) &&
      (!search || s.fullName.toLowerCase().includes(search.toLowerCase()))),
    [students, currentMemberIds, search]
  );

  function toggle(id: string) { setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }); }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-lg font-bold text-slate-900 mb-4">Добавить участников</h2>
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
        <input type="text" placeholder="Поиск..." value={search} onChange={(e) => setSearch(e.target.value)} autoFocus
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
      </div>
      <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-56 overflow-y-auto mb-4">
        {available.length === 0
          ? <p className="text-center text-sm text-slate-400 py-6">{search ? 'Не найдено' : 'Все ученики уже в командах'}</p>
          : available.map((s) => (
            <label key={s.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-slate-50">
              <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} className="rounded border-slate-300 text-emerald-600" />
              <div>
                <p className="text-sm font-medium text-slate-800">{s.fullName}</p>
                <p className="text-xs text-slate-400">Группа {s.group} · {s.totalPoints} баллов</p>
              </div>
            </label>
          ))}
      </div>
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Отмена</button>
        <button onClick={() => { selected.forEach((id) => addStudent(teamId, id)); onClose(); }}
          disabled={selected.size === 0} className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-40">
          Добавить {selected.size > 0 ? `(${selected.size})` : ''}
        </button>
      </div>
    </Modal>
  );
}

// ─── Edit Team Modal ──────────────────────────────────────────────────────────

function EditTeamModal({ teamId, name: initName, description: initDesc, color: initColor, onClose }: {
  teamId: string; name: string; description?: string; color: TeamColor; onClose: () => void;
}) {
  const updateTeam = useAppStore((s) => s.updateTeam);
  const [name, setName] = useState(initName);
  const [desc, setDesc] = useState(initDesc ?? '');
  const [color, setColor] = useState<TeamColor>(initColor);

  return (
    <Modal onClose={onClose}>
      <h2 className="text-lg font-bold text-slate-900 mb-5">Редактировать команду</h2>
      <form onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return; updateTeam(teamId, { name: name.trim(), description: desc.trim() || undefined, color }); onClose(); }} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Название</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Описание</label>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Цвет</label>
          <div className="flex flex-wrap gap-2">
            {TEAM_COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)}
                className={cn('size-7 rounded-full transition-all', TEAM_COLOR_CLASSES[c].dot, color === c ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-105 opacity-70 hover:opacity-100')} />
            ))}
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Отмена</button>
          <button type="submit" disabled={!name.trim()} className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-40">Сохранить</button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'members' | 'goals' | 'games' | 'history';
const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Обзор' },
  { id: 'members', label: 'Участники' },
  { id: 'goals', label: 'Цели' },
  { id: 'games', label: 'Игры' },
  { id: 'history', label: 'История' },
];

// ─── Animated progress bar ────────────────────────────────────────────────────

function ProgressBar({ pct, colorDot, height = 'h-2.5' }: { pct: number; colorDot: string; height?: string }) {
  const [width, setWidth] = useState(0);
  useEffect(() => { const t = setTimeout(() => setWidth(pct), 120); return () => clearTimeout(t); }, [pct]);
  return (
    <div className={cn('w-full rounded-full bg-slate-100 overflow-hidden', height)}>
      <div className={cn('h-full rounded-full transition-all duration-700 ease-out', colorDot)} style={{ width: `${width}%` }} />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TeamDetail({ teamId }: { teamId: string }) {
  const hydrated = useHydrated();
  const router = useRouter();

  const team = useTeamById(teamId);
  const history = useTeamPointHistory(teamId);
  const allGames = useTeamGames();
  const allTeams = useAppStore((s) => s.teams);
  const students = useStudents();
  const attendance = useAttendanceRecords();
  const assignments = useAssignments();
  const removeStudent = useAppStore((s) => s.removeStudentFromTeam);
  const completeGoal = useAppStore((s) => s.completeTeamGoal);
  const updateTeamGoal = useAppStore((s) => s.updateTeamGoal);
  const deleteTeam = useAppStore((s) => s.deleteTeam);
  const finishGame = useAppStore((s) => s.finishTeamGame);

  const [tab, setTab] = useState<Tab>('overview');
  const [showAward, setShowAward] = useState(false);
  const [showGoal, setShowGoal] = useState(false);
  const [showGame, setShowGame] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [finishGameId, setFinishGameId] = useState<string | null>(null);
  const [finishWinnerId, setFinishWinnerId] = useState('');

  // Members tab state
  const [memberSearch, setMemberSearch] = useState('');
  const [memberGroup, setMemberGroup] = useState('all');
  const [memberSort, setMemberSort] = useState<'points' | 'name'>('points');

  // History tab state
  const [histSearch, setHistSearch] = useState('');
  const [histSource, setHistSource] = useState<TeamPointHistory['source'] | 'all'>('all');

  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!hydrated) return <TeamDetailSkeleton />;

  if (!team) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="size-14 rounded-2xl bg-slate-100 flex items-center justify-center">
          <Users className="size-6 text-slate-400" />
        </div>
        <p className="font-semibold text-slate-700">Команда не найдена</p>
        <Link href="/teams" className="text-sm text-emerald-600 hover:underline">← Все команды</Link>
      </div>
    );
  }

  const cls = TEAM_COLOR_CLASSES[team.color as TeamColor] ?? TEAM_COLOR_CLASSES.emerald;
  const members = students.filter((s) => team.studentIds.includes(s.id));
  const teamGames = allGames.filter((g) => g.teamIds.includes(teamId));
  const goal = team.goal;
  const goalPct = goal ? Math.min(100, Math.round((goal.currentPoints / goal.targetPoints) * 100)) : 0;

  // Derived stats
  const waISO = weekAgoISO();
  const waDate = weekAgoDate();
  const weeklyGrowth = history.filter((h) => h.createdAt >= waISO).reduce((s, h) => s + h.points, 0);
  const weeklyAttendance = attendance.filter((r) => team.studentIds.includes(r.studentId) && r.date >= waDate && (r.status === 'present' || r.status === 'late')).length;
  const avgPoints = members.length > 0 ? Math.round(members.reduce((s, m) => s + m.totalPoints, 0) / members.length) : 0;
  const gamesWon = allGames.filter((g) => g.winnerTeamId === teamId).length;
  const rank = [...allTeams].sort((a, b) => b.points - a.points).findIndex((t) => t.id === teamId) + 1;
  const streakDays = new Set(history.filter((h) => h.createdAt >= waISO).map((h) => h.createdAt.split('T')[0])).size;

  // Members tab derived
  const groups = [...new Set(members.map((m) => m.group).filter(Boolean))].sort();
  const filteredMembers = members
    .filter((m) => {
      const matchSearch = !memberSearch || m.fullName.toLowerCase().includes(memberSearch.toLowerCase());
      const matchGroup = memberGroup === 'all' || m.group === memberGroup;
      return matchSearch && matchGroup;
    })
    .sort((a, b) => memberSort === 'name' ? a.fullName.localeCompare(b.fullName, 'ru') : b.totalPoints - a.totalPoints);

  // History tab derived
  const filteredHistory = history.filter((h) => {
    const matchSource = histSource === 'all' || h.source === histSource;
    const matchSearch = !histSearch || h.reason.toLowerCase().includes(histSearch.toLowerCase());
    return matchSource && matchSearch;
  });

  // Finish game
  const finishingGame = allGames.find((g) => g.id === finishGameId);
  const finishingGameTeams = finishingGame ? allTeams.filter((t) => finishingGame.teamIds.includes(t.id)) : [];

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto pb-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-5 pt-2">
        <Link href="/teams" className="hover:text-slate-600 transition-colors flex items-center gap-1">
          <Users className="size-3.5" /> Команды
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-slate-700 font-medium">{team.name}</span>
      </div>

      {/* ── Team Header ───────────────────────────────────────────────────── */}
      <div className={cn('rounded-2xl border border-slate-100 overflow-hidden mb-6 shadow-sm')}>
        {/* Color stripe */}
        <div className={cn('h-2', cls.dot)} />

        <div className="px-6 py-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            {/* Left: identity */}
            <div className="flex items-center gap-4">
              <div className={cn('size-16 rounded-2xl flex items-center justify-center text-4xl shrink-0 border-2', cls.light, cls.ring)}>
                {team.emoji ?? '🏆'}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold text-slate-900">{team.name}</h1>
                  {rank <= 3 && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                      {rank === 1 ? '🥇 Лидер' : rank === 2 ? '🥈 2-е место' : '🥉 3-е место'}
                    </span>
                  )}
                </div>
                {team.description && <p className="text-sm text-slate-500 mt-0.5">{team.description}</p>}
                <div className="flex items-center gap-4 mt-2 flex-wrap">
                  <span className={cn('flex items-center gap-1 text-sm font-bold', cls.text)}>
                    <Star className="size-3.5" /> {team.points} баллов
                  </span>
                  <span className="flex items-center gap-1 text-sm text-slate-500">
                    <Users className="size-3.5" /> {members.length} участников
                  </span>
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <Calendar className="size-3" /> с {fmtDate(team.createdAt)}
                  </span>
                  <span className="text-xs text-slate-400">#{rank} в рейтинге</span>
                </div>
              </div>
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => setShowAddMembers(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                <Plus className="size-4" /> Участники
              </button>
              <button onClick={() => setShowAward(true)}
                className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors', cls.badge, 'hover:opacity-90')}>
                <Zap className="size-4" /> Начислить
              </button>
              <button onClick={() => setShowGoal(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                <Target className="size-4" /> Цель
              </button>

              {/* Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button onClick={() => setShowDropdown(!showDropdown)}
                  className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                  <MoreVertical className="size-4" />
                </button>
                {showDropdown && (
                  <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl border border-slate-200 shadow-lg z-20 py-1">
                    <button onClick={() => { setShowEdit(true); setShowDropdown(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 text-left">
                      <Edit2 className="size-4" /> Редактировать
                    </button>
                    <button onClick={() => { setShowGame(true); setShowDropdown(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 text-left">
                      <Swords className="size-4" /> Создать игру
                    </button>
                    <div className="h-px bg-slate-100 my-1" />
                    <button onClick={() => { setDeleteConfirm(true); setShowDropdown(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 text-left">
                      <Trash2 className="size-4" /> Удалить команду
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Active goal progress in header */}
          {goal?.status === 'active' && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-500 flex items-center gap-1"><Target className="size-3.5" /> {goal.title}</span>
                <span className={cn('font-bold', cls.text)}>{goalPct}%{goal.reward ? ` · 🎁 ${goal.reward}` : ''}</span>
              </div>
              <ProgressBar pct={goalPct} colorDot={cls.dot} height="h-2" />
              <p className="text-xs text-slate-400 mt-1">{goal.currentPoints} / {goal.targetPoints} баллов{goal.deadline ? ` · до ${new Date(goal.deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}` : ''}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Stats grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: 'Всего баллов', value: team.points, icon: Star, color: cls.text, bg: cls.light },
          { label: 'Средний балл', value: avgPoints, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Участников', value: members.length, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Побед', value: gamesWon, icon: Trophy, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Посещений/нед.', value: weeklyAttendance, icon: Calendar, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Рост за неделю', value: weeklyGrowth > 0 ? `+${weeklyGrowth}` : '—', icon: Activity, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200 p-3.5 flex flex-col gap-2">
            <div className={cn('size-8 rounded-lg flex items-center justify-center', bg)}>
              <Icon className={cn('size-4', color)} />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900 leading-none">{value}</p>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Motivational banner ─────────────────────────────────────────────── */}
      {(weeklyGrowth > 0 || rank === 1) && (
        <div className={cn('rounded-xl px-5 py-3.5 mb-5 flex items-center gap-3', cls.light, 'border', cls.border.replace('border-l-', 'border-'))}>
          <Award className={cn('size-5 shrink-0', cls.text)} />
          <div>
            <p className={cn('text-sm font-semibold', cls.text)}>{motivationalText(weeklyGrowth, rank, team.name)}</p>
            {streakDays > 0 && <p className="text-xs text-slate-500 mt-0.5">{streakDays} дн. активности за неделю</p>}
          </div>
        </div>
      )}

      {/* ── Sticky tabs ────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm -mx-6 px-6 py-2 mb-5 border-b border-slate-100">
        <div className="flex gap-0.5 bg-slate-100 rounded-xl p-1 overflow-x-auto max-w-full">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn('flex-1 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors min-w-0',
                tab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB: Обзор ──────────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="space-y-5">
          {/* Weekly summary */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Баллов за неделю', value: weeklyGrowth > 0 ? `+${weeklyGrowth}` : '—', sub: 'командных', color: cls.text, bg: cls.light },
              { label: 'Посещений', value: weeklyAttendance, sub: 'за 7 дней', color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Активных дней', value: streakDays, sub: 'за неделю', color: 'text-purple-600', bg: 'bg-purple-50' },
            ].map(({ label, value, sub, color, bg }) => (
              <div key={label} className={cn('rounded-2xl border border-slate-100 p-4', bg)}>
                <p className={cn('text-2xl font-bold', color)}>{value}</p>
                <p className="text-xs font-medium text-slate-700 mt-0.5">{label}</p>
                <p className="text-[11px] text-slate-400">{sub}</p>
              </div>
            ))}
          </div>

          {/* Mini leaderboard */}
          {members.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-semibold text-slate-800 text-sm">Лидеры команды</h3>
                <button onClick={() => setTab('members')} className="text-xs text-slate-400 hover:text-emerald-600 flex items-center gap-1">все <ChevronRight className="size-3" /></button>
              </div>
              <div className="divide-y divide-slate-100">
                {[...members].sort((a, b) => b.totalPoints - a.totalPoints).slice(0, 5).map((m, i) => (
                  <div key={m.id} className="px-5 py-3 flex items-center gap-3">
                    <span className="w-5 text-center text-xs font-bold text-slate-400">{i + 1}</span>
                    <div className={cn('size-8 rounded-full flex items-center justify-center text-xs font-bold text-white', cls.dot)}>
                      {getInitials(m.fullName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{m.fullName}</p>
                      <p className="text-xs text-slate-400">Группа {m.group}</p>
                    </div>
                    <span className="text-sm font-bold text-slate-700">{m.totalPoints}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent activity */}
          <div className="bg-white rounded-2xl border border-slate-200">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 text-sm">Последние начисления</h3>
              <button onClick={() => setTab('history')} className="text-xs text-slate-400 hover:text-emerald-600 flex items-center gap-1">все <ChevronRight className="size-3" /></button>
            </div>
            {history.length === 0
              ? <p className="text-center text-sm text-slate-400 py-8">Нет записей</p>
              : <div className="divide-y divide-slate-100">
                {history.slice(0, 5).map((h) => (
                  <div key={h.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-slate-700 truncate">{h.reason}</p>
                      <p className="text-xs text-slate-400">{TEAM_SOURCE_LABELS[h.source]} · {fmtShort(h.createdAt)}</p>
                    </div>
                    <span className={cn('text-sm font-bold shrink-0', cls.text)}>+{h.points}</span>
                  </div>
                ))}
              </div>
            }
          </div>
        </div>
      )}

      {/* ── TAB: Участники ──────────────────────────────────────────────────── */}
      {tab === 'members' && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
              <input type="text" placeholder="Поиск участника..." value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            {groups.length > 1 && (
              <select value={memberGroup} onChange={(e) => setMemberGroup(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-400">
                <option value="all">Все группы</option>
                {groups.map((g) => <option key={g} value={g}>Группа {g}</option>)}
              </select>
            )}
            <select value={memberSort} onChange={(e) => setMemberSort(e.target.value as typeof memberSort)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-400">
              <option value="points">По баллам</option>
              <option value="name">По имени</option>
            </select>
            <button onClick={() => setShowAddMembers(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors">
              <Plus className="size-4" /> Добавить
            </button>
          </div>

          {filteredMembers.length === 0
            ? <div className="bg-white rounded-2xl border border-slate-200 text-center py-12">
              <Users className="size-8 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-400">{members.length === 0 ? 'В команде пока нет участников' : 'Никого не найдено'}</p>
            </div>
            : <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
              {filteredMembers.map((m, i) => {
                const mAttendance = attendance.filter((r) => r.studentId === m.id);
                const mAssignments = assignments.filter((a) => a.studentId === m.id);
                const recentAtt = mAttendance.filter((r) => r.date >= waDate && (r.status === 'present' || r.status === 'late')).length;
                return (
                  <div key={m.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-slate-50/50">
                    <span className="w-5 text-center text-xs font-bold text-slate-300">{i + 1}</span>
                    <div className={cn('size-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0', cls.dot)}>
                      {getInitials(m.fullName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{m.fullName}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-slate-400">Гр. {m.group}</span>
                        <span className="text-xs text-slate-300">·</span>
                        <span className="text-xs text-slate-500">{mAttendance.length} посещ.</span>
                        <span className="text-xs text-slate-300">·</span>
                        <span className="text-xs text-slate-500">{mAssignments.filter((a) => a.status !== 'pending').length} заданий</span>
                        {recentAtt > 0 && <span className="text-xs text-emerald-600">+{recentAtt} /нед.</span>}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-slate-700 shrink-0">{m.totalPoints}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <Link href={`/students/${m.id}`}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-500 hover:text-emerald-600 hover:border-emerald-200 transition-colors">
                        Профиль
                      </Link>
                      <button onClick={() => removeStudent(teamId, m.id)}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors">
                        <X className="size-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          }
        </div>
      )}

      {/* ── TAB: Цели ───────────────────────────────────────────────────────── */}
      {tab === 'goals' && (
        <div className="space-y-4">
          {!goal
            ? <div className="bg-white rounded-2xl border border-slate-200 text-center py-14">
              <div className="size-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <Target className="size-6 text-slate-400" />
              </div>
              <p className="font-semibold text-slate-700 mb-1">Нет активной цели</p>
              <p className="text-sm text-slate-400 mb-4">Создайте цель, чтобы мотивировать команду</p>
              <button onClick={() => setShowGoal(true)} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors inline-flex items-center gap-2">
                <Plus className="size-4" /> Создать цель
              </button>
            </div>
            : <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              {/* Goal header */}
              <div className={cn('px-6 py-5 border-b border-slate-100', goal.status === 'completed' ? 'bg-emerald-50' : '')}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={cn('text-xs font-bold px-2.5 py-0.5 rounded-full',
                        goal.status === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700')}>
                        {goal.status === 'active' ? '● Активна' : '✓ Выполнена'}
                      </span>
                      {goalPct >= 100 && goal.status === 'active' && (
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700">🎉 Цель достигнута!</span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">{goal.title}</h3>
                    {goal.reward && <p className="text-sm text-slate-600 mt-1">🎁 Награда: {goal.reward}</p>}
                    {goal.deadline && <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1"><Calendar className="size-3" /> Дедлайн: {new Date(goal.deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>}
                  </div>
                  {goal.status === 'active' && (
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => setShowGoal(true)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1">
                        <Edit2 className="size-3.5" /> Изменить
                      </button>
                      <button onClick={() => completeGoal(teamId)} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors flex items-center gap-1">
                        <CheckCircle2 className="size-3.5" /> Выполнена
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress */}
              <div className="px-6 py-5">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-600 font-medium">Прогресс</span>
                  <span className={cn('font-bold', cls.text)}>{goal.currentPoints} / {goal.targetPoints} баллов</span>
                </div>
                <ProgressBar pct={goalPct} colorDot={cls.dot} height="h-4" />
                <div className="flex justify-between text-xs text-slate-400 mt-1.5">
                  <span>0</span>
                  <span className={cn('font-semibold', goalPct >= 100 ? 'text-emerald-600' : '')}>{goalPct}%</span>
                  <span>{goal.targetPoints}</span>
                </div>
              </div>
            </div>
          }

          {goal?.status === 'completed' && (
            <button onClick={() => setShowGoal(true)} className="w-full px-4 py-3 rounded-xl border border-dashed border-slate-300 text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
              <Plus className="size-4" /> Создать новую цель
            </button>
          )}
        </div>
      )}

      {/* ── TAB: Игры ───────────────────────────────────────────────────────── */}
      {tab === 'games' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500">{teamGames.length} игр · {gamesWon} побед</span>
            </div>
            <button onClick={() => setShowGame(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors">
              <Plus className="size-4" /> Создать игру
            </button>
          </div>

          {teamGames.length === 0
            ? <div className="bg-white rounded-2xl border border-slate-200 text-center py-14">
              <Swords className="size-8 text-slate-300 mx-auto mb-3" />
              <p className="font-semibold text-slate-700 mb-1">Игр пока нет</p>
              <p className="text-sm text-slate-400">Создайте первую командную игру</p>
            </div>
            : <div className="space-y-3">
              {teamGames.map((game) => {
                const gameTeams = allTeams.filter((t) => game.teamIds.includes(t.id));
                const winner = allTeams.find((t) => t.id === game.winnerTeamId);
                const isWinner = game.winnerTeamId === teamId;
                return (
                  <div key={game.id} className={cn('bg-white rounded-2xl border p-5 transition-all',
                    isWinner ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200')}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full',
                            game.status === 'planned' ? 'bg-slate-100 text-slate-600'
                              : game.status === 'active' ? 'bg-blue-100 text-blue-700'
                              : 'bg-green-100 text-green-700')}>
                            {game.status === 'active' ? '● ' : ''}{TEAM_GAME_STATUS_LABELS[game.status]}
                          </span>
                          {isWinner && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">🏆 Победа!</span>}
                          <span className="text-xs text-slate-400">{fmtDate(game.createdAt)}</span>
                        </div>
                        <h4 className="font-semibold text-slate-900">{game.title}</h4>
                        {game.description && <p className="text-sm text-slate-500 mt-0.5">{game.description}</p>}
                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 flex-wrap">
                          <span>{gameTeams.map((t) => `${t.emoji ?? ''} ${t.name}`).join(' vs ')}</span>
                          <span>🏆 {game.pointsForWinner} баллов победителю</span>
                        </div>
                        {winner && <p className="text-xs text-emerald-700 font-medium mt-1">Победитель: {winner.emoji} {winner.name}</p>}
                      </div>
                      {game.status !== 'finished' && (
                        <button onClick={() => { setFinishGameId(game.id); setFinishWinnerId(''); }}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-medium hover:bg-amber-600 shrink-0 transition-colors">
                          Завершить
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          }
        </div>
      )}

      {/* ── TAB: История ────────────────────────────────────────────────────── */}
      {tab === 'history' && (
        <div className="space-y-3">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
              <input type="text" placeholder="Поиск по причине..." value={histSearch} onChange={(e) => setHistSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div className="flex rounded-xl border border-slate-200 overflow-hidden text-xs font-medium">
              {([
                ['all', 'Все'],
                ['manual', 'Вручную'],
                ['game', 'Игра'],
                ['attendance', 'Посещ.'],
                ['assignment', 'Задание'],
              ] as const).map(([v, label]) => (
                <button key={v} onClick={() => setHistSource(v)}
                  className={cn('px-2.5 py-2 transition-colors', histSource === v ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-50')}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {filteredHistory.length === 0
              ? <p className="text-center text-sm text-slate-400 py-10">Нет записей</p>
              : <div className="divide-y divide-slate-100">
                <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide bg-slate-50">
                  <span>Причина</span>
                  <span>Источник</span>
                  <span className="text-right">Баллы</span>
                </div>
                {filteredHistory.map((h) => (
                  <div key={h.id} className="grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-3.5 items-center hover:bg-slate-50/50">
                    <div className="min-w-0">
                      <p className="text-sm text-slate-700 truncate">{h.reason}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{fmtDate(h.createdAt)}</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-lg bg-slate-100 text-slate-500 whitespace-nowrap">
                      {TEAM_SOURCE_LABELS[h.source]}
                    </span>
                    <span className={cn('text-sm font-bold text-right', cls.text)}>+{h.points}</span>
                  </div>
                ))}
              </div>
            }
          </div>
        </div>
      )}

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {showAward && <AwardModal teamId={teamId} onClose={() => setShowAward(false)} />}
      {showGoal && <GoalModal teamId={teamId} existing={goal?.status === 'active' ? goal : undefined} onClose={() => setShowGoal(false)} />}
      {showGame && <CreateGameModal currentTeamId={teamId} allTeams={allTeams} onClose={() => setShowGame(false)} />}
      {showAddMembers && <AddMembersModal teamId={teamId} currentMemberIds={team.studentIds} onClose={() => setShowAddMembers(false)} />}
      {showEdit && <EditTeamModal teamId={teamId} name={team.name} description={team.description} color={team.color as TeamColor} onClose={() => setShowEdit(false)} />}

      {/* Finish game */}
      {finishGameId && finishingGame && (
        <Modal onClose={() => setFinishGameId(null)}>
          <h2 className="text-lg font-bold text-slate-900 mb-1">Завершить игру</h2>
          <p className="text-sm text-slate-500 mb-4">{finishingGame.title} · +{finishingGame.pointsForWinner} баллов победителю</p>
          <div className="space-y-2 mb-5">
            {finishingGameTeams.map((t) => (
              <label key={t.id} className={cn('flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                finishWinnerId === t.id ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50')}>
                <input type="radio" name="winner" value={t.id} checked={finishWinnerId === t.id}
                  onChange={(e) => setFinishWinnerId(e.target.value)} className="text-emerald-600" />
                <span className="text-sm font-medium flex-1">{t.emoji} {t.name}</span>
                <span className="text-xs text-slate-400">{t.points} баллов</span>
              </label>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setFinishGameId(null)} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Отмена</button>
            <button onClick={() => { finishGame(finishGameId, finishWinnerId); setFinishGameId(null); setFinishWinnerId(''); }}
              disabled={!finishWinnerId}
              className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-40 flex items-center justify-center gap-1.5">
              <Trophy className="size-4" /> Завершить
            </button>
          </div>
        </Modal>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <Modal onClose={() => setDeleteConfirm(false)}>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Удалить команду?</h2>
          <p className="text-sm text-slate-500 mb-5">Ученики останутся в системе. Это действие нельзя отменить.</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteConfirm(false)} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Отмена</button>
            <button onClick={() => { deleteTeam(teamId); router.push('/teams'); }}
              className="flex-1 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600">Удалить</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
