'use client';

import { useState } from 'react';
import { CalendarDays, CheckCircle } from 'lucide-react';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Button } from '@/shared/ui/button';
import { AttendanceStatusBadge } from '@/shared/ui/badge';
import { PageHeader } from '@/shared/ui/page-header';
import { EmptyState } from '@/shared/ui/empty-state';
import { useAppStore, useStudents, useAttendanceRecords } from '@/store/app-store';
import { todayISO, formatShortDate } from '@/shared/lib/dates';
import { getEffectiveAttendanceStatus } from '@/entities/attendance/model/types';
import type { AttendanceStatus } from '@/entities/attendance/model/types';

const STATUS_BUTTONS: { status: AttendanceStatus; label: string; classes: string }[] = [
  { status: 'present', label: 'Присутствовал', classes: 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100' },
  { status: 'late', label: 'Опоздал', classes: 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100' },
  { status: 'absent', label: 'Отсутствовал', classes: 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' },
  { status: 'excused', label: 'Уваж. причина', classes: 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100' },
];

export function AttendanceTable() {
  const students = useStudents().filter((s) => s.isActive);
  const allRecords = useAttendanceRecords();
  const markAttendance = useAppStore((s) => s.markAttendance);
  const [date, setDate] = useState(todayISO());

  const dateRecords = allRecords.filter((r) => r.date === date);

  const getRecord = (studentId: string) =>
    dateRecords.find((r) => r.studentId === studentId);

  const markedCount = dateRecords.length;

  return (
    <div>
      <PageHeader
        title="Посещаемость"
        description="Отмечайте посещение для каждого ученика"
      />

      <div className="flex items-center gap-4 mb-5">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 text-slate-400" />
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-44"
          />
        </div>
        <span className="text-sm text-slate-500">
          {formatShortDate(date)} · отмечено {markedCount} из {students.length}
        </span>
        {markedCount === students.length && students.length > 0 && (
          <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
            <CheckCircle className="size-4" />
            Все отмечены
          </div>
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
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Ученик
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Статус
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Отметить
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {students.map((student) => {
                const record = getRecord(student.id);
                return (
                  <tr key={student.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold shrink-0">
                          {student.fullName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{student.fullName}</p>
                          <p className="text-xs text-slate-400">Группа {student.group}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <AttendanceStatusBadge status={getEffectiveAttendanceStatus(record)} />
                        {!record && <span className="text-xs text-slate-400 italic">по умолч.</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {STATUS_BUTTONS.map(({ status, label, classes }) => (
                          <button
                            key={status}
                            onClick={() => markAttendance(student.id, date, status)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${classes} ${
                              record?.status === status ? 'ring-2 ring-offset-1 ring-current opacity-100' : 'opacity-70 hover:opacity-100'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
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
