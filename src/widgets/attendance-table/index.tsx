'use client';

import { useState, useEffect, useCallback } from 'react';
import { CalendarDays, CheckCircle } from 'lucide-react';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { PageHeader } from '@/shared/ui/page-header';
import { EmptyState } from '@/shared/ui/empty-state';
import { useAppStore, useStudents, useAttendanceRecords } from '@/store/app-store';
import { todayISO } from '@/shared/lib/dates';
import { getEffectiveAttendanceStatus } from '@/entities/attendance/model/types';
import type { AttendanceStatus } from '@/entities/attendance/model/types';

const CYCLE: AttendanceStatus[] = ['present', 'late', 'absent', 'excused'];

const CFG: Record<
  AttendanceStatus,
  { label: string; points: number; rowBg: string; activeBg: string; activeText: string; accentBorder: string }
> = {
  present: {
    label: 'Присутствовал', points: 5,
    rowBg: 'bg-green-50/60',
    activeBg: 'bg-green-500', activeText: 'text-white',
    accentBorder: 'border-l-green-400',
  },
  late: {
    label: 'Опоздал', points: 3,
    rowBg: 'bg-amber-50/60',
    activeBg: 'bg-amber-400', activeText: 'text-white',
    accentBorder: 'border-l-amber-400',
  },
  absent: {
    label: 'Отсутствовал', points: 0,
    rowBg: 'bg-red-50/60',
    activeBg: 'bg-red-500', activeText: 'text-white',
    accentBorder: 'border-l-red-400',
  },
  excused: {
    label: 'Уваж. причина', points: 1,
    rowBg: 'bg-blue-50/60',
    activeBg: 'bg-blue-500', activeText: 'text-white',
    accentBorder: 'border-l-blue-400',
  },
};

const BULK: { status: AttendanceStatus; label: string; cls: string }[] = [
  { status: 'present', label: 'Всем: Присутствовал', cls: 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100' },
  { status: 'absent',  label: 'Всем: Отсутствовал',  cls: 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' },
  { status: 'late',    label: 'Всем: Опоздал',       cls: 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100' },
];

export function AttendanceTable() {
  const students = useStudents().filter((s) => s.isActive);
  const allRecords = useAttendanceRecords();
  const markAttendance = useAppStore((s) => s.markAttendance);
  const [date, setDate] = useState(todayISO());
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);

  const dateRecords = allRecords.filter((r) => r.date === date);
  const getRecord = (id: string) => dateRecords.find((r) => r.studentId === id);
  const markedCount = students.filter((s) => getRecord(s.id)).length;

  const flash = useCallback((id: string) => {
    setFlashId(id);
    setTimeout(() => setFlashId(null), 280);
  }, []);

  const mark = useCallback(
    (studentId: string, status: AttendanceStatus) => {
      markAttendance(studentId, date, status);
      flash(studentId);
    },
    [date, markAttendance, flash]
  );

  const cycleRow = useCallback(
    (studentId: string) => {
      const record = dateRecords.find((r) => r.studentId === studentId);
      const cur = record?.status ?? 'absent';
      const next = CYCLE[(CYCLE.indexOf(cur) + 1) % CYCLE.length];
      mark(studentId, next);
    },
    [dateRecords, mark]
  );

  const markAll = (status: AttendanceStatus) => {
    students.forEach((s) => markAttendance(s.id, date, status));
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (focusedIdx === null) return;

      const map: Record<string, AttendanceStatus> = {
        '1': 'present', '2': 'late', '3': 'absent', '4': 'excused',
      };
      if (map[e.key]) {
        const student = students[focusedIdx];
        if (student) mark(student.id, map[e.key]);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIdx((i) => (i === null ? 0 : Math.min(i + 1, students.length - 1)));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIdx((i) => (i === null ? 0 : Math.max(i - 1, 0)));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [focusedIdx, students, mark]);

  return (
    <div>
      <PageHeader
        title="Посещаемость"
        description="Кликните строку для смены статуса · 1 Присутствовал · 2 Опоздал · 3 Отсутствовал · 4 Уваж. причина"
      />

      {/* Sticky control bar — sits below the 56px sticky AppHeader (top-14) */}
      <div className="sticky top-14 z-10 -mx-6 xl:-mx-8 px-6 xl:px-8 py-3 mb-5 bg-white/95 backdrop-blur-sm border-b border-slate-100 shadow-sm">
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

          <div className="h-4 w-px bg-slate-200 shrink-0" />

          <div className="flex flex-wrap items-center gap-1.5">
            {BULK.map(({ status, label, cls }) => (
              <button
                key={status}
                onClick={() => markAll(status)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${cls}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="ml-auto shrink-0 flex items-center gap-1.5 text-sm">
            {markedCount === students.length && students.length > 0 ? (
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <CheckCircle className="size-4" />
                Все отмечены
              </span>
            ) : (
              <span className="text-slate-500 tabular-nums">
                {markedCount} / {students.length} отмечено
              </span>
            )}
          </div>
        </div>

        {/* Keyboard hint — appears only when a row is focused */}
        {focusedIdx !== null && (
          <p className="mt-1.5 text-xs text-slate-400">
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

      {students.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CalendarDays className="size-5" />}
            title="Учеников нет"
            description="Сначала добавьте активных учеников"
            className="py-16"
          />
        </Card>
      ) : (
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
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-20">
                  Баллы
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {students.map((student, idx) => {
                const record = getRecord(student.id);
                const isSet = !!record;
                const status = getEffectiveAttendanceStatus(record);
                const cfg = CFG[status];
                const isFocused = focusedIdx === idx;
                const isFlashing = flashId === student.id;

                return (
                  <tr
                    key={student.id}
                    onClick={() => cycleRow(student.id)}
                    onMouseEnter={() => setFocusedIdx(idx)}
                    onMouseLeave={() => setFocusedIdx(null)}
                    title="Кликните для изменения статуса"
                    className={[
                      'cursor-pointer select-none border-l-2 transition-all duration-200 ease-out',
                      isSet ? cfg.rowBg : '',
                      isSet && isFocused ? cfg.accentBorder : isFocused ? 'border-l-slate-300' : 'border-l-transparent',
                      isFlashing ? 'brightness-95 scale-x-[1.002]' : '',
                    ].join(' ')}
                  >
                    {/* Avatar + Name */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className={[
                            'size-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-300',
                            isSet ? `${cfg.activeBg} ${cfg.activeText}` : 'bg-slate-100 text-slate-500',
                          ].join(' ')}
                        >
                          {student.fullName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{student.fullName}</p>
                          <p className="text-xs text-slate-400">Группа {student.group}</p>
                        </div>
                      </div>
                    </td>

                    {/* Segmented status control — stopPropagation so direct clicks don't cycle */}
                    <td className="px-4 py-3.5">
                      <div
                        className="flex gap-1 flex-wrap"
                        onClick={(e) => e.stopPropagation()}
                      >
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
                    </td>

                    {/* Points */}
                    <td className="px-5 py-3.5 text-right">
                      <span
                        className={[
                          'text-sm font-bold tabular-nums transition-colors duration-200',
                          isSet
                            ? cfg.points > 0 ? 'text-emerald-600' : 'text-slate-400'
                            : 'text-slate-300',
                        ].join(' ')}
                      >
                        {isSet ? (cfg.points > 0 ? `+${cfg.points}` : '0') : '—'}
                      </span>
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
