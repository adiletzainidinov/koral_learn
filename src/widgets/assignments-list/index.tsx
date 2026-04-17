'use client';

import { useState } from 'react';
import { Plus, BookOpen, Trash2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { AssignmentStatusBadge } from '@/shared/ui/badge';
import { EmptyState } from '@/shared/ui/empty-state';
import { PageHeader } from '@/shared/ui/page-header';
import { CreateAssignmentModal } from '@/features/assignments/create-assignment-modal';
import { useAppStore, useAssignments, useStudents } from '@/store/app-store';
import { formatDate } from '@/shared/lib/dates';
import type { AssignmentStatus } from '@/entities/assignment/model/types';

const STATUS_FILTERS: { value: AssignmentStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'pending', label: 'На проверке' },
  { value: 'not_done', label: 'Не сделано' },
  { value: 'done', label: 'Сделано' },
  { value: 'good', label: 'Хорошо' },
  { value: 'excellent', label: 'Отлично' },
];

export function AssignmentsList() {
  const assignments = useAssignments();
  const students = useStudents();
  const removeAssignment = useAppStore((s) => s.removeAssignment);
  const [createOpen, setCreateOpen] = useState(false);
  const [filter, setFilter] = useState<AssignmentStatus | 'all'>('all');

  const studentName = (id: string) =>
    students.find((s) => s.id === id)?.fullName ?? 'Неизвестный';

  const filtered =
    filter === 'all' ? assignments : assignments.filter((a) => a.status === filter);

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
  );

  return (
    <div>
      <PageHeader
        title="Задания"
        description={`${assignments.length} заданий всего`}
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Создать задание
          </Button>
        }
      />

      <div className="flex items-center gap-1.5 mb-4 flex-wrap">
        {STATUS_FILTERS.map((f) => {
          const count = f.value === 'all' ? assignments.length : assignments.filter((a) => a.status === f.value).length;
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f.value
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {f.label} <span className="opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      <Card padding="none">
        {sorted.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="size-5" />}
            title="Заданий нет"
            description="Создайте первое задание"
            action={<Button onClick={() => setCreateOpen(true)}><Plus className="size-4" />Создать задание</Button>}
            className="py-20"
          />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Задание</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Ученик</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Статус</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Выдано</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Дедлайн</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sorted.map((a) => (
                <tr key={a.id} className="group hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3">
                    <p className="text-sm font-medium text-slate-900">{a.title}</p>
                    {a.description && (
                      <p className="text-xs text-slate-400 truncate max-w-xs">{a.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-600">{studentName(a.studentId)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <AssignmentStatusBadge status={a.status} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-500">{formatDate(a.issuedAt)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-500">{a.dueDate ? formatDate(a.dueDate) : '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAssignment(a.id)}
                      className="size-7 p-0 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <CreateAssignmentModal isOpen={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
