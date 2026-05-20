'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Trophy, TrendingUp, TrendingDown, Users, Search, X,
  CalendarDays, Crown, ChevronUp, ChevronDown, BookOpen, User,
} from 'lucide-react';
import Link from 'next/link';
import { Card, StatCard } from '@/shared/ui/card';
import { LevelBadge } from '@/shared/ui/badge';
import { EmptyState } from '@/shared/ui/empty-state';
import { PageHeader } from '@/shared/ui/page-header';
import { useStudents, useAssignments, useAttendanceRecords, usePointHistory } from '@/store/app-store';
import { todayISO } from '@/shared/lib/dates';
import { STUDENT_LEVEL_LABELS } from '@/entities/student/model/types';
import type { Student } from '@/entities/student/model/types';
import {
  computeMetrics, applyLbFilters, isLbFiltersActive,
  DEFAULT_LB_FILTERS, SORT_LABELS, ACTIVITY_LABELS,
} from './filters';
import type { LeaderboardFilters, StudentMetrics, SortKey } from './filters';

// ─────────────────────────────────────────────────────────────────────────────
// Podium config
// ─────────────────────────────────────────────────────────────────────────────

const PODIUM = {
  1: {
    border: 'border-amber-300',
    bg: 'bg-gradient-to-b from-amber-50 to-white',
    shadow: 'shadow-amber-200/60',
    ring: 'ring-amber-200',
    avatarBg: 'bg-amber-100 text-amber-700',
    pts: 'text-amber-600',
    label: 'text-amber-500',
    pad: 'py-8 px-5',
  },
  2: {
    border: 'border-slate-300',
    bg: 'bg-gradient-to-b from-slate-50 to-white',
    shadow: 'shadow-slate-200/50',
    ring: 'ring-slate-200',
    avatarBg: 'bg-slate-200 text-slate-600',
    pts: 'text-slate-600',
    label: 'text-slate-400',
    pad: 'py-6 px-4',
  },
  3: {
    border: 'border-orange-200',
    bg: 'bg-gradient-to-b from-orange-50 to-white',
    shadow: 'shadow-orange-100/60',
    ring: 'ring-orange-200',
    avatarBg: 'bg-orange-100 text-orange-600',
    pts: 'text-orange-500',
    label: 'text-orange-400',
    pad: 'py-6 px-4',
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function Chip({
  label, active, onClick,
  activeClass = 'bg-slate-800 text-white shadow-sm',
}: {
  label: string; active: boolean; onClick: () => void; activeClass?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150 whitespace-nowrap',
        active ? activeClass : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

function PodiumCard({ student, rank, metrics }: { student: Student; rank: 1 | 2 | 3; metrics: StudentMetrics | undefined }) {
  const cfg = PODIUM[rank];
  return (
    <Link href={`/students/${student.id}`} className="block">
      <div className={[
        'relative rounded-2xl border-2 text-center transition-all duration-200 hover:scale-[1.02] hover:shadow-xl',
        cfg.border, cfg.bg, cfg.pad,
        `shadow-lg ${cfg.shadow}`,
      ].join(' ')}>
        {/* Crown / medal badge */}
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          {rank === 1
            ? <span className="flex items-center justify-center size-7 rounded-full bg-amber-400 shadow-sm"><Crown className="size-4 text-white" /></span>
            : rank === 2
            ? <span className="text-xl leading-none">🥈</span>
            : <span className="text-xl leading-none">🥉</span>}
        </div>

        {/* Avatar */}
        <div className={[
          'size-14 rounded-full mx-auto mb-3 flex items-center justify-center text-base font-bold overflow-hidden ring-4',
          cfg.avatarBg, cfg.ring,
          rank === 1 ? 'size-16' : 'size-12',
        ].join(' ')}>
          {student.avatar
            ? <img src={student.avatar} className="size-full object-cover" alt="" />
            : student.fullName.slice(0, 2).toUpperCase()}
        </div>

        <p className="font-semibold text-slate-900 text-sm leading-tight">{student.fullName}</p>
        <p className={`text-xs mt-0.5 ${cfg.label}`}>Группа {student.group}</p>

        <div className={[
          'mt-3 font-bold tabular-nums',
          cfg.pts,
          rank === 1 ? 'text-3xl' : 'text-2xl',
        ].join(' ')}>
          {student.totalPoints}
        </div>
        <p className="text-xs text-slate-400 mt-0.5">баллов</p>

        {metrics && (
          <div className="mt-3 flex justify-center gap-4 text-xs text-slate-500">
            <span title="Посещений">📅 {metrics.presentCount}</span>
            <span title="Заданий">📝 {metrics.doneCount}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

function GrowthBadge({ value }: { value: number }) {
  if (value === 0) return <span className="text-xs text-slate-400 tabular-nums">—</span>;
  const up = value > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums ${up ? 'text-emerald-600' : 'text-red-500'}`}>
      {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {up ? '+' : ''}{value}
    </span>
  );
}

function SortHeader({
  label, sortKey, current, dir, onClick,
}: {
  label: string; sortKey: SortKey; current: SortKey; dir: 'asc' | 'desc'; onClick: (k: SortKey) => void;
}) {
  const active = current === sortKey;
  return (
    <th
      className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer select-none hover:text-slate-800 transition-colors whitespace-nowrap"
      onClick={() => onClick(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active
          ? dir === 'desc'
            ? <ChevronDown className="size-3 text-slate-700" />
            : <ChevronUp className="size-3 text-slate-700" />
          : <ChevronDown className="size-3 text-slate-300" />}
      </span>
    </th>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function LeaderboardTable() {
  const allStudents  = useStudents().filter((s) => s.isActive);
  const assignments  = useAssignments();
  const attendance   = useAttendanceRecords();
  const pointHistory = usePointHistory();
  const router       = useRouter();

  const [filters, setFilters] = useState<LeaderboardFilters>(DEFAULT_LB_FILTERS);

  const setFilter = <K extends keyof LeaderboardFilters>(key: K, value: LeaderboardFilters[K]) =>
    setFilters((f) => ({ ...f, [key]: value }));

  const resetFilters = () => setFilters(DEFAULT_LB_FILTERS);

  // ── Derived ────────────────────────────────────────────────────────────────

  const groups = useMemo(
    () => [...new Set(allStudents.map((s) => s.group))].sort(),
    [allStudents],
  );

  const metrics = useMemo(
    () => computeMetrics(allStudents, assignments, attendance, pointHistory),
    [allStudents, assignments, attendance, pointHistory],
  );

  // Always-by-points rank (for the # column)
  const rankMap = useMemo(() => {
    const sorted = [...allStudents].sort((a, b) => b.totalPoints - a.totalPoints);
    return new Map(sorted.map((s, i) => [s.id, i + 1]));
  }, [allStudents]);

  const sorted = useMemo(
    () => applyLbFilters(allStudents, metrics, filters),
    [allStudents, metrics, filters],
  );

  // Top 3 by points for podium
  const top3 = useMemo(
    () => [...allStudents].sort((a, b) => b.totalPoints - a.totalPoints).slice(0, 3),
    [allStudents],
  );

  // Summary stats
  const today = todayISO();
  const avgPoints = allStudents.length
    ? Math.round(allStudents.reduce((n, s) => n + s.totalPoints, 0) / allStudents.length)
    : 0;
  const activeTodayCount = useMemo(() => {
    const ids = new Set(attendance.filter((r) => r.date === today).map((r) => r.studentId));
    return allStudents.filter((s) => ids.has(s.id)).length;
  }, [attendance, allStudents, today]);
  const growingCount = useMemo(
    () => allStudents.filter((s) => (metrics.get(s.id)?.growth ?? 0) > 0).length,
    [allStudents, metrics],
  );

  const filtersActive = isLbFiltersActive(filters);

  // ── Sort handler ───────────────────────────────────────────────────────────

  function handleSort(key: SortKey) {
    setFilters((f) => ({
      ...f,
      sortKey: key,
      sortDir: f.sortKey === key ? (f.sortDir === 'desc' ? 'asc' : 'desc') : 'desc',
    }));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div>
      <PageHeader
        title="Рейтинг"
        description="Топ учеников по баллам · кликните строку для перехода в профиль"
      />

      {/* ── Summary cards ────────────────────────────────────────────────── */}
      {allStudents.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Всего учеников"
            value={allStudents.length}
            icon={<Users className="size-5" />}
            accent="emerald"
          />
          <StatCard
            label="Средний балл"
            value={avgPoints}
            sub="б. на ученика"
            icon={<Trophy className="size-5" />}
            accent="blue"
          />
          <StatCard
            label="Отмечались сегодня"
            value={activeTodayCount}
            sub={`из ${allStudents.length} учеников`}
            icon={<CalendarDays className="size-5" />}
            accent="amber"
          />
          <StatCard
            label="Растут за неделю"
            value={growingCount}
            sub="набрали баллы"
            icon={<TrendingUp className="size-5" />}
            accent="purple"
          />
        </div>
      )}

      {/* ── Podium — only when unfiltered and 3+ students ────────────────── */}
      {!filtersActive && top3.length >= 3 && (
        <div className="mb-8">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Топ 3</p>
          {/* items-end: cards align at bottom — taller gold card extends higher */}
          <div className="grid grid-cols-3 gap-4 items-end max-w-2xl mx-auto">
            <div className="mt-6"><PodiumCard rank={2} student={top3[1]} metrics={metrics.get(top3[1].id)} /></div>
            <div>            <PodiumCard rank={1} student={top3[0]} metrics={metrics.get(top3[0].id)} /></div>
            <div className="mt-12"><PodiumCard rank={3} student={top3[2]} metrics={metrics.get(top3[2].id)} /></div>
          </div>
        </div>
      )}

      {/* ── Sticky control bar ───────────────────────────────────────────── */}
      <div className="sticky top-14 z-10 -mx-6 xl:-mx-8 px-6 xl:px-8 pt-3 pb-2 mb-5 bg-white/95 backdrop-blur-sm border-b border-slate-100 shadow-sm space-y-0">

        {/* ── Row 1: search + group + level chips ──────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 pb-2">
          {/* Label */}
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide shrink-0 mr-1">
            Фильтры
          </span>

          {/* Search */}
          <div className="relative shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Поиск..."
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
              className="pl-8 pr-7 h-7 w-44 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
            {filters.search && (
              <button
                onClick={() => setFilter('search', '')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          {/* Group chips */}
          {groups.length > 0 && (
            <>
              <div className="h-3.5 w-px bg-slate-200 shrink-0" />
              <div className="flex flex-wrap gap-1">
                <Chip label="Все группы" active={filters.group === 'ALL'} onClick={() => setFilter('group', 'ALL')} />
                {groups.map((g) => (
                  <Chip key={g} label={`Группа ${g}`} active={filters.group === g} onClick={() => setFilter('group', g)} />
                ))}
              </div>
            </>
          )}

          {/* Level chips */}
          <div className="h-3.5 w-px bg-slate-200 shrink-0" />
          <div className="flex flex-wrap gap-1">
            <Chip label="Все уровни" active={filters.level === 'ALL'} onClick={() => setFilter('level', 'ALL')} />
            {(['beginner', 'intermediate', 'advanced'] as const).map((l) => (
              <Chip
                key={l}
                label={STUDENT_LEVEL_LABELS[l]}
                active={filters.level === l}
                activeClass={
                  l === 'beginner'     ? 'bg-slate-600 text-white shadow-sm'
                  : l === 'intermediate' ? 'bg-blue-500 text-white shadow-sm'
                  : 'bg-purple-500 text-white shadow-sm'
                }
                onClick={() => setFilter('level', l)}
              />
            ))}
          </div>

          {/* Counter + reset — far right */}
          <div className="ml-auto flex items-center gap-2 shrink-0">
            {filtersActive && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                <X className="size-3" />
                Сбросить
              </button>
            )}
            <span className="text-xs text-slate-400 tabular-nums">
              {filtersActive
                ? `${sorted.length} из ${allStudents.length}`
                : `${allStudents.length} учеников`}
            </span>
          </div>
        </div>

        {/* ── Divider ───────────────────────────────────────────────────────── */}
        <div className="border-t border-slate-100" />

        {/* ── Row 2: activity filter chips + sort chips ─────────────────────── */}
        {allStudents.length > 0 && (
          <div className="flex flex-wrap items-center gap-0 pt-2 pb-1">

            {/* FILTER zone */}
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide shrink-0">
                Активность
              </span>
              <div className="flex flex-wrap gap-1">
                {(Object.entries(ACTIVITY_LABELS) as [typeof filters.activity, string][]).map(([key, label]) => (
                  <Chip
                    key={key}
                    label={label}
                    active={filters.activity === key}
                    activeClass={
                      key === 'ALL'           ? 'bg-slate-800 text-white shadow-sm'
                      : key === 'active'      ? 'bg-emerald-500 text-white shadow-sm'
                      : key === 'growing'     ? 'bg-teal-500 text-white shadow-sm'
                      : key === 'often_absent'? 'bg-red-500 text-white shadow-sm'
                      : key === 'inactive'    ? 'bg-slate-500 text-white shadow-sm'
                      : 'bg-amber-500 text-white shadow-sm'
                    }
                    onClick={() => setFilter('activity', key)}
                  />
                ))}
              </div>
            </div>

            {/* Vertical divider */}
            <div className="self-stretch w-px bg-slate-150 mx-4 shrink-0" style={{ background: '#e9ecef' }} />

            {/* SORT zone */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                Сортировка
              </span>
              <div className="flex flex-wrap gap-1">
                {(Object.entries(SORT_LABELS) as [SortKey, string][]).map(([key, label]) => {
                  const active = filters.sortKey === key;
                  return (
                    <button
                      key={key}
                      onClick={() => handleSort(key)}
                      className={[
                        'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150',
                        active
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                      ].join(' ')}
                    >
                      {label}
                      {active && (
                        filters.sortDir === 'desc'
                          ? <ChevronDown className="size-3 opacity-80" />
                          : <ChevronUp className="size-3 opacity-80" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Empty states ──────────────────────────────────────────────────── */}
      {allStudents.length === 0 && (
        <Card>
          <EmptyState
            icon={<Trophy className="size-5" />}
            title="Учеников пока нет"
            description="Добавьте активных учеников чтобы увидеть рейтинг"
            className="py-20"
          />
        </Card>
      )}

      {allStudents.length > 0 && sorted.length === 0 && (
        <Card>
          <EmptyState
            icon={<Users className="size-5" />}
            title="Ученики не найдены"
            description="Попробуйте изменить поиск или сбросить фильтры"
            className="py-16"
            action={
              <button
                onClick={resetFilters}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-800 text-white hover:bg-slate-700 transition-colors"
              >
                Сбросить фильтры
              </button>
            }
          />
        </Card>
      )}

      {/* ── Main table ────────────────────────────────────────────────────── */}
      {sorted.length > 0 && (
        <Card padding="none">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-12">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Ученик</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Группа</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Уровень</th>
                <SortHeader label="Задания"   sortKey="assignments" current={filters.sortKey} dir={filters.sortDir} onClick={handleSort} />
                <SortHeader label="Посещения" sortKey="attendance"  current={filters.sortKey} dir={filters.sortDir} onClick={handleSort} />
                <SortHeader label="Рост"      sortKey="growth"      current={filters.sortKey} dir={filters.sortDir} onClick={handleSort} />
                <SortHeader label="Баллы"     sortKey="points"      current={filters.sortKey} dir={filters.sortDir} onClick={handleSort} />
                <th className="w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sorted.map((student) => {
                const rank  = rankMap.get(student.id) ?? 0;
                const m     = metrics.get(student.id);
                const isTop = rank <= 3;

                const rowBg =
                  rank === 1 ? 'bg-amber-50/40'
                  : rank === 2 ? 'bg-slate-50/60'
                  : rank === 3 ? 'bg-orange-50/40'
                  : '';

                const medalEl =
                  rank === 1 ? <span className="text-base">🥇</span>
                  : rank === 2 ? <span className="text-base">🥈</span>
                  : rank === 3 ? <span className="text-base">🥉</span>
                  : <span className="text-sm font-semibold text-slate-400 tabular-nums">{rank}</span>;

                return (
                  <tr
                    key={student.id}
                    onClick={() => router.push(`/students/${student.id}`)}
                    className={`group cursor-pointer transition-colors duration-150 hover:bg-slate-50 ${rowBg}`}
                  >
                    {/* Rank */}
                    <td className="px-5 py-3.5">{medalEl}</td>

                    {/* Student */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={[
                          'flex items-center justify-center text-xs font-bold shrink-0 rounded-full overflow-hidden',
                          isTop ? 'size-10' : 'size-9',
                          rank === 1 ? 'bg-amber-100 text-amber-700'
                          : rank === 2 ? 'bg-slate-200 text-slate-600'
                          : rank === 3 ? 'bg-orange-100 text-orange-600'
                          : 'bg-slate-100 text-slate-600',
                        ].join(' ')}>
                          {student.avatar
                            ? <img src={student.avatar} className="size-full object-cover" alt="" />
                            : student.fullName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className={`text-sm font-medium text-slate-900 group-hover:text-emerald-700 transition-colors ${isTop ? 'font-semibold' : ''}`}>
                            {student.fullName}
                          </p>
                          <p className="text-xs text-slate-400">{student.age} лет</p>
                        </div>
                      </div>
                    </td>

                    {/* Group */}
                    <td className="px-4 py-3.5">
                      <span className="text-sm text-slate-600">{student.group}</span>
                    </td>

                    {/* Level */}
                    <td className="px-4 py-3.5">
                      <LevelBadge level={student.level} />
                    </td>

                    {/* Assignments */}
                    <td className="px-4 py-3.5">
                      <span className="text-sm text-slate-600 tabular-nums">{m?.doneCount ?? 0}</span>
                    </td>

                    {/* Attendance */}
                    <td className="px-4 py-3.5">
                      <span className="text-sm text-slate-600 tabular-nums">{m?.presentCount ?? 0}</span>
                    </td>

                    {/* Growth */}
                    <td className="px-4 py-3.5">
                      <GrowthBadge value={m?.growth ?? 0} />
                    </td>

                    {/* Points */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-baseline gap-1">
                        <span className={`font-bold tabular-nums ${isTop ? 'text-xl' : 'text-lg'} ${rank === 1 ? 'text-amber-600' : rank === 2 ? 'text-slate-600' : rank === 3 ? 'text-orange-500' : 'text-slate-900'}`}>
                          {student.totalPoints}
                        </span>
                        <span className="text-xs text-slate-400">б.</span>
                      </div>
                    </td>

                    {/* Quick actions — visible on row hover */}
                    <td className="px-3 py-3.5">
                      <div
                        className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Link
                          href={`/students/${student.id}`}
                          title="Профиль"
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                        >
                          <User className="size-3.5" />
                        </Link>
                        <Link
                          href={`/students/${student.id}/tasks/create`}
                          title="Выдать задание"
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        >
                          <BookOpen className="size-3.5" />
                        </Link>
                        <Link
                          href="/attendance"
                          title="Отметить посещение"
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                        >
                          <CalendarDays className="size-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
