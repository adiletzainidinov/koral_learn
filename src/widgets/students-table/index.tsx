'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, UserPlus, Trash2, Pencil, Users } from 'lucide-react';
import { Input } from '@/shared/ui/input';
import { Button } from '@/shared/ui/button';
import { Badge, LevelBadge } from '@/shared/ui/badge';
import { EmptyState } from '@/shared/ui/empty-state';
import { Card } from '@/shared/ui/card';
import { PageHeader } from '@/shared/ui/page-header';
import { Modal } from '@/shared/ui/modal';
import { Select } from '@/shared/ui/select';
import { useAppStore, useStudents, useAttendanceRecords } from '@/store/app-store';
import { formatDate } from '@/shared/lib/dates';
import { getDaysAgoLabel, getDaysCount, getAttendanceVariant } from '@/shared/lib/getDaysAgo';
import type { AttendanceRecord } from '@/entities/attendance/model/types';
import { STUDENT_LEVEL_LABELS, type StudentLevel } from '@/entities/student/model/types';

// ─── Attendance presence helper ───────────────────────────────────────────────

function getLatestAttendanceDate(studentId: string, records: AttendanceRecord[]): string | null {
  const studentRecords = records.filter((r) => r.studentId === studentId);
  if (studentRecords.length === 0) return null;
  return studentRecords.reduce((best, r) => (r.date > best.date ? r : best)).date;
}

function PresenceBadge({ studentId, records }: { studentId: string; records: AttendanceRecord[] }) {
  const latestDate = getLatestAttendanceDate(studentId, records);
  if (!latestDate) return <Badge variant="slate">Нет данных</Badge>;
  const days = getDaysCount(latestDate);
  return <Badge variant={getAttendanceVariant(days)}>{getDaysAgoLabel(latestDate)}</Badge>;
}

// ─── Sort / filter types ───────────────────────────────────────────────────────

type SortBy = 'points_desc' | 'points_asc' | 'date_newest' | 'date_oldest';

// ─── Component ────────────────────────────────────────────────────────────────

export function StudentsTable() {
  const students = useStudents();
  const records = useAttendanceRecords();
  const removeStudent = useAppStore((s) => s.removeStudent);
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [filterPresence, setFilterPresence] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('date_newest');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const groupOptions = useMemo(() => {
    const groups = [...new Set(students.map((s) => s.group).filter(Boolean))].sort();
    return [
      { value: '', label: 'Все группы' },
      ...groups.map((g) => ({ value: g, label: g })),
    ];
  }, [students]);

  const levelOptions = [
    { value: '', label: 'Все уровни' },
    ...Object.entries(STUDENT_LEVEL_LABELS).map(([value, label]) => ({ value, label })),
  ];

  const presenceOptions = [
    { value: '', label: 'Любой статус' },
    { value: 'today', label: 'Сегодня' },
    { value: 'recent', label: 'До 3 дней' },
    { value: 'few_days', label: '4–9 дней' },
    { value: 'long_absent', label: '10+ дней' },
    { value: 'no_data', label: 'Нет данных' },
  ];

  const sortOptions = [
    { value: 'date_newest', label: 'Сначала новые' },
    { value: 'date_oldest', label: 'Сначала старые' },
    { value: 'points_desc', label: 'Баллы: много → мало' },
    { value: 'points_asc', label: 'Баллы: мало → много' },
  ];

  const filtered = useMemo(() => {
    let result = students;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((s) => s.fullName.toLowerCase().includes(q));
    }
    if (filterGroup) {
      result = result.filter((s) => s.group === filterGroup);
    }
    if (filterLevel) {
      result = result.filter((s) => s.level === filterLevel);
    }
    if (filterPresence) {
      result = result.filter((s) => {
        const latestDate = getLatestAttendanceDate(s.id, records);
        if (filterPresence === 'no_data') return !latestDate;
        if (!latestDate) return false;
        const days = getDaysCount(latestDate);
        if (filterPresence === 'today') return days === 0;
        if (filterPresence === 'recent') return days >= 1 && days <= 3;
        if (filterPresence === 'few_days') return days >= 4 && days <= 9;
        if (filterPresence === 'long_absent') return days >= 10;
        return false;
      });
    }

    return [...result].sort((a, b) => {
      switch (sortBy) {
        case 'points_desc': return b.totalPoints - a.totalPoints;
        case 'points_asc': return a.totalPoints - b.totalPoints;
        case 'date_newest': return b.startedAt.localeCompare(a.startedAt);
        case 'date_oldest': return a.startedAt.localeCompare(b.startedAt);
        default: return 0;
      }
    });
  }, [students, records, search, filterGroup, filterLevel, filterPresence, sortBy]);

  const studentToDelete = students.find((s) => s.id === deleteId);

  const hasFilters = search || filterGroup || filterLevel || filterPresence || sortBy !== 'date_newest';

  function clearFilters() {
    setSearch('');
    setFilterGroup('');
    setFilterLevel('');
    setFilterPresence('');
    setSortBy('date_newest');
  }

  function handleRowClick(studentId: string) {
    router.push(`/students/${studentId}`);
  }

  return (
    <div>
      <PageHeader
        title="Ученики"
        description={`${students.length} учеников`}
        action={
          <Link href="/students/new">
            <Button>
              <UserPlus className="size-4" />
              Добавить ученика
            </Button>
          </Link>
        }
      />

      <Card padding="none">
        {/* Search + filters bar */}
        <div className="px-5 py-3 border-b border-slate-100 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
              <Input
                placeholder="Поиск по имени..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select
              options={groupOptions}
              value={filterGroup}
              onChange={(e) => setFilterGroup(e.target.value)}
              className="w-36"
            />

            <Select
              options={levelOptions}
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="w-36"
            />

            <Select
              options={presenceOptions}
              value={filterPresence}
              onChange={(e) => setFilterPresence(e.target.value)}
              className="w-44"
            />

            <Select
              options={sortOptions}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="w-52"
            />

            <div className="flex items-center gap-2 ml-auto">
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Сбросить
                </button>
              )}
              <span className="text-xs text-slate-400">{filtered.length} из {students.length}</span>
            </div>
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Users className="size-5" />}
            title={hasFilters ? 'Ученики не найдены' : 'Учеников пока нет'}
            description={hasFilters ? 'Попробуйте изменить фильтры' : 'Добавьте первого ученика'}
            action={
              !hasFilters ? (
                <Link href="/students/new">
                  <Button><UserPlus className="size-4" />Добавить ученика</Button>
                </Link>
              ) : undefined
            }
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
                  Посещаемость
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((student) => (
                <tr
                  key={student.id}
                  onClick={() => handleRowClick(student.id)}
                  className="group hover:bg-slate-50/80 transition-colors cursor-pointer"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-full overflow-hidden bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold shrink-0">
                        {student.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={student.avatar} alt={student.fullName} className="size-full object-cover" />
                        ) : (
                          student.fullName.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div>
                        <span className="text-sm font-medium text-slate-900 group-hover:text-emerald-700 transition-colors">
                          {student.fullName}
                        </span>
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
                    <PresenceBadge studentId={student.id} records={records} />
                  </td>
                  <td
                    className="px-4 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/students/${student.id}/edit`} onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-7 p-0 text-slate-400 hover:text-emerald-600"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(student.id)}
                        className="size-7 p-0 text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Delete confirm modal */}
      <Modal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        size="sm"
        title="Удалить ученика?"
        description={studentToDelete ? `«${studentToDelete.fullName}» будет удалён из списка. Это действие нельзя отменить.` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>
              Отмена
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (deleteId) {
                  removeStudent(deleteId);
                  setDeleteId(null);
                }
              }}
            >
              Удалить
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-500">
          Вместе с учеником будут удалены все связанные задания и история баллов.
        </p>
      </Modal>
    </div>
  );
}
