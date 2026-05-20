'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Star, Users, Target, Zap, Plus, Trophy,
  Trash2, CheckCircle2, Clock, Swords, X, Search,
} from 'lucide-react';
import {
  useAppStore,
  useTeamById,
  useTeamPointHistory,
  useTeamGames,
  useStudents,
} from '@/store/app-store';
import {
  TEAM_COLOR_CLASSES,
  TEAM_COLORS,
  TEAM_SOURCE_LABELS,
  TEAM_GAME_STATUS_LABELS,
  type TeamColor,
} from '@/entities/team/model/types';
import { cn } from '@/shared/lib/cn';

// ─── Small helpers ────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Shared modal shell ───────────────────────────────────────────────────────

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

// ─── Award Points Modal ───────────────────────────────────────────────────────

function AwardModal({ teamId, onClose }: { teamId: string; onClose: () => void }) {
  const awardTeamPoints = useAppStore((s) => s.awardTeamPoints);
  const [points, setPoints] = useState('');
  const [reason, setReason] = useState('');
  const [source, setSource] = useState<'manual' | 'goal' | 'game' | 'attendance' | 'assignment'>('manual');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseInt(points, 10);
    if (!n || !reason.trim()) return;
    awardTeamPoints(teamId, n, reason.trim(), source);
    onClose();
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-lg font-bold text-slate-900 mb-5">Начислить баллы команде</h2>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Баллы</label>
          <input type="number" min="1" max="9999" value={points} onChange={(e) => setPoints(e.target.value)}
            placeholder="10" autoFocus
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
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
          <button type="submit" disabled={!points || !reason.trim()} className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-40">Начислить</button>
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
  const createTeamGoal = useAppStore((s) => s.createTeamGoal);
  const updateTeamGoal = useAppStore((s) => s.updateTeamGoal);
  const [title, setTitle] = useState(existing?.title ?? '');
  const [targetPoints, setTargetPoints] = useState(String(existing?.targetPoints ?? ''));
  const [reward, setReward] = useState(existing?.reward ?? '');
  const [deadline, setDeadline] = useState(existing?.deadline ?? '');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !targetPoints) return;
    const data = {
      title: title.trim(),
      targetPoints: parseInt(targetPoints, 10),
      reward: reward.trim() || undefined,
      deadline: deadline || undefined,
    };
    if (existing) updateTeamGoal(teamId, data);
    else createTeamGoal(teamId, data);
    onClose();
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-lg font-bold text-slate-900 mb-5">{existing ? 'Изменить цель' : 'Создать цель'}</h2>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Цель <span className="text-red-500">*</span></label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus
            placeholder="Например: Набрать 100 баллов за месяц"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Баллов нужно <span className="text-red-500">*</span></label>
            <input type="number" min="1" value={targetPoints} onChange={(e) => setTargetPoints(e.target.value)}
              placeholder="100"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Дедлайн</label>
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Награда</label>
          <input type="text" value={reward} onChange={(e) => setReward(e.target.value)}
            placeholder="Например: Мороженое всей команде"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
        </div>
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Отмена</button>
          <button type="submit" disabled={!title.trim() || !targetPoints} className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-40">Сохранить</button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Game Modal ───────────────────────────────────────────────────────────────

function CreateGameModal({ currentTeamId, allTeams, onClose }: {
  currentTeamId: string;
  allTeams: { id: string; name: string; emoji?: string }[];
  onClose: () => void;
}) {
  const createTeamGame = useAppStore((s) => s.createTeamGame);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pointsForWinner, setPointsForWinner] = useState('');
  const [status, setStatus] = useState<'planned' | 'active'>('planned');
  const [teamIds, setTeamIds] = useState<Set<string>>(new Set([currentTeamId]));

  function toggleTeam(id: string) {
    if (id === currentTeamId) return; // always include current team
    setTeamIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !pointsForWinner) return;
    createTeamGame({
      title: title.trim(),
      description: description.trim() || undefined,
      teamIds: Array.from(teamIds),
      pointsForWinner: parseInt(pointsForWinner, 10),
      status,
    });
    onClose();
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-lg font-bold text-slate-900 mb-5">Создать игру</h2>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Название <span className="text-red-500">*</span></label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus
            placeholder="Например: Турнир по таджвиду"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Описание</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Баллы победителю</label>
            <input type="number" min="1" value={pointsForWinner} onChange={(e) => setPointsForWinner(e.target.value)}
              placeholder="15"
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
          <label className="block text-sm font-medium text-slate-700 mb-2">Участвующие команды</label>
          <div className="flex flex-col gap-1.5">
            {allTeams.map((t) => (
              <label key={t.id} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={teamIds.has(t.id)} onChange={() => toggleTeam(t.id)}
                  disabled={t.id === currentTeamId}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-400" />
                <span className="text-sm text-slate-700">{t.emoji} {t.name}{t.id === currentTeamId ? ' (текущая)' : ''}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Отмена</button>
          <button type="submit" disabled={!title.trim() || !pointsForWinner} className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-40">Создать</button>
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
  const addStudentToTeam = useAppStore((s) => s.addStudentToTeam);
  const students = useStudents();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const available = useMemo(() =>
    students.filter((s) => {
      if (currentMemberIds.includes(s.id)) return false;
      if (!s.isActive) return false;
      return !search || s.fullName.toLowerCase().includes(search.toLowerCase());
    }),
    [students, currentMemberIds, search]
  );

  function toggle(id: string) {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function submit() {
    selected.forEach((id) => addStudentToTeam(teamId, id));
    onClose();
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-lg font-bold text-slate-900 mb-4">Добавить участников</h2>
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
        <input type="text" placeholder="Поиск ученика..." value={search} onChange={(e) => setSearch(e.target.value)} autoFocus
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
      </div>
      <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-56 overflow-y-auto mb-4">
        {available.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-6">{search ? 'Не найдено' : 'Все ученики уже в командах'}</p>
        ) : (
          available.map((s) => (
            <label key={s.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-slate-50">
              <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)}
                className="rounded border-slate-300 text-emerald-600" />
              <div>
                <p className="text-sm font-medium text-slate-800">{s.fullName}</p>
                <p className="text-xs text-slate-400">Группа {s.group} · {s.totalPoints} баллов</p>
              </div>
            </label>
          ))
        )}
      </div>
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Отмена</button>
        <button onClick={submit} disabled={selected.size === 0} className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-40">
          Добавить {selected.size > 0 ? `(${selected.size})` : ''}
        </button>
      </div>
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

// ─── Main component ───────────────────────────────────────────────────────────

export function TeamDetail({ teamId }: { teamId: string }) {
  const router = useRouter();
  const team = useTeamById(teamId);
  const history = useTeamPointHistory(teamId);
  const allGames = useTeamGames();
  const allTeams = useAppStore((s) => s.teams);
  const students = useStudents();
  const removeStudentFromTeam = useAppStore((s) => s.removeStudentFromTeam);
  const completeTeamGoal = useAppStore((s) => s.completeTeamGoal);
  const deleteTeam = useAppStore((s) => s.deleteTeam);
  const finishTeamGame = useAppStore((s) => s.finishTeamGame);

  const [tab, setTab] = useState<Tab>('overview');
  const [showAward, setShowAward] = useState(false);
  const [showGoal, setShowGoal] = useState(false);
  const [showGame, setShowGame] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [finishGameId, setFinishGameId] = useState<string | null>(null);
  const [finishWinnerId, setFinishWinnerId] = useState('');

  if (!team) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-slate-500">Команда не найдена</p>
        <Link href="/teams" className="text-emerald-600 hover:underline text-sm">Назад к командам</Link>
      </div>
    );
  }

  const cls = TEAM_COLOR_CLASSES[team.color as TeamColor] ?? TEAM_COLOR_CLASSES.emerald;
  const members = students.filter((s) => team.studentIds.includes(s.id));
  const teamGames = allGames.filter((g) => g.teamIds.includes(teamId));
  const goal = team.goal;
  const goalPct = goal ? Math.min(100, Math.round((goal.currentPoints / goal.targetPoints) * 100)) : 0;

  const finishingGame = allGames.find((g) => g.id === finishGameId);
  const finishingGameTeams = finishingGame
    ? allTeams.filter((t) => finishingGame.teamIds.includes(t.id))
    : [];

  function handleFinishGame() {
    if (!finishGameId || !finishWinnerId) return;
    finishTeamGame(finishGameId, finishWinnerId);
    setFinishGameId(null);
    setFinishWinnerId('');
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Back */}
      <Link href="/teams" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-5 transition-colors">
        <ArrowLeft className="size-4" /> Все команды
      </Link>

      {/* Team header */}
      <div className={cn('rounded-2xl p-6 mb-6 border-l-4', cls.light, cls.border)}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className={cn('size-16 rounded-2xl flex items-center justify-center text-4xl', cls.light, 'border', cls.border.replace('border-l-', 'border-'))}>
              {team.emoji ?? '🏆'}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{team.name}</h1>
              {team.description && <p className="text-sm text-slate-500 mt-0.5">{team.description}</p>}
              <div className="flex items-center gap-4 mt-2">
                <span className={cn('flex items-center gap-1 text-sm font-bold', cls.text)}>
                  <Star className="size-4" /> {team.points} баллов
                </span>
                <span className="flex items-center gap-1 text-sm text-slate-500">
                  <Users className="size-4" /> {members.length} участников
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowAddMembers(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-white transition-colors">
              <Plus className="size-4" /> Участники
            </button>
            <button onClick={() => setShowAward(true)} className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors', cls.badge, 'hover:opacity-90')}>
              <Zap className="size-4" /> Начислить
            </button>
            <button onClick={() => setShowGoal(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-white transition-colors">
              <Target className="size-4" /> Цель
            </button>
            <button onClick={() => setShowGame(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-white transition-colors">
              <Swords className="size-4" /> Игра
            </button>
            <button onClick={() => setDeleteConfirm(true)} className="px-3 py-2 rounded-xl border border-red-200 text-sm text-red-500 hover:bg-red-50 transition-colors">
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>

        {/* Active goal progress in header */}
        {goal && goal.status === 'active' && (
          <div className="mt-4 pt-4 border-t border-white/60">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-600 flex items-center gap-1"><Target className="size-3.5" /> {goal.title}</span>
              <span className={cn('font-bold', cls.text)}>{goalPct}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/70 overflow-hidden">
              <div className={cn('h-full rounded-full', cls.dot)} style={{ width: `${goalPct}%` }} />
            </div>
            <p className="text-xs text-slate-500 mt-1">{goal.currentPoints} / {goal.targetPoints} баллов{goal.reward && ` · 🎁 ${goal.reward}`}</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 bg-slate-100 rounded-xl p-1 mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex-1 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
              tab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Обзор ── */}
      {tab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Баллов всего', value: team.points, icon: Star, color: cls.text, bg: cls.light },
              { label: 'Участников', value: members.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Игр сыграно', value: teamGames.filter((g) => g.status === 'finished').length, icon: Trophy, color: 'text-amber-600', bg: 'bg-amber-50' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
                <div className={cn('size-10 rounded-xl flex items-center justify-center', bg)}>
                  <Icon className={cn('size-5', color)} />
                </div>
                <div>
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="text-xl font-bold text-slate-900">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Recent history */}
          <div className="bg-white rounded-2xl border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">Последние действия</h3>
            </div>
            {history.length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-8">Нет записей</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {history.slice(0, 5).map((h) => (
                  <div key={h.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-slate-700">{h.reason}</p>
                      <p className="text-xs text-slate-400">{TEAM_SOURCE_LABELS[h.source]} · {fmtDate(h.createdAt)}</p>
                    </div>
                    <span className={cn('text-sm font-bold shrink-0', cls.text)}>+{h.points}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Участники ── */}
      {tab === 'members' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Участники команды</h3>
            <button onClick={() => setShowAddMembers(true)} className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium hover:text-emerald-700">
              <Plus className="size-4" /> Добавить
            </button>
          </div>
          {members.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400 text-sm mb-3">В команде пока нет участников</p>
              <button onClick={() => setShowAddMembers(true)} className="text-sm text-emerald-600 hover:underline">Добавить участников</button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {members.map((s) => (
                <div key={s.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{s.fullName}</p>
                    <p className="text-xs text-slate-400">Группа {s.group} · Личных баллов: {s.totalPoints}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link href={`/students/${s.id}`} className="text-xs text-slate-500 hover:text-emerald-600 transition-colors">Профиль</Link>
                    <button
                      onClick={() => removeStudentFromTeam(teamId, s.id)}
                      className="text-slate-300 hover:text-red-400 transition-colors"
                      title="Удалить из команды"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Цели ── */}
      {tab === 'goals' && (
        <div className="space-y-4">
          {!goal ? (
            <div className="bg-white rounded-2xl border border-slate-200 text-center py-12">
              <Target className="size-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm mb-4">У команды пока нет цели</p>
              <button onClick={() => setShowGoal(true)} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors">
                Создать цель
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full',
                      goal.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    )}>
                      {goal.status === 'active' ? '● Активна' : '✓ Выполнена'}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{goal.title}</h3>
                  {goal.reward && <p className="text-sm text-slate-500 mt-0.5">🎁 Награда: {goal.reward}</p>}
                  {goal.deadline && <p className="text-xs text-slate-400 mt-0.5">До {new Date(goal.deadline).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' })}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  {goal.status === 'active' && (
                    <>
                      <button onClick={() => setShowGoal(true)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50">Изменить</button>
                      <button onClick={() => completeTeamGoal(teamId)} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs hover:bg-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="size-3.5" /> Выполнена
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-slate-600">Прогресс</span>
                  <span className={cn('font-bold', cls.text)}>{goal.currentPoints} / {goal.targetPoints} баллов ({goalPct}%)</span>
                </div>
                <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                  <div className={cn('h-full rounded-full transition-all', cls.dot)} style={{ width: `${goalPct}%` }} />
                </div>
              </div>
              {goalPct >= 100 && goal.status === 'active' && (
                <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 text-center font-medium">
                  🎉 Цель достигнута! Нажмите «Выполнена» чтобы зафиксировать.
                </div>
              )}
            </div>
          )}
          {!goal && null}
          {goal && goal.status === 'completed' && (
            <button onClick={() => setShowGoal(true)} className="w-full px-4 py-3 rounded-xl border border-dashed border-slate-300 text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors">
              <Plus className="size-4 inline mr-1.5" /> Создать новую цель
            </button>
          )}
        </div>
      )}

      {/* ── Tab: Игры ── */}
      {tab === 'games' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowGame(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors">
              <Plus className="size-4" /> Создать игру
            </button>
          </div>

          {teamGames.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 text-center py-12">
              <Swords className="size-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm mb-4">Игр пока нет</p>
            </div>
          ) : (
            <div className="space-y-3">
              {teamGames.map((game) => {
                const gameTeams = allTeams.filter((t) => game.teamIds.includes(t.id));
                const winner = allTeams.find((t) => t.id === game.winnerTeamId);
                return (
                  <div key={game.id} className="bg-white rounded-2xl border border-slate-200 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full',
                            game.status === 'planned' ? 'bg-slate-100 text-slate-600'
                              : game.status === 'active' ? 'bg-blue-100 text-blue-700'
                              : 'bg-green-100 text-green-700'
                          )}>
                            {game.status === 'active' ? '● ' : ''}{TEAM_GAME_STATUS_LABELS[game.status]}
                          </span>
                          <span className="text-xs text-slate-400">{fmtDate(game.createdAt)}</span>
                        </div>
                        <h3 className="font-semibold text-slate-900">{game.title}</h3>
                        {game.description && <p className="text-sm text-slate-500 mt-0.5">{game.description}</p>}
                        <p className="text-xs text-slate-400 mt-1.5">
                          Команды: {gameTeams.map((t) => `${t.emoji ?? ''} ${t.name}`).join(', ')} · 🏆 {game.pointsForWinner} баллов победителю
                        </p>
                        {winner && <p className="text-xs text-emerald-600 font-medium mt-1">Победитель: {winner.emoji} {winner.name}</p>}
                      </div>
                      {game.status !== 'finished' && (
                        <button
                          onClick={() => { setFinishGameId(game.id); setFinishWinnerId(''); }}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-medium hover:bg-amber-600 shrink-0"
                        >
                          Завершить
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: История ── */}
      {tab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">История баллов</h3>
          </div>
          {history.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-10">Нет записей</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {history.map((h) => (
                <div key={h.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-700 truncate">{h.reason}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400">{fmtDate(h.createdAt)}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{TEAM_SOURCE_LABELS[h.source]}</span>
                    </div>
                  </div>
                  <span className={cn('text-sm font-bold shrink-0', cls.text)}>+{h.points}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Modals ── */}
      {showAward && <AwardModal teamId={teamId} onClose={() => setShowAward(false)} />}

      {showGoal && (
        <GoalModal
          teamId={teamId}
          existing={goal?.status === 'active' ? goal : undefined}
          onClose={() => setShowGoal(false)}
        />
      )}

      {showGame && (
        <CreateGameModal
          currentTeamId={teamId}
          allTeams={allTeams}
          onClose={() => setShowGame(false)}
        />
      )}

      {showAddMembers && (
        <AddMembersModal
          teamId={teamId}
          currentMemberIds={team.studentIds}
          onClose={() => setShowAddMembers(false)}
        />
      )}

      {/* Finish game modal */}
      {finishGameId && finishingGame && (
        <Modal onClose={() => setFinishGameId(null)}>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Завершить игру</h2>
          <p className="text-sm text-slate-500 mb-5">{finishingGame.title} · +{finishingGame.pointsForWinner} баллов победителю</p>
          <div className="space-y-2 mb-5">
            <label className="block text-sm font-medium text-slate-700 mb-2">Победитель</label>
            {finishingGameTeams.map((t) => (
              <label key={t.id} className={cn(
                'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                finishWinnerId === t.id ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'
              )}>
                <input type="radio" name="winner" value={t.id} checked={finishWinnerId === t.id}
                  onChange={(e) => setFinishWinnerId(e.target.value)}
                  className="text-emerald-600" />
                <span className="text-sm font-medium">{t.emoji} {t.name}</span>
                <span className="ml-auto text-xs text-slate-400">{t.points} баллов</span>
              </label>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setFinishGameId(null)} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Отмена</button>
            <button onClick={handleFinishGame} disabled={!finishWinnerId}
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
          <p className="text-sm text-slate-500 mb-5">Ученики останутся в системе. Это действие необратимо.</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteConfirm(false)} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Отмена</button>
            <button onClick={() => { deleteTeam(teamId); router.push('/teams'); }}
              className="flex-1 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600">
              Удалить
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
