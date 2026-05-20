'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { CalendarDays, CheckCircle, Search, X, Users, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { PageHeader } from '@/shared/ui/page-header';
import { EmptyState } from '@/shared/ui/empty-state';
import { useAppStore, useStudents, useAttendanceRecords } from '@/store/app-store';
import { todayISO } from '@/shared/lib/dates';
import { getEffectiveAttendanceStatus, TIMER_MAX_HOURS } from '@/entities/attendance/model/types';
import type { AttendanceStatus } from '@/entities/attendance/model/types';
import { applyFilters, isFiltersActive, DEFAULT_FILTERS } from './filters';
import type { Filters } from './filters';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const CYCLE: AttendanceStatus[] = ['present', 'late', 'absent', 'excused'];

const CFG: Record<
  AttendanceStatus,
  { label: string; rowBg: string; activeBg: string; activeText: string; accentBorder: string; statColor: string; chipActive: string }
> = {
  present: {
    label: 'Присутствовал',
    rowBg: 'bg-green-50/60', activeBg: 'bg-green-500', activeText: 'text-white',
    accentBorder: 'border-l-green-400', statColor: 'text-green-600',
    chipActive: 'bg-green-500 text-white shadow-sm',
  },
  late: {
    label: 'Опоздал',
    rowBg: 'bg-amber-50/60', activeBg: 'bg-amber-400', activeText: 'text-white',
    accentBorder: 'border-l-amber-400', statColor: 'text-amber-600',
    chipActive: 'bg-amber-400 text-white shadow-sm',
  },
  absent: {
    label: 'Отсутствовал',
    rowBg: 'bg-red-50/60', activeBg: 'bg-red-500', activeText: 'text-white',
    accentBorder: 'border-l-red-400', statColor: 'text-red-500',
    chipActive: 'bg-red-500 text-white shadow-sm',
  },
  excused: {
    label: 'Уваж. причина',
    rowBg: 'bg-blue-50/60', activeBg: 'bg-blue-500', activeText: 'text-white',
    accentBorder: 'border-l-blue-400', statColor: 'text-blue-500',
    chipActive: 'bg-blue-500 text-white shadow-sm',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// LiveAttendanceTimer — isolated; only this component re-renders each second
// ─────────────────────────────────────────────────────────────────────────────

function LiveAttendanceTimer({
  checkInAt,
  onExpire,
}: {
  checkInAt: string;
  onExpire: () => void;
}) {
  // Keep onExpire ref current without restarting the interval
  const onExpireRef = useRef(onExpire);
  useEffect(() => { onExpireRef.current = onExpire; });

  const [elapsed, setElapsed] = useState(() =>
    Math.max(0, Math.floor((Date.now() - new Date(checkInAt).getTime()) / 1000))
  );

  useEffect(() => {
    const startMs = new Date(checkInAt).getTime();
    const maxSec = TIMER_MAX_HOURS * 3600;

    const id = setInterval(() => {
      const s = Math.floor((Date.now() - startMs) / 1000);
      if (s >= maxSec) {
        clearInterval(id);
        setElapsed(maxSec);
        onExpireRef.current();
        return;
      }
      setElapsed(s);
    }, 1000);

    return () => clearInterval(id);
  }, [checkInAt]); // Only re-create when checkInAt changes

  const h = String(Math.floor(elapsed / 3600)).padStart(2, '0');
  const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
  const s = String(elapsed % 60).padStart(2, '0');

  return (
    <span className="font-mono text-xs tabular-nums text-slate-700 tracking-tight">
      {h}:{m}:{s}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Small reusable chip
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

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function AttendanceTable() {
  const students = useStudents().filter((s) => s.isActive);
  const allRecords = useAttendanceRecords();
  const markAttendance      = useAppStore((s) => s.markAttendance);
  const stopAttendanceTimer = useAppStore((s) => s.stopAttendanceTimer);
  const expireAttendanceTimer = useAppStore((s) => s.expireAttendanceTimer);

  const [date, setDate]         = useState(todayISO());
  const [filters, setFilters]   = useState<Filters>(DEFAULT_FILTERS);
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);
  const [flashId, setFlashId]   = useState<string | null>(null);

  // ── Derived data ──────────────────────────────────────────────────────────

  const groups = useMemo(
    () => [...new Set(students.map((s) => s.group))].sort(),
    [students],
  );

  const dateRecords = useMemo(
    () => allRecords.filter((r) => r.date === date),
    [allRecords, date],
  );

  const visibleStudents = useMemo(
    () => applyFilters(students, allRecords, dateRecords, filters),
    [students, allRecords, dateRecords, filters],
  );

  const stats = useMemo(() => {
    const c = { present: 0, late: 0, absent: 0, excused: 0, marked: 0 };
    visibleStudents.forEach((s) => {
      const rec = dateRecords.find((r) => r.studentId === s.id);
      if (rec) { c[rec.status]++; c.marked++; }
    });
    return c;
  }, [visibleStudents, dateRecords]);

  const runningCount = useMemo(
    () => visibleStudents.filter((s) => {
      const rec = dateRecords.find((r) => r.studentId === s.id);
      return rec?.timerStatus === 'running';
    }).length,
    [visibleStudents, dateRecords],
  );

  const filtersActive = isFiltersActive(filters);
  const allMarked = stats.marked === visibleStudents.length && visibleStudents.length > 0;

  // ── Side-effects ─────────────────────────────────────────────────────────

  useEffect(() => { setFocusedIdx(null); }, [filters, date]);

  useEffect(() => {
    if (filters.group !== 'ALL' && !groups.includes(filters.group)) {
      setFilters((f) => ({ ...f, group: 'ALL' }));
    }
  }, [groups, filters.group]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters((f) => ({ ...f, [key]: value }));

  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  const flash = useCallback((id: string) => {
    setFlashId(id);
    setTimeout(() => setFlashId(null), 280);
  }, []);

  const mark = useCallback(
    (studentId: string, status: AttendanceStatus) => {
      markAttendance(studentId, date, status);
      flash(studentId);
    },
    [date, markAttendance, flash],
  );

  const handleStop = useCallback(
    (studentId: string) => {
      stopAttendanceTimer(studentId, date);
      flash(studentId);
    },
    [date, stopAttendanceTimer, flash],
  );

  const cycleRow = useCallback(
    (studentId: string) => {
      const rec = dateRecords.find((r) => r.studentId === studentId);
      // Don't cycle if timer is actively running — stop button is the action
      if (rec?.timerStatus === 'running') return;
      const cur = rec?.status ?? 'absent';
      mark(studentId, CYCLE[(CYCLE.indexOf(cur) + 1) % CYCLE.length]);
    },
    [dateRecords, mark],
  );

  const markAll = (status: AttendanceStatus) =>
    visibleStudents.forEach((s) => markAttendance(s.id, date, status));

  const stopAllRunning = useCallback(() => {
    visibleStudents.forEach((s) => {
      const rec = dateRecords.find((r) => r.studentId === s.id);
      if (rec?.timerStatus === 'running') stopAttendanceTimer(s.id, date);
    });
  }, [visibleStudents, dateRecords, stopAttendanceTimer, date]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (focusedIdx === null) return;

      const map: Record<string, AttendanceStatus> = { '1': 'present', '2': 'late', '3': 'absent', '4': 'excused' };
      if (map[e.key]) {
        const student = visibleStudents[focusedIdx];
        if (student) mark(student.id, map[e.key]);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIdx((i) => Math.min((i ?? 0) + 1, visibleStudents.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIdx((i) => Math.max((i ?? 0) - 1, 0));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [focusedIdx, visibleStudents, mark]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div>
      <PageHeader
        title="Посещаемость"
        description="Кликните строку для смены статуса · 1 Присутствовал · 2 Опоздал · 3 Отсутствовал · 4 Уваж. причина"
      />

      {/* ── Sticky filter + action bar ─────────────────────────────────────── */}
      <div className="sticky top-14 z-10 -mx-6 xl:-mx-8 px-6 xl:px-8 py-3 mb-5 bg-white/95 backdrop-blur-sm border-b border-slate-100 shadow-sm space-y-2">

        {/* Row 1 — date · search · group chips · counter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <CalendarDays className="size-4 text-slate-400" />
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-40 h-8 text-sm"
            />
          </div>

          <div className="relative shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Поиск по имени или группе..."
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
              className="pl-8 pr-7 h-8 w-52 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
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

          {groups.length > 0 && (
            <>
              <div className="h-4 w-px bg-slate-200 shrink-0" />
              <div className="flex flex-wrap items-center gap-1">
                <Chip label="Все группы" active={filters.group === 'ALL'} onClick={() => setFilter('group', 'ALL')} />
                {groups.map((g) => (
                  <Chip key={g} label={`Группа ${g}`} active={filters.group === g} onClick={() => setFilter('group', g)} />
                ))}
              </div>
            </>
          )}

          <div className="ml-auto shrink-0 flex items-center gap-2">
            {filtersActive && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                <X className="size-3" />
                Сбросить
              </button>
            )}
            {allMarked ? (
              <span className="flex items-center gap-1 text-emerald-600 font-medium text-sm">
                <CheckCircle className="size-4" />
                Все отмечены
              </span>
            ) : (
              <span className="text-slate-500 tabular-nums text-sm">
                {filtersActive
                  ? `${visibleStudents.length} из ${students.length} · ${stats.marked} отмечено`
                  : `${stats.marked} / ${students.length} отмечено`}
              </span>
            )}
          </div>
        </div>

        {/* Row 2 — filters */}
        {students.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-1">
              <Chip label="Все" active={filters.status === 'ALL'} onClick={() => setFilter('status', 'ALL')} />
              {(['present', 'late', 'absent', 'excused'] as const).map((s) => (
                <Chip
                  key={s}
                  label={CFG[s].label}
                  active={filters.status === s}
                  activeClass={CFG[s].chipActive}
                  onClick={() => setFilter('status', s)}
                />
              ))}
              <Chip
                label="Не отмечены"
                active={filters.status === 'unmarked'}
                activeClass="bg-slate-600 text-white shadow-sm"
                onClick={() => setFilter('status', 'unmarked')}
              />
            </div>

            <div className="h-4 w-px bg-slate-200 shrink-0" />

            <div className="flex flex-wrap items-center gap-1">
              <Chip label="Любая" active={filters.activity === 'ALL'} onClick={() => setFilter('activity', 'ALL')} />
              <Chip label="Сегодня" active={filters.activity === 'today'} activeClass="bg-indigo-500 text-white shadow-sm" onClick={() => setFilter('activity', 'today')} />
              <Chip label="3+ дня" active={filters.activity === 'days3'} activeClass="bg-indigo-500 text-white shadow-sm" onClick={() => setFilter('activity', 'days3')} />
              <Chip label="7+ дней" active={filters.activity === 'days7'} activeClass="bg-indigo-500 text-white shadow-sm" onClick={() => setFilter('activity', 'days7')} />
              <Chip label="14+ дней" active={filters.activity === 'days14'} activeClass="bg-indigo-500 text-white shadow-sm" onClick={() => setFilter('activity', 'days14')} />
            </div>

            <div className="h-4 w-px bg-slate-200 shrink-0" />

            <div className="flex flex-wrap items-center gap-1">
              <Chip
                label="Часто отсутствуют"
                active={filters.problem === 'absent_often'}
                activeClass="bg-orange-500 text-white shadow-sm"
                onClick={() => setFilter('problem', filters.problem === 'absent_often' ? 'ALL' : 'absent_often')}
              />
              <Chip
                label="Часто опаздывают"
                active={filters.problem === 'late_often'}
                activeClass="bg-orange-500 text-white shadow-sm"
                onClick={() => setFilter('problem', filters.problem === 'late_often' ? 'ALL' : 'late_often')}
              />
              <Chip
                label="Без записей"
                active={filters.problem === 'no_records'}
                activeClass="bg-orange-500 text-white shadow-sm"
                onClick={() => setFilter('problem', filters.problem === 'no_records' ? 'ALL' : 'no_records')}
              />
            </div>
          </div>
        )}

        {/* Row 3 — bulk actions */}
        {students.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 pt-1.5 border-t border-slate-50">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => markAll('present')}
                className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
              >
                Всем: Присутствовал
              </button>
              <button
                onClick={() => markAll('absent')}
                className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
              >
                Всем: Отсутствовал
              </button>
              <button
                onClick={() => markAll('late')}
                className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
              >
                Всем: Опоздал
              </button>
              {runningCount > 0 && (
                <button
                  onClick={stopAllRunning}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer bg-slate-800 text-white hover:bg-slate-700"
                >
                  <span className="size-1.5 rounded-full bg-green-400 animate-pulse" />
                  Остановить таймеры ({runningCount})
                </button>
              )}
            </div>

            {stats.marked > 0 && (
              <>
                <div className="h-4 w-px bg-slate-200 shrink-0" />
                <div className="flex flex-wrap items-center gap-2.5 text-xs">
                  {(['present', 'late', 'absent', 'excused'] as const).map((s) =>
                    stats[s] > 0 ? (
                      <span key={s} className={`font-medium ${CFG[s].statColor}`}>
                        {CFG[s].label} {stats[s]}
                      </span>
                    ) : null,
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Row 4 — keyboard hint */}
        {focusedIdx !== null && (
          <p className="pt-1.5 border-t border-slate-50 text-xs text-slate-400">
            {(['1', '2', '3', '4'] as const).map((k, i) => (
              <span key={k}>
                <kbd className="px-1 py-0.5 bg-slate-100 rounded text-[11px] font-mono">{k}</kbd>{' '}
                {CFG[CYCLE[i]].label}
                {i < 3 ? ' · ' : ''}
              </span>
            ))}
            {' · '}
            <kbd className="px-1 py-0.5 bg-slate-100 rounded text-[11px] font-mono">↑↓</kbd> навигация
          </p>
        )}
      </div>

      {/* ── Empty states ────────────────────────────────────────────────────── */}

      {students.length === 0 && (
        <Card>
          <EmptyState
            icon={<CalendarDays className="size-5" />}
            title="Учеников нет"
            description="Сначала добавьте активных учеников"
            className="py-16"
          />
        </Card>
      )}

      {students.length > 0 && visibleStudents.length === 0 && (
        <Card>
          <EmptyState
            icon={<Users className="size-5" />}
            title={filtersActive ? 'Ученики не найдены' : 'В этой группе пока нет учеников'}
            description={
              filtersActive
                ? 'Попробуйте изменить поиск или сбросить фильтры'
                : `Группа ${filters.group} · добавьте учеников или выберите другую группу`
            }
            className="py-16"
            action={
              filtersActive ? (
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-800 text-white hover:bg-slate-700 transition-colors"
                >
                  Сбросить фильтры
                </button>
              ) : undefined
            }
          />
        </Card>
      )}

      {/* ── Main table ─────────────────────────────────────────────────────── */}
      {visibleStudents.length > 0 && (
        <Card padding="none">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-[30%]">
                  Ученик
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Статус
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-24">
                  Баллы
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {visibleStudents.map((student, idx) => {
                const record = dateRecords.find((r) => r.studentId === student.id);
                const isSet  = !!record;
                const status = getEffectiveAttendanceStatus(record);
                const cfg    = CFG[status];
                const isFocused  = focusedIdx === idx;
                const isFlashing = flashId === student.id;
                const displayPoints = record?.pointsAwarded ?? 0;
                const isRunning = record?.timerStatus === 'running';

                return (
                  <tr
                    key={student.id}
                    onClick={() => cycleRow(student.id)}
                    onMouseEnter={() => setFocusedIdx(idx)}
                    onMouseLeave={() => setFocusedIdx(null)}
                    title={isRunning ? 'Таймер запущен — нажмите «Остановить» для начисления бонуса' : 'Кликните для изменения статуса'}
                    className={[
                      'select-none border-l-2 transition-all duration-200 ease-out',
                      isRunning ? 'cursor-default' : 'cursor-pointer',
                      isSet ? cfg.rowBg : '',
                      isSet && isFocused ? cfg.accentBorder : isFocused ? 'border-l-slate-300' : 'border-l-transparent',
                      isFlashing ? 'brightness-95' : '',
                    ].join(' ')}
                  >
                    {/* Avatar + Name */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={[
                          'size-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-300',
                          isSet ? `${cfg.activeBg} ${cfg.activeText}` : 'bg-slate-100 text-slate-500',
                        ].join(' ')}>
                          {student.fullName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{student.fullName}</p>
                          <p className="text-xs text-slate-400">Группа {student.group}</p>
                        </div>
                      </div>
                    </td>

                    {/* Status control + timer */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>

                        {/* Status buttons */}
                        <div className="flex gap-1 flex-wrap">
                          {CYCLE.map((s) => {
                            const sCfg = CFG[s];
                            const isActive = status === s && isSet;
                            return (
                              <button
                                key={s}
                                onClick={() => mark(student.id, s)}
                                className={[
                                  'px-2 py-0.5 rounded text-xs font-medium transition-all duration-150 whitespace-nowrap',
                                  isActive
                                    ? `${sCfg.activeBg} ${sCfg.activeText} shadow-sm`
                                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600',
                                ].join(' ')}
                              >
                                {sCfg.label}
                              </button>
                            );
                          })}
                        </div>

                        {/* Timer state — only for present */}
                        {isSet && status === 'present' && (
                          <div className="mt-0.5">
                            {record.timerStatus === 'running' && record.checkInAt && (
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className="flex items-center gap-1.5">
                                  <span className="size-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
                                  <span className="text-[11px] text-slate-400">На занятии:</span>
                                  <LiveAttendanceTimer
                                    checkInAt={record.checkInAt}
                                    onExpire={() => expireAttendanceTimer(student.id, date)}
                                  />
                                </div>
                                <button
                                  onClick={() => handleStop(student.id)}
                                  className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors"
                                >
                                  Остановить
                                </button>
                                <span className="text-[10px] text-slate-400 hidden sm:inline">бонус после остановки</span>
                              </div>
                            )}

                            {(record.timerStatus === 'stopped' || record.timerStatus === 'not_started') && (
                              <div className="flex items-center gap-1.5 text-xs text-emerald-700">
                                <CheckCircle2 className="size-3 shrink-0" />
                                {record.completedHours > 0
                                  ? `${record.completedHours}ч · +${record.bonusPoints} бонус`
                                  : 'Без бонуса за часы'}
                              </div>
                            )}

                            {record.timerStatus === 'expired' && (
                              <div className="flex items-center gap-1.5 text-xs text-orange-600">
                                <AlertCircle className="size-3 shrink-0" />
                                Бонус сгорел — таймер не остановлен
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Points */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className={[
                          'text-sm font-bold tabular-nums transition-colors duration-200',
                          isSet ? (displayPoints > 0 ? 'text-emerald-600' : 'text-slate-400') : 'text-slate-300',
                        ].join(' ')}>
                          {isSet ? (displayPoints > 0 ? `+${displayPoints}` : '0') : '—'}
                        </span>
                        {isSet && status === 'present' && isRunning && (
                          <span className="text-[10px] text-slate-400 font-normal">базовые</span>
                        )}
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
