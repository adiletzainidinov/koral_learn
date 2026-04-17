'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, UserPlus, Trash2, ChevronRight, Users } from 'lucide-react';
import { Input } from '@/shared/ui/input';
import { Button } from '@/shared/ui/button';
import { Badge, LevelBadge } from '@/shared/ui/badge';
import { EmptyState } from '@/shared/ui/empty-state';
import { Card } from '@/shared/ui/card';
import { PageHeader } from '@/shared/ui/page-header';
import { AddStudentModal } from '@/features/students/add-student-modal';
import { useAppStore, useStudents } from '@/store/app-store';
import { formatDate } from '@/shared/lib/dates';

export function StudentsTable() {
  const students = useStudents();
  const removeStudent = useAppStore((s) => s.removeStudent);
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filtered = students.filter((s) =>
    s.fullName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="Ученики"
        description={`${students.length} учеников`}
        action={
          <Button onClick={() => setAddOpen(true)}>
            <UserPlus className="size-4" />
            Добавить ученика
          </Button>
        }
      />

      <Card padding="none">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
            <Input
              placeholder="Поиск по имени..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <span className="text-xs text-slate-400">{filtered.length} из {students.length}</span>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Users className="size-5" />}
            title={search ? 'Ученики не найдены' : 'Учеников пока нет'}
            description={search ? 'Попробуйте другой запрос' : 'Добавьте первого ученика'}
            action={!search ? <Button onClick={() => setAddOpen(true)}><UserPlus className="size-4" />Добавить ученика</Button> : undefined}
            className="py-20"
          />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Ученик
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Группа
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Уровень
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Баллы
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Начало
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Статус
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((student) => (
                <tr key={student.id} className="group hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold shrink-0">
                        {student.fullName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <Link
                          href={`/students/${student.id}`}
                          className="text-sm font-medium text-slate-900 hover:text-emerald-700 transition-colors"
                        >
                          {student.fullName}
                        </Link>
                        <p className="text-xs text-slate-400">{student.age} лет</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-600 font-medium">{student.group}</span>
                  </td>
                  <td className="px-4 py-3">
                    <LevelBadge level={student.level} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-bold text-slate-900">{student.totalPoints}</span>
                    <span className="text-xs text-slate-400 ml-1">б.</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-500">{formatDate(student.startedAt)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={student.isActive ? 'success' : 'danger'}>
                      {student.isActive ? 'Активен' : 'Неактивен'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {confirmDelete === student.id ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => {
                              removeStudent(student.id);
                              setConfirmDelete(null);
                            }}
                          >
                            Удалить
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmDelete(null)}
                          >
                            Отмена
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmDelete(student.id)}
                            className="size-7 p-0 text-slate-400 hover:text-red-500"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                          <Link href={`/students/${student.id}`}>
                            <Button variant="ghost" size="sm" className="size-7 p-0">
                              <ChevronRight className="size-3.5" />
                            </Button>
                          </Link>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <AddStudentModal isOpen={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
