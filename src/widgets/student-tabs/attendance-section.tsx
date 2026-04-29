'use client';

import { useState, Fragment } from 'react';
import { CalendarDays, CheckCircle2, ChevronDown } from 'lucide-react';
import { Card } from '@/shared/ui/card';
import { AttendanceStatusBadge, PointsBadge } from '@/shared/ui/badge';
import { EmptyState } from '@/shared/ui/empty-state';
import { useAppStore, useStudentAttendance } from '@/store/app-store';
import { todayISO, formatShortDate } from '@/shared/lib/dates';
import { getAttendancePoints, getEffectiveAttendanceStatus } from '@/entities/attendance/model/types';
import type { AttendanceStatus } from '@/entities/attendance/model/types';

const STATUS_BUTTONS: {
  status: AttendanceStatus;
  label: string;
  base: string;
  active: string;
}[] = [
  {
    status: 'present',
    label: 'Присутствовал',
    base: 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100',
    active: 'bg-green-100 text-green-800 border-2 border-green-500 ring-2 ring-green-200',
  },
  {
    status: 'late',
    label: 'Опоздал',
    base: 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100',
    active: 'bg-amber-100 text-amber-800 border-2 border-amber-500 ring-2 ring-amber-200',
  },
  {
    status: 'absent',
    label: 'Отсутствовал',
    base: 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100',
    active: 'bg-red-100 text-red-800 border-2 border-red-500 ring-2 ring-red-200',
  },
  {
    status: 'excused',
    label: 'Уваж. причина',
    base: 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100',
    active: 'bg-blue-100 text-blue-800 border-2 border-blue-500 ring-2 ring-blue-200',
  },
];

// Compact inline buttons for history row editing
const INLINE_BUTTONS: { status: AttendanceStatus; label: string; classes: string }[] = [
  { status: 'present',  label: 'Присутствовал',   classes: 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100' },
  { status: 'late',     label: 'Опоздал',          classes: 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100' },
  { status: 'absent',   label: 'Отсутствовал',     classes: 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' },
  { status: 'excused',  label: 'Уваж. причина',    classes: 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100' },
];

interface Props {
  studentId: string;
}

export function StudentAttendanceSection({ studentId }: Props) {
  const [date, setDate] = useState(todayISO());
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const attendance = useStudentAttendance(studentId);
  const markAttendance = useAppStore((s) => s.markAttendance);

  const selectedRecord = attendance.find((r) => r.date === date);
  // Default to 'absent' if no record exists for the selected date
  const activeStatus = getEffectiveAttendanceStatus(selectedRecord);
  const isToday = date === todayISO();

  function handleMark(targetDate: string, status: AttendanceStatus) {
    markAttendance(studentId, targetDate, status);
    setExpandedDate(null);
  }

  function toggleExpanded(recordDate: string) {
    setExpandedDate((prev) => (prev === recordDate ? null : recordDate));
  }

  return (
    <div className="flex flex-col gap-4">
      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Посещаемость</p>
          <p className="text-xs text-slate-400">{attendance.length} записей всего</p>
        </div>
        <div className="flex items-center gap-2">
          {!isToday && (
            <button
              onClick={() => setDate(todayISO())}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium cursor-pointer"
            >
              Сегодня
            </button>
          )}
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors cursor-pointer"
          />
        </div>
      </div>

      {/* quick mark card */}
      <Card className="flex flex-col gap-4">
        {/* current status row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <CalendarDays className="size-4 text-slate-400" />
            <span className="font-medium">{formatShortDate(date)}</span>
            {isToday && <span className="text-xs text-emerald-600 font-medium">· Сегодня</span>}
          </div>
          <div className="flex items-center gap-2">
            {selectedRecord ? (
              <CheckCircle2 className="size-3.5 text-emerald-500" />
            ) : (
              <span className="text-xs text-slate-400 italic">по умолчанию</span>
            )}
            <AttendanceStatusBadge status={activeStatus} />
            {(selectedRecord?.pointsAwarded ?? 0) > 0 && (
              <PointsBadge points={selectedRecord!.pointsAwarded} />
            )}
          </div>
        </div>

        {/* status buttons — 'absent' highlighted when no record exists */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STATUS_BUTTONS.map(({ status, label, base, active }) => {
            const isActive = activeStatus === status;
            const points = getAttendancePoints(status);
            return (
              <button
                key={status}
                onClick={() => handleMark(date, status)}
                className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                  isActive ? active : base
                }`}
              >
                <span>{label}</span>
                {points > 0 && (
                  <span className={`text-xs font-semibold ${isActive ? 'opacity-80' : 'opacity-50'}`}>
                    +{points} б.
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* history list */}
      {attendance.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="size-5" />}
          title="Посещений пока нет"
          description="Отметьте первое посещение выше"
          className="py-12"
        />
      ) : (
        <Card padding="none">
          <div className="px-5 py-3 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              История посещений
            </p>
          </div>
          <table className="w-full">
            <tbody>
              {attendance.map((r) => {
                const isExpanded = expandedDate === r.date;
                return (
                  <Fragment key={r.id}>
                    <tr
                      onClick={() => toggleExpanded(r.date)}
                      className={`cursor-pointer transition-colors border-b border-slate-50 ${
                        isExpanded ? 'bg-slate-50' : 'hover:bg-slate-50/60'
                      }`}
                    >
                      <td className="px-5 py-3">
                        <span className="text-sm text-slate-700 font-medium">{formatShortDate(r.date)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <AttendanceStatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-3">
                        {r.pointsAwarded > 0 ? (
                          <PointsBadge points={r.pointsAwarded} />
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 w-8 text-right">
                        <ChevronDown
                          className={`size-3.5 text-slate-400 transition-transform inline-block ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <td colSpan={4} className="px-5 py-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-slate-500 mr-1">Изменить:</span>
                            {INLINE_BUTTONS.map(({ status, label, classes }) => (
                              <button
                                key={status}
                                onClick={(e) => { e.stopPropagation(); handleMark(r.date, status); }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${classes} ${
                                  r.status === status ? 'ring-2 ring-offset-1 ring-current font-semibold' : ''
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
