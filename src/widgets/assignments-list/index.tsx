'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, BookOpen, Trash2, Paperclip } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { AssignmentStatusBadge, AssignmentTypeBadge } from '@/shared/ui/badge';
import { EmptyState } from '@/shared/ui/empty-state';
import { PageHeader } from '@/shared/ui/page-header';
import { Modal } from '@/shared/ui/modal';
import { useAppStore, useAssignments, useStudents } from '@/store/app-store';
import { useUIStore } from '@/store/ui-store';
import { formatDate } from '@/shared/lib/dates';
import type { AssignmentStatus, AssignmentType } from '@/entities/assignment/model/types';

// ─── constants ───────────────────────────────────────────────────────────────

const STATUS_FILTERS: { value: AssignmentStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'pending', label: 'На проверке' },
  { value: 'not_done', label: 'Не сделано' },
  { value: 'done', label: 'Сделано' },
  { value: 'good', label: 'Хорошо' },
  { value: 'excellent', label: 'Отлично' },
];

const TYPE_FILTERS: { value: AssignmentType | 'all'; label: string }[] = [
  { value: 'all', label: 'Все типы' },
  { value: 'intermediate', label: 'Промежуточные' },
  { value: 'homework', label: 'Домашние' },
];

// ─── component ───────────────────────────────────────────────────────────────

export function AssignmentsList() {
  const router = useRouter();
  const assignments = useAssignments();
  const students = useStudents();
  const { removeAssignment } = useAppStore();
  const { clearSelectedStudentIds } = useUIStore();

  const [statusFilter, setStatusFilter] = useState<AssignmentStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<AssignmentType | 'all'>('all');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  const studentName = (id: string) =>
    students.find((s) => s.id === id)?.fullName ?? 'Неизвестный';

  const filtered = assignments
    .filter((a) => statusFilter === 'all' || a.status === statusFilter)
    .filter((a) => typeFilter === 'all' || (a.assignmentType ?? 'homework') === typeFilter);

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
  );

  function handleCreate() {
    clearSelectedStudentIds();
    router.push('/assignments/create/select-students');
  }

  // ─── render ──────────────────────────────────────────────────────────────

  return (
    <div>
      <PageHeader
        title="Задания"
        description={`${assignments.length} заданий всего`}
        action={
          <Button onClick={handleCreate}>
            <Plus className="size-4" />
            Создать задание
          </Button>
        }
      />

      {/* status filters */}
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        {STATUS_FILTERS.map((f) => {
          const count = f.value === 'all' ? assignments.length : assignments.filter((a) => a.status === f.value).length;
          return (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === f.value
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {f.label} <span className="opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {/* type filters */}
      <div className="flex items-center gap-1.5 mb-4 flex-wrap">
        {TYPE_FILTERS.map((f) => {
          const count = f.value === 'all'
            ? assignments.length
            : assignments.filter((a) => (a.assignmentType ?? 'homework') === f.value).length;
          return (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                typeFilter === f.value
                  ? 'bg-slate-700 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {f.label} <span className="opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {/* assignments table */}
      <Card padding="none">
        {sorted.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="size-5" />}
            title="Заданий нет"
            description="Создайте первое задание"
            action={<Button onClick={handleCreate}><Plus className="size-4" />Создать задание</Button>}
            className="py-20"
          />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Задание</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Ученик</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Тип</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Статус</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Выдано</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Дедлайн</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sorted.map((a) => {
                const attachCount = a.attachments?.length ?? 0;
                return (
                  <tr key={a.id} className="group hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-start gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900">{a.title}</p>
                          {a.description && (
                            <p className="text-xs text-slate-400 truncate max-w-xs">{a.description}</p>
                          )}
                        </div>
                        {attachCount > 0 && (
                          <span className="flex items-center gap-0.5 text-xs text-slate-400 shrink-0 mt-0.5">
                            <Paperclip className="size-3" />{attachCount}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600">{studentName(a.studentId)}</span>
                    </td>
                    <td className="px-4 py-3">
                      {a.assignmentType && <AssignmentTypeBadge type={a.assignmentType} />}
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
                        onClick={() => setDeleteTarget({ id: a.id, title: a.title })}
                        className="size-7 p-0 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {/* ── delete confirm ──────────────────────────────────────────────────── */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Удалить задание?"
        description="Это действие нельзя отменить"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Отмена</Button>
            <Button variant="danger" onClick={() => { if (deleteTarget) { removeAssignment(deleteTarget.id); setDeleteTarget(null); } }}>
              Удалить
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Вы собираетесь удалить задание <strong>«{deleteTarget?.title}»</strong>.
          Начисленные баллы будут отозваны.
        </p>
      </Modal>
    </div>
  );
}
