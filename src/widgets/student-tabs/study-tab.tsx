'use client';

import { useState } from 'react';
import { BookOpen, CalendarDays, Star, Calendar, ExternalLink } from 'lucide-react';
import { Card } from '@/shared/ui/card';
import { Badge, AttendanceStatusBadge, LevelBadge, PointsBadge } from '@/shared/ui/badge';
import { EmptyState } from '@/shared/ui/empty-state';
import {
  useStudentById,
  useStudentAssignments,
  useStudentAttendance,
  useStudentPointHistory,
} from '@/store/app-store';
import { formatDate, formatShortDate, formatRelative } from '@/shared/lib/dates';
import { POINT_SOURCE_LABELS } from '@/entities/points/model/types';
import { StudentAssignmentsSection } from './assignments-section';
import { AssignmentDetailsModal } from '@/features/assignments/assignment-details-modal';

interface Props {
  studentId: string;
}

type InnerTab = 'assignments' | 'attendance' | 'history';

export function StudyTab({ studentId }: Props) {
  const student = useStudentById(studentId);
  const assignments = useStudentAssignments(studentId);
  const attendance = useStudentAttendance(studentId);
  const pointHistory = useStudentPointHistory(studentId);

  const [inner, setInner] = useState<InnerTab>('assignments');

  if (!student) return null;

  const presentCount = attendance.filter((r) => r.status === 'present').length;
  const doneAssignments = assignments.filter((a) => a.status !== 'pending').length;

  const innerTabs = [
    { id: 'assignments' as const, label: 'Задания', count: assignments.length },
    { id: 'attendance' as const, label: 'Посещаемость', count: attendance.length },
    { id: 'history' as const, label: 'История баллов', count: pointHistory.length },
  ];


  return (
    <div className="flex flex-col gap-5">
      {/* summary card */}
      <Card className="flex items-start gap-6">
        <div className="size-16 rounded-2xl overflow-hidden bg-emerald-100 flex items-center justify-center text-emerald-700 text-xl font-bold shrink-0">
          {student.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={student.avatar} alt={student.fullName} className="size-full object-cover" />
          ) : (
            student.fullName.slice(0, 2).toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-slate-900">{student.fullName}</h2>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <LevelBadge level={student.level} />
            <Badge variant="slate">Группа {student.group}</Badge>
            <Badge variant={student.isActive ? 'success' : 'danger'}>
              {student.isActive ? 'Активен' : 'Неактивен'}
            </Badge>
          </div>

          <div className="grid grid-cols-4 gap-4 mt-5">
            <div className="flex items-center gap-2">
              <Star className="size-4 text-amber-500" />
              <div>
                <p className="text-xl font-bold text-slate-900">{student.totalPoints}</p>
                <p className="text-xs text-slate-400">баллов</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="size-4 text-blue-500" />
              <div>
                <p className="text-xl font-bold text-slate-900">{doneAssignments}</p>
                <p className="text-xs text-slate-400">заданий</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays className="size-4 text-emerald-500" />
              <div>
                <p className="text-xl font-bold text-slate-900">{presentCount}</p>
                <p className="text-xs text-slate-400">посещений</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-slate-400" />
              <div>
                <p className="text-sm font-semibold text-slate-900">{formatDate(student.startedAt)}</p>
                <p className="text-xs text-slate-400">начало</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* inner tabs */}
      <div>
        <div className="flex gap-1 mb-4 bg-slate-100 p-1 rounded-xl w-fit">
          {innerTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setInner(tab.id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                inner === tab.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-xs text-slate-400">({tab.count})</span>
            </button>
          ))}
        </div>

        {inner === 'assignments' && <StudentAssignmentsSection studentId={studentId} />}
        {inner === 'attendance' && <AttendancePanel attendance={attendance} />}
        {inner === 'history' && <HistoryPanel history={pointHistory} />}
      </div>
    </div>
  );
}


function AttendancePanel({ attendance }: { attendance: ReturnType<typeof useStudentAttendance> }) {
  if (attendance.length === 0)
    return <EmptyState icon={<CalendarDays className="size-5" />} title="Посещений пока нет" />;
  return (
    <Card padding="none">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Дата</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Статус</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Баллы</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {attendance.map((r) => (
            <tr key={r.id} className="hover:bg-slate-50/60">
              <td className="px-5 py-3"><span className="text-sm text-slate-700">{formatShortDate(r.date)}</span></td>
              <td className="px-4 py-3"><AttendanceStatusBadge status={r.status} /></td>
              <td className="px-4 py-3">{r.pointsAwarded > 0 ? <PointsBadge points={r.pointsAwarded} /> : <span className="text-xs text-slate-400">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function HistoryPanel({ history }: { history: ReturnType<typeof useStudentPointHistory> }) {
  const [detailId, setDetailId] = useState<string | null>(null);

  if (history.length === 0)
    return <EmptyState icon={<Star className="size-5" />} title="История баллов пуста" />;

  return (
    <>
      <Card padding="none">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Причина</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Источник</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Баллы</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Дата</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {history.map((item) => {
              const isAssignment = item.source === 'assignment' && !!item.assignmentId;
              return (
                <tr key={item.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3">
                    {isAssignment ? (
                      <button
                        onClick={() => setDetailId(item.assignmentId!)}
                        className="flex items-center gap-1.5 text-sm text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer text-left"
                      >
                        {item.reason}
                        <ExternalLink className="size-3 shrink-0 opacity-60" />
                      </button>
                    ) : (
                      <span className="text-sm text-slate-700">{item.reason}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="slate">{POINT_SOURCE_LABELS[item.source]}</Badge>
                  </td>
                  <td className="px-4 py-3"><PointsBadge points={item.points} /></td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-slate-400">{formatRelative(item.createdAt)}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <AssignmentDetailsModal
        assignmentId={detailId}
        onClose={() => setDetailId(null)}
      />
    </>
  );
}
