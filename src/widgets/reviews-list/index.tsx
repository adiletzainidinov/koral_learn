'use client';

import { ClipboardCheck } from 'lucide-react';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { AssignmentStatusBadge } from '@/shared/ui/badge';
import { EmptyState } from '@/shared/ui/empty-state';
import { PageHeader } from '@/shared/ui/page-header';
import { useAppStore, usePendingAssignments, useStudents } from '@/store/app-store';
import { formatDate } from '@/shared/lib/dates';
import type { AssignmentStatus } from '@/entities/assignment/model/types';

const REVIEW_ACTIONS: { status: Exclude<AssignmentStatus, 'pending'>; label: string; color: string }[] = [
  { status: 'not_done', label: 'Не сделано', color: 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' },
  { status: 'done', label: 'Сделано', color: 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200' },
  { status: 'good', label: 'Хорошо', color: 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-200' },
  { status: 'excellent', label: 'Отлично', color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200' },
];

export function ReviewsList() {
  const pending = usePendingAssignments();
  const students = useStudents();
  const updateStatus = useAppStore((s) => s.updateAssignmentStatus);

  const studentName = (id: string) =>
    students.find((s) => s.id === id)?.fullName ?? 'Неизвестный';

  const sorted = [...pending].sort(
    (a, b) => new Date(a.issuedAt).getTime() - new Date(b.issuedAt).getTime()
  );

  return (
    <div>
      <PageHeader
        title="Проверка заданий"
        description={`${pending.length} заданий ожидают проверки`}
      />

      {sorted.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ClipboardCheck className="size-5" />}
            title="Нет заданий на проверку"
            description="Все задания уже проверены. Отличная работа!"
            className="py-16"
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((assignment) => (
            <Card key={assignment.id} className="flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <AssignmentStatusBadge status={assignment.status} />
                  {assignment.dueDate && (
                    <span className="text-xs text-slate-400">
                      до {formatDate(assignment.dueDate)}
                    </span>
                  )}
                </div>
                <p className="text-base font-semibold text-slate-900">{assignment.title}</p>
                {assignment.description && (
                  <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">{assignment.description}</p>
                )}
                <p className="text-xs text-slate-400 mt-1">
                  {studentName(assignment.studentId)} · выдано {formatDate(assignment.issuedAt)}
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                {REVIEW_ACTIONS.map(({ status, label, color }) => (
                  <button
                    key={status}
                    onClick={() => updateStatus(assignment.id, status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${color}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
