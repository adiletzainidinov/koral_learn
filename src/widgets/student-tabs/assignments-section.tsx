'use client';

import { useState } from 'react';
import { Plus, BookOpen, Trash2, Paperclip, Pencil } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { AssignmentTypeBadge } from '@/shared/ui/badge';
import { EmptyState } from '@/shared/ui/empty-state';
import { Modal } from '@/shared/ui/modal';
import { CreateAssignmentModal } from '@/features/assignments/create-assignment-modal';
import { AssignmentDetailsModal } from '@/features/assignments/assignment-details-modal';
import { useAppStore, useStudentAssignments } from '@/store/app-store';
import { formatDate } from '@/shared/lib/dates';
import { ASSIGNMENT_STATUS_LABELS, ASSIGNMENT_TYPE_LABELS } from '@/entities/assignment/model/types';
import type { AssignmentStatus, AssignmentType } from '@/entities/assignment/model/types';

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

const STATUS_COLORS: Record<AssignmentStatus, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  not_done: 'bg-red-100 text-red-700 border-red-200',
  done: 'bg-blue-100 text-blue-700 border-blue-200',
  good: 'bg-green-100 text-green-700 border-green-200',
  excellent: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

interface Props {
  studentId: string;
}

export function StudentAssignmentsSection({ studentId }: Props) {
  const assignments = useStudentAssignments(studentId);
  const { removeAssignment, updateAssignmentStatus } = useAppStore();

  const [statusFilter, setStatusFilter] = useState<AssignmentStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<AssignmentType | 'all'>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  const filtered = assignments
    .filter((a) => statusFilter === 'all' || a.status === statusFilter)
    .filter((a) => typeFilter === 'all' || (a.assignmentType ?? 'homework') === typeFilter);

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
  );

  return (
    <div className="flex flex-col gap-4">
      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Задания</p>
          <p className="text-xs text-slate-400">{assignments.length} заданий</p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-3.5" />
          Создать задание
        </Button>
      </div>

      {/* status filters */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {STATUS_FILTERS.map((f) => {
          const count =
            f.value === 'all'
              ? assignments.length
              : assignments.filter((a) => a.status === f.value).length;
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
      <div className="flex items-center gap-1.5 flex-wrap -mt-1">
        {TYPE_FILTERS.map((f) => {
          const count =
            f.value === 'all'
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

      {/* list */}
      <Card padding="none">
        {sorted.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="size-5" />}
            title="Заданий нет"
            description={
              statusFilter === 'all' && typeFilter === 'all'
                ? 'Создайте первое задание'
                : 'Нет заданий с такими фильтрами'
            }
            action={
              statusFilter === 'all' && typeFilter === 'all' ? (
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="size-3.5" />Создать задание
                </Button>
              ) : undefined
            }
            className="py-16"
          />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Задание</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Тип</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Статус</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Выдано</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Дедлайн</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Баллы</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sorted.map((a) => {
                const attachCount = a.attachments?.length ?? 0;
                return (
                  <tr
                    key={a.id}
                    onClick={() => setDetailId(a.id)}
                    className="group hover:bg-slate-50/60 transition-colors cursor-pointer"
                  >
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
                      {a.assignmentType && <AssignmentTypeBadge type={a.assignmentType} />}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <StatusSelect
                        value={a.status}
                        onChange={(s) => updateAssignmentStatus(a.id, s)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-500">{formatDate(a.issuedAt)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-500">{a.dueDate ? formatDate(a.dueDate) : '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      {a.pointsAwarded > 0 ? (
                        <span className="text-sm font-semibold text-amber-600">+{a.pointsAwarded}</span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => setEditId(a.id)}
                          className="size-7 p-0 text-slate-400 hover:text-blue-500 cursor-pointer"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => setDeleteTarget({ id: a.id, title: a.title })}
                          className="size-7 p-0 text-slate-400 hover:text-red-500 cursor-pointer"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <CreateAssignmentModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        preselectedStudentId={studentId}
      />

      <AssignmentDetailsModal
        assignmentId={detailId}
        onClose={() => setDetailId(null)}
        onEdit={(id) => { setDetailId(null); setEditId(id); }}
        onDelete={(id, title) => { setDetailId(null); setDeleteTarget({ id, title }); }}
      />

      <CreateAssignmentModal
        isOpen={!!editId}
        onClose={() => setEditId(null)}
        mode="edit"
        assignmentId={editId ?? undefined}
        preselectedStudentId={studentId}
      />

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

function StatusSelect({
  value,
  onChange,
}: {
  value: AssignmentStatus;
  onChange: (s: AssignmentStatus) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as AssignmentStatus)}
      className={`text-xs font-medium px-2 py-1 rounded-md border cursor-pointer transition-colors appearance-none pr-5 bg-no-repeat bg-[right_6px_center] ${STATUS_COLORS[value]}`}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%236b7280' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
      }}
    >
      {Object.entries(ASSIGNMENT_STATUS_LABELS).map(([status, label]) => (
        <option key={status} value={status}>{label}</option>
      ))}
    </select>
  );
}

