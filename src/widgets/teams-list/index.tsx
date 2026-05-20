'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, Users, Trophy, Target, Zap, ChevronRight, Star } from 'lucide-react';
import { useTeams, useAppStore, useStudents } from '@/store/app-store';
import { TEAM_COLOR_CLASSES, TEAM_COLORS, type TeamColor } from '@/entities/team/model/types';
import { cn } from '@/shared/lib/cn';

// ─── Award Points Modal ───────────────────────────────────────────────────────

function AwardPointsModal({
  teamId,
  teamName,
  onClose,
}: {
  teamId: string;
  teamName: string;
  onClose: () => void;
}) {
  const awardTeamPoints = useAppStore((s) => s.awardTeamPoints);
  const [points, setPoints] = useState('');
  const [reason, setReason] = useState('');
  const [source, setSource] = useState<'manual' | 'goal' | 'game' | 'attendance' | 'assignment'>('manual');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseInt(points, 10);
    if (!n || !reason.trim()) return;
    awardTeamPoints(teamId, n, reason.trim(), source);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-slate-900 mb-1">Начислить баллы</h2>
        <p className="text-sm text-slate-500 mb-5">Команда: <span className="font-medium text-slate-700">{teamName}</span></p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Баллы</label>
            <input
              type="number"
              min="1"
              max="9999"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              placeholder="Например: 10"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Причина</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Например: Все сдали домашнее задание"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Источник</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as typeof source)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="manual">Вручную</option>
              <option value="game">Игра</option>
              <option value="attendance">Посещаемость</option>
              <option value="assignment">Задание</option>
              <option value="goal">Цель</option>
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              Отмена
            </button>
            <button
              type="submit"
              disabled={!points || !reason.trim()}
              className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-40"
            >
              Начислить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Edit Team Modal ──────────────────────────────────────────────────────────

function EditTeamModal({
  teamId,
  initialName,
  initialDescription,
  initialColor,
  onClose,
}: {
  teamId: string;
  initialName: string;
  initialDescription?: string;
  initialColor: TeamColor;
  onClose: () => void;
}) {
  const updateTeam = useAppStore((s) => s.updateTeam);
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription ?? '');
  const [color, setColor] = useState<TeamColor>(initialColor);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    updateTeam(teamId, { name: name.trim(), description: description.trim() || undefined, color });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-slate-900 mb-5">Изменить команду</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Название</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Описание</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Цвет</label>
            <div className="flex flex-wrap gap-2">
              {TEAM_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'size-7 rounded-full transition-all',
                    TEAM_COLOR_CLASSES[c].dot,
                    color === c ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-105'
                  )}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              Отмена
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-40"
            >
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Team Card ────────────────────────────────────────────────────────────────

function TeamCard({
  team,
  students,
  onAward,
  onEdit,
}: {
  team: ReturnType<typeof useTeams>[number];
  students: ReturnType<typeof useStudents>;
  onAward: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  const router = useRouter();
  const cls = TEAM_COLOR_CLASSES[team.color as TeamColor] ?? TEAM_COLOR_CLASSES.emerald;
  const members = students.filter((s) => team.studentIds.includes(s.id));
  const goal = team.goal;
  const goalPct = goal ? Math.min(100, Math.round((goal.currentPoints / goal.targetPoints) * 100)) : 0;

  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden border-l-4 cursor-pointer',
        cls.border
      )}
      onClick={() => router.push(`/teams/${team.id}`)}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={cn('size-10 rounded-xl flex items-center justify-center text-xl shrink-0', cls.light)}>
              {team.emoji ?? '🏆'}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 truncate">{team.name}</h3>
              {team.description && (
                <p className="text-xs text-slate-400 truncate mt-0.5">{team.description}</p>
              )}
            </div>
          </div>
          <div className={cn('flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-bold shrink-0', cls.badge)}>
            <Star className="size-3.5" />
            {team.points}
          </div>
        </div>

        {/* Members */}
        <div className="flex items-center gap-1.5 mt-3">
          <Users className="size-3.5 text-slate-400 shrink-0" />
          <span className="text-xs text-slate-500">{members.length} участник{members.length === 1 ? '' : members.length < 5 ? 'а' : 'ов'}</span>
          <div className="flex gap-1 ml-2 flex-wrap">
            {members.slice(0, 4).map((s) => (
              <span key={s.id} className="text-xs text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-md">
                {s.fullName.split(' ')[0]}
              </span>
            ))}
            {members.length > 4 && (
              <span className="text-xs text-slate-400">+{members.length - 4}</span>
            )}
          </div>
        </div>
      </div>

      {/* Goal progress */}
      {goal && goal.status === 'active' && (
        <div className="px-5 pb-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <div className="flex items-center gap-1 text-slate-500">
              <Target className="size-3.5" />
              <span className="truncate max-w-[160px]">{goal.title}</span>
            </div>
            <span className={cn('font-semibold', cls.text)}>{goalPct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', cls.dot)}
              style={{ width: `${goalPct}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {goal.currentPoints} / {goal.targetPoints} баллов
            {goal.reward && ` · 🎁 ${goal.reward}`}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="px-5 pb-4 flex gap-2" onClick={(e) => e.stopPropagation()}>
        <Link
          href={`/teams/${team.id}`}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Открыть <ChevronRight className="size-3.5" />
        </Link>
        <button
          onClick={() => onAward(team.id)}
          className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-colors', cls.badge, 'hover:opacity-90')}
        >
          <Zap className="size-3.5" /> Начислить
        </button>
        <button
          onClick={() => onEdit(team.id)}
          className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          ✏️
        </button>
      </div>
    </div>
  );
}

// ─── Main Widget ──────────────────────────────────────────────────────────────

export function TeamsList() {
  const teams = useTeams();
  const students = useStudents();
  const deleteTeam = useAppStore((s) => s.deleteTeam);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'goal' | 'empty' | 'top'>('all');
  const [sort, setSort] = useState<'points' | 'members' | 'name'>('points');
  const [awardTeamId, setAwardTeamId] = useState<string | null>(null);
  const [editTeamId, setEditTeamId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const awardingTeam = teams.find((t) => t.id === awardTeamId);
  const editingTeam = teams.find((t) => t.id === editTeamId);

  const totalStudentsInTeams = new Set(teams.flatMap((t) => t.studentIds)).size;
  const topTeam = [...teams].sort((a, b) => b.points - a.points)[0];
  const activeGoals = teams.filter((t) => t.goal?.status === 'active').length;

  const filtered = teams
    .filter((t) => {
      if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filter === 'goal') return t.goal?.status === 'active';
      if (filter === 'empty') return t.studentIds.length === 0;
      if (filter === 'top') return t.points >= (topTeam?.points ?? 0) * 0.6;
      return true;
    })
    .sort((a, b) => {
      if (sort === 'members') return b.studentIds.length - a.studentIds.length;
      if (sort === 'name') return a.name.localeCompare(b.name, 'ru');
      return b.points - a.points;
    });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Команды</h1>
          <p className="text-sm text-slate-500 mt-0.5">Командная мотивация, цели и игры</p>
        </div>
        <Link
          href="/teams/new"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          <Plus className="size-4" /> Создать команду
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Команд', value: teams.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'В командах', value: `${totalStudentsInTeams} уч.`, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Лидер', value: topTeam ? `${topTeam.emoji ?? ''} ${topTeam.name}` : '—', icon: Trophy, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Активных целей', value: activeGoals, icon: Target, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
            <div className={cn('size-10 rounded-xl flex items-center justify-center', bg)}>
              <Icon className={cn('size-5', color)} />
            </div>
            <div>
              <p className="text-xs text-slate-500">{label}</p>
              <p className="font-bold text-slate-900 text-sm truncate max-w-[110px]">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            placeholder="Поиск команды..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
        <div className="flex rounded-xl border border-slate-200 overflow-hidden text-xs font-medium">
          {([
            ['all', 'Все'],
            ['goal', 'С целью'],
            ['empty', 'Без участников'],
            ['top', 'Лидеры'],
          ] as const).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              className={cn('px-3 py-2 transition-colors', filter === v ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-50')}
            >
              {label}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          <option value="points">По баллам</option>
          <option value="members">По участникам</option>
          <option value="name">По названию</option>
        </select>
      </div>

      {/* Teams grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="size-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Users className="size-8 text-slate-400" />
          </div>
          <h3 className="font-semibold text-slate-700 mb-1">
            {teams.length === 0 ? 'Команд пока нет' : 'Ничего не найдено'}
          </h3>
          <p className="text-sm text-slate-400">
            {teams.length === 0 ? 'Создайте первую команду, чтобы начать' : 'Попробуйте изменить фильтры'}
          </p>
          {teams.length === 0 && (
            <Link href="/teams/new" className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors">
              <Plus className="size-4" /> Создать команду
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              students={students}
              onAward={setAwardTeamId}
              onEdit={setEditTeamId}
            />
          ))}
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Удалить команду?</h2>
            <p className="text-sm text-slate-500 mb-5">Ученики останутся в системе, только связь с командой будет удалена.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Отмена</button>
              <button
                onClick={() => { deleteTeam(deleteConfirm); setDeleteConfirm(null); }}
                className="flex-1 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Award modal */}
      {awardTeamId && awardingTeam && (
        <AwardPointsModal
          teamId={awardTeamId}
          teamName={awardingTeam.name}
          onClose={() => setAwardTeamId(null)}
        />
      )}

      {/* Edit modal */}
      {editTeamId && editingTeam && (
        <EditTeamModal
          teamId={editTeamId}
          initialName={editingTeam.name}
          initialDescription={editingTeam.description}
          initialColor={editingTeam.color as TeamColor}
          onClose={() => setEditTeamId(null)}
        />
      )}
    </div>
  );
}
