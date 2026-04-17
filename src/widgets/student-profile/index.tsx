'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Phone, Calendar, BookOpen, CalendarDays, Star, Trash2, Gift } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/shared/ui/button';
import { Card, SectionCard } from '@/shared/ui/card';
import { Badge, AssignmentStatusBadge, AttendanceStatusBadge, LevelBadge, PointsBadge } from '@/shared/ui/badge';
import { EmptyState } from '@/shared/ui/empty-state';
import { Modal } from '@/shared/ui/modal';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import {
  useAppStore,
  useStudentById,
  useStudentAssignments,
  useStudentAttendance,
  useStudentPointHistory,
} from '@/store/app-store';
import { formatDate, formatShortDate, formatRelative } from '@/shared/lib/dates';
import { STUDENT_LEVEL_LABELS } from '@/entities/student/model/types';
import { POINT_SOURCE_LABELS } from '@/entities/points/model/types';

interface Props {
  studentId: string;
}

export function StudentProfile({ studentId }: Props) {
  const router = useRouter();
  const student = useStudentById(studentId);
  const assignments = useStudentAssignments(studentId);
  const attendance = useStudentAttendance(studentId);
  const pointHistory = useStudentPointHistory(studentId);
  const { removeStudent, awardBonusPoints } = useAppStore();

  const [activeTab, setActiveTab] = useState<'assignments' | 'attendance' | 'history'>('assignments');
  const [bonusOpen, setBonusOpen] = useState(false);
  const [bonusReason, setBonusReason] = useState('');
  const [bonusPoints, setBonusPoints] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <p className="text-slate-500 mb-4">Ученик не найден</p>
        <Link href="/students">
          <Button variant="outline"><ArrowLeft className="size-4" />К списку</Button>
        </Link>
      </div>
    );
  }

  const presentCount = attendance.filter((r) => r.status === 'present').length;
  const doneAssignments = assignments.filter((a) => a.status !== 'pending').length;

  function handleBonus() {
    const pts = Number(bonusPoints);
    if (!bonusReason.trim() || isNaN(pts) || pts === 0) return;
    awardBonusPoints(studentId, bonusReason.trim(), pts);
    setBonusReason('');
    setBonusPoints('');
    setBonusOpen(false);
  }

  function handleDelete() {
    removeStudent(studentId);
    router.push('/students');
  }

  const tabs = [
    { id: 'assignments' as const, label: 'Задания', count: assignments.length },
    { id: 'attendance' as const, label: 'Посещаемость', count: attendance.length },
    { id: 'history' as const, label: 'История баллов', count: pointHistory.length },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/students">
          <Button variant="ghost" size="sm" className="size-8 p-0">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <span className="text-sm text-slate-500">Ученики</span>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-900">{student.fullName}</span>
      </div>

      {/* Profile header */}
      <Card className="flex items-start gap-6">
        <div className="size-16 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 text-xl font-bold shrink-0">
          {student.fullName.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">{student.fullName}</h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <LevelBadge level={student.level} />
                <Badge variant="slate">Группа {student.group}</Badge>
                <Badge variant={student.isActive ? 'success' : 'danger'}>
                  {student.isActive ? 'Активен' : 'Неактивен'}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => setBonusOpen(true)}>
                <Gift className="size-3.5" />
                Бонус
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(true)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                <Trash2 className="size-3.5" />
              </Button>
            </div>
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

          {(student.parentPhone || student.notes) && (
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100">
              {student.parentPhone && (
                <div className="flex items-center gap-1.5 text-sm text-slate-500">
                  <Phone className="size-3.5 text-slate-400" />
                  {student.parentPhone}
                </div>
              )}
              {student.notes && (
                <p className="text-sm text-slate-500 italic">{student.notes}</p>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Tabs */}
      <div>
        <div className="flex gap-1 mb-4 bg-slate-100 p-1 rounded-xl w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-xs text-slate-400">({tab.count})</span>
            </button>
          ))}
        </div>

        {activeTab === 'assignments' && (
          <AssignmentsTab assignments={assignments} />
        )}
        {activeTab === 'attendance' && (
          <AttendanceTab attendance={attendance} />
        )}
        {activeTab === 'history' && (
          <HistoryTab history={pointHistory} />
        )}
      </div>

      {/* Bonus modal */}
      <Modal
        isOpen={bonusOpen}
        onClose={() => setBonusOpen(false)}
        title="Начислить бонусные баллы"
        description={student.fullName}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setBonusOpen(false)}>Отмена</Button>
            <Button onClick={handleBonus}>Начислить</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Причина"
            placeholder="Хатм джуза, помощь другим..."
            value={bonusReason}
            onChange={(e) => setBonusReason(e.target.value)}
          />
          <Input
            label="Баллы"
            type="number"
            placeholder="5"
            value={bonusPoints}
            onChange={(e) => setBonusPoints(e.target.value)}
            hint="Можно отрицательное значение для снятия баллов"
          />
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Удалить ученика"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Отмена</Button>
            <Button variant="danger" onClick={handleDelete}>Удалить</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Вы уверены, что хотите удалить ученика <strong>{student.fullName}</strong>?
          Все задания, посещаемость и история будут удалены. Это действие нельзя отменить.
        </p>
      </Modal>
    </div>
  );
}

function AssignmentsTab({ assignments }: { assignments: ReturnType<typeof useStudentAssignments> }) {
  if (assignments.length === 0) {
    return <EmptyState icon={<BookOpen className="size-5" />} title="Заданий пока нет" />;
  }
  return (
    <Card padding="none">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Задание</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Статус</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Дедлайн</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Баллы</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {assignments.map((a) => (
            <tr key={a.id} className="hover:bg-slate-50/60">
              <td className="px-5 py-3">
                <p className="text-sm font-medium text-slate-900">{a.title}</p>
                {a.description && <p className="text-xs text-slate-400 truncate max-w-xs">{a.description}</p>}
              </td>
              <td className="px-4 py-3"><AssignmentStatusBadge status={a.status} /></td>
              <td className="px-4 py-3">
                <span className="text-sm text-slate-500">
                  {a.dueDate ? formatDate(a.dueDate) : '—'}
                </span>
              </td>
              <td className="px-4 py-3">
                {a.pointsAwarded > 0 ? (
                  <PointsBadge points={a.pointsAwarded} />
                ) : (
                  <span className="text-xs text-slate-400">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function AttendanceTab({ attendance }: { attendance: ReturnType<typeof useStudentAttendance> }) {
  if (attendance.length === 0) {
    return <EmptyState icon={<CalendarDays className="size-5" />} title="Посещений пока нет" />;
  }
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
              <td className="px-5 py-3">
                <span className="text-sm text-slate-700">{formatShortDate(r.date)}</span>
              </td>
              <td className="px-4 py-3"><AttendanceStatusBadge status={r.status} /></td>
              <td className="px-4 py-3">
                {r.pointsAwarded > 0 ? (
                  <PointsBadge points={r.pointsAwarded} />
                ) : (
                  <span className="text-xs text-slate-400">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function HistoryTab({ history }: { history: ReturnType<typeof useStudentPointHistory> }) {
  if (history.length === 0) {
    return <EmptyState icon={<Star className="size-5" />} title="История баллов пуста" />;
  }
  return (
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
          {history.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50/60">
              <td className="px-5 py-3">
                <span className="text-sm text-slate-700">{item.reason}</span>
              </td>
              <td className="px-4 py-3">
                <Badge variant="slate">{POINT_SOURCE_LABELS[item.source]}</Badge>
              </td>
              <td className="px-4 py-3">
                <PointsBadge points={item.points} />
              </td>
              <td className="px-4 py-3">
                <span className="text-xs text-slate-400">{formatRelative(item.createdAt)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
