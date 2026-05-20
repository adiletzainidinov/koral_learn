'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Search, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useAppStore, useActiveStudents } from '@/store/app-store';
import { TEAM_COLORS, TEAM_COLOR_CLASSES, type TeamColor } from '@/entities/team/model/types';
import { cn } from '@/shared/lib/cn';

const EMOJI_OPTIONS = ['🌿', '💡', '✨', '🌟', '🔥', '⚡', '🎯', '🏆', '🌙', '📖', '🕌', '🌺'];

export function CreateTeamPage() {
  const router = useRouter();
  const createTeam = useAppStore((s) => s.createTeam);
  const students = useActiveStudents();

  // Basics
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<TeamColor>('emerald');
  const [emoji, setEmoji] = useState('🏆');

  // Students
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [studentSearch, setStudentSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState<string>('all');

  // Goal
  const [showGoal, setShowGoal] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalPoints, setGoalPoints] = useState('');
  const [goalReward, setGoalReward] = useState('');
  const [goalDeadline, setGoalDeadline] = useState('');

  const groups = useMemo(() => {
    const gs = new Set(students.map((s) => s.group).filter(Boolean));
    return Array.from(gs).sort();
  }, [students]);

  const filteredStudents = useMemo(() =>
    students.filter((s) => {
      const matchSearch = !studentSearch || s.fullName.toLowerCase().includes(studentSearch.toLowerCase());
      const matchGroup = groupFilter === 'all' || s.group === groupFilter;
      return matchSearch && matchGroup;
    }),
    [students, studentSearch, groupFilter]
  );

  const selectedStudents = students.filter((s) => selectedIds.has(s.id));

  function toggleStudent(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const id = createTeam({
      name: name.trim(),
      description: description.trim() || undefined,
      color,
      emoji,
      studentIds: Array.from(selectedIds),
      goal:
        showGoal && goalTitle.trim() && goalPoints
          ? {
              title: goalTitle.trim(),
              targetPoints: parseInt(goalPoints, 10),
              reward: goalReward.trim() || undefined,
              deadline: goalDeadline || undefined,
            }
          : undefined,
    });
    router.push(`/teams/${id}`);
  }

  const cls = TEAM_COLOR_CLASSES[color];

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Back */}
      <Link href="/teams" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors">
        <ArrowLeft className="size-4" /> Назад к командам
      </Link>

      <h1 className="text-2xl font-bold text-slate-900 mb-1">Новая команда</h1>
      <p className="text-sm text-slate-500 mb-8">Заполните основные данные и добавьте участников</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Section 1: Basics ── */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <h2 className="font-semibold text-slate-800">Основное</h2>

          {/* Preview */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className={cn('size-12 rounded-xl flex items-center justify-center text-2xl', cls.light)}>
              {emoji}
            </div>
            <div>
              <p className="font-bold text-slate-900">{name || 'Название команды'}</p>
              <p className="text-xs text-slate-400">{description || 'Описание команды'}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Название <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: Аль-Фатиха"
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
              placeholder="Краткое описание команды"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
            />
          </div>

          {/* Emoji */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Иконка</label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={cn(
                    'size-9 rounded-lg text-xl flex items-center justify-center border transition-all',
                    emoji === e ? 'border-emerald-400 bg-emerald-50 scale-110' : 'border-slate-200 hover:border-slate-300'
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
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
                    color === c ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-105 opacity-70 hover:opacity-100'
                  )}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ── Section 2: Students ── */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Участники</h2>
            {selectedIds.size > 0 && (
              <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full', cls.badge)}>
                Выбрано: {selectedIds.size}
              </span>
            )}
          </div>

          {/* Selected chips */}
          {selectedStudents.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedStudents.map((s) => (
                <span
                  key={s.id}
                  className="flex items-center gap-1 text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-full"
                >
                  {s.fullName.split(' ')[0]} {s.fullName.split(' ')[1]?.[0]}.
                  <button type="button" onClick={() => toggleStudent(s.id)} className="text-slate-400 hover:text-slate-600 ml-0.5">
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="text-xs text-slate-400 hover:text-slate-600 px-1 py-1"
              >
                Снять все
              </button>
            </div>
          )}

          {/* Search + filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Поиск по имени..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="all">Все группы</option>
              {groups.map((g) => <option key={g} value={g}>Группа {g}</option>)}
            </select>
          </div>

          {/* Student list */}
          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-64 overflow-y-auto">
            {filteredStudents.length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-6">Ученики не найдены</p>
            ) : (
              filteredStudents.map((s) => (
                <label
                  key={s.id}
                  className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(s.id)}
                    onChange={() => toggleStudent(s.id)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-400"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{s.fullName}</p>
                    <p className="text-xs text-slate-400">Группа {s.group} · {s.totalPoints} баллов</p>
                  </div>
                </label>
              ))
            )}
          </div>
        </section>

        {/* ── Section 3: Goal ── */}
        <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowGoal(!showGoal)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
          >
            <div>
              <h2 className="font-semibold text-slate-800">Первая цель</h2>
              <p className="text-xs text-slate-400 mt-0.5">Опционально — создать цель для команды</p>
            </div>
            {showGoal ? <ChevronUp className="size-4 text-slate-400" /> : <ChevronDown className="size-4 text-slate-400" />}
          </button>

          {showGoal && (
            <div className="px-5 pb-5 space-y-4 border-t border-slate-100">
              <div className="pt-4">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Цель <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  placeholder="Например: Набрать 100 баллов за месяц"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Баллов нужно <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min="1"
                    value={goalPoints}
                    onChange={(e) => setGoalPoints(e.target.value)}
                    placeholder="100"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Дедлайн</label>
                  <input
                    type="date"
                    value={goalDeadline}
                    onChange={(e) => setGoalDeadline(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Награда</label>
                <input
                  type="text"
                  value={goalReward}
                  onChange={(e) => setGoalReward(e.target.value)}
                  placeholder="Например: Мороженое всей команде"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            </div>
          )}
        </section>

        {/* Submit */}
        <div className="flex gap-3">
          <Link href="/teams" className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors text-center">
            Отмена
          </Link>
          <button
            type="submit"
            disabled={!name.trim()}
            className="flex-1 px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors disabled:opacity-40"
          >
            Создать команду
          </button>
        </div>
      </form>
    </div>
  );
}
