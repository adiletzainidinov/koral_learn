'use client';

import { useTranslation } from '@/shared/i18n/use-translation';
import { localizeUI } from '@/shared/i18n/translate';


import { getStudentGroupLabel } from '@/entities/student/model/groups';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, UserPlus, Trash2, Pencil, Users, SlidersHorizontal } from 'lucide-react';
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
import { STUDENT_LEVEL_LABELS } from '@/entities/student/model/types';

// ─── Attendance presence helper ───────────────────────────────────────────────

function getLatestAttendanceDate(studentId: string, records: AttendanceRecord[]): string | null {
  const studentRecords = records.filter((r) => r.studentId === studentId);
  if (studentRecords.length === 0) return null;
  return studentRecords.reduce((best, r) => (r.date > best.date ? r : best)).date;
}

function PresenceBadge({ studentId, records }: { studentId: string; records: AttendanceRecord[] }) {
  const { t: translateText, locale } = useTranslation();

  const latestDate = getLatestAttendanceDate(studentId, records);
  if (!latestDate) return <Badge variant="slate">{translateText("Нет данных")}</Badge>;
  const days = getDaysCount(latestDate);
  return <Badge variant={getAttendanceVariant(days)}>{getDaysAgoLabel(latestDate, locale)}</Badge>;
}

// ─── Sort / filter types ───────────────────────────────────────────────────────

type SortBy = 'points_desc' | 'points_asc' | 'date_newest' | 'date_oldest';

// ─── Component ────────────────────────────────────────────────────────────────

export function StudentsTable() {
  const { t: translateText, locale } = useTranslation();

  const students = useStudents();
  const records = useAttendanceRecords();
  const familyContacts = useAppStore((s) => s.familyContacts);
  const links = useAppStore((s) => s.studentFamilyContactLinks);
  const families = useAppStore((s) => s.families);
  const removeStudent = useAppStore((s) => s.removeStudent);
  const router = useRouter();

  // Map studentId → primary contact (or first contact) info for display
  const studentContactMap = useMemo(() => {
    const map: Record<string, { contactId: string; contactName: string }> = {};
    const familyById = new Map(families.map((f) => [f.id, f]));
    const contactById = new Map(familyContacts.map((c) => [c.id, c]));
    for (const student of students) {
      const studentLinks = links.filter((l) => l.studentId === student.id);
      if (studentLinks.length === 0) continue;
      // Prefer primary contact on the family
      const family = familyById.get(studentLinks[0].familyId);
      const preferredId = family?.primaryContactId;
      const link = studentLinks.find((l) => l.contactId === preferredId) ?? studentLinks.find((l) => l.isPrimaryContact) ?? studentLinks[0];
      const contact = contactById.get(link.contactId);
      if (contact) {
        map[student.id] = { contactId: contact.id, contactName: contact.fullName };
      }
    }
    return map;
  }, [students, links, families, familyContacts]);

  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterGroup, setFilterGroup] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [filterPresence, setFilterPresence] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('date_newest');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const groupOptions = useMemo(() => {
    const groups = [...new Set(students.map((s) => s.group).filter(Boolean))].sort();
    return [
      { value: '', label: translateText('Все группы') },
      ...groups.map((g) => ({ value: g, label: getStudentGroupLabel(g) })),
    ];
  }, [translateText, students]);

  const levelOptions = [
    { value: '', label: translateText('Все уровни') },
    ...Object.entries(localizeUI(STUDENT_LEVEL_LABELS, locale)).map(([value, label]) => ({ value, label })),
  ];

  const presenceOptions = [
    { value: '', label: translateText('Любой статус') },
    { value: 'today', label: translateText('Сегодня') },
    { value: 'recent', label: translateText('До 3 дней') },
    { value: 'few_days', label: translateText('4–9 дней') },
    { value: 'long_absent', label: translateText('10+ дней') },
    { value: 'no_data', label: translateText('Нет данных') },
  ];

  const sortOptions = [
    { value: 'date_newest', label: translateText('Сначала новые') },
    { value: 'date_oldest', label: translateText('Сначала старые') },
    { value: 'points_desc', label: translateText('Баллы: много → мало') },
    { value: 'points_asc', label: translateText('Баллы: мало → много') },
  ];

  const filtered = useMemo(() => {
    let result = students;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.fullName.toLowerCase().includes(q) ||
          getStudentGroupLabel(s.group).toLowerCase().includes(q) ||
          (studentContactMap[s.id]?.contactName ?? '').toLowerCase().includes(q)
      );
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
  }, [students, records, studentContactMap, search, filterGroup, filterLevel, filterPresence, sortBy]);

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
        title={translateText("Ученики")}
        description={translateText(`${students.length} учеников`)}
        action={
          <Link href="/students/new">
            <Button>
              <UserPlus className="size-4" />{translateText("Добавить ученика")}</Button>
          </Link>
        }
      />

      <Card padding="none">
        {/* Search + filters bar */}
        <div className="px-4 sm:px-5 py-3 border-b border-slate-100 space-y-3">
          <div className="grid grid-cols-1 sm:flex sm:items-center gap-3 sm:flex-wrap [&>div]:min-w-0">
            <div className="relative sm:flex-1 sm:min-w-48 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
              <Input
                placeholder={translateText("Поиск по имени или группе...")}
                aria-label={translateText("Поиск учеников")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Button
              type="button"
              variant="outline"
              className="sm:hidden"
              aria-expanded={filtersOpen}
              aria-controls="student-filters"
              onClick={() => setFiltersOpen((value) => !value)}
            >
              <SlidersHorizontal className="size-4" />
              {filtersOpen ? translateText('Скрыть фильтры') : translateText('Фильтры и сортировка')}
            </Button>
            <div id="student-filters" className={`${filtersOpen ? 'grid' : 'hidden'} grid-cols-1 gap-3 sm:contents`}>
            <Select
              options={groupOptions}
              value={filterGroup}
              onChange={(e) => setFilterGroup(e.target.value)}
              aria-label={translateText("Группа")}
              className="w-full sm:w-36"
            />

            <Select
              options={levelOptions}
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              aria-label={translateText("Уровень")}
              className="w-full sm:w-36"
            />

            <Select
              options={presenceOptions}
              value={filterPresence}
              onChange={(e) => setFilterPresence(e.target.value)}
              aria-label={translateText("Посещаемость")}
              className="w-full sm:w-44"
            />

            <Select
              options={sortOptions}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              aria-label={translateText("Сортировка учеников")}
              className="w-full sm:w-52"
            />
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                >{translateText("Сбросить")}</button>
              )}
              <span className="text-xs text-slate-400">{filtered.length}{translateText(" из ")}{students.length}</span>
            </div>
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Users className="size-5" />}
            title={hasFilters ? translateText('Ученики не найдены') : translateText('Учеников пока нет')}
            description={hasFilters ? translateText('Попробуйте изменить фильтры') : translateText('Добавьте первого ученика')}
            action={
              !hasFilters ? (
                <Link href="/students/new">
                  <Button><UserPlus className="size-4" />{translateText("Добавить ученика")}</Button>
                </Link>
              ) : undefined
            }
            className="py-20"
          />
        ) : (
          <>
          <ul className="md:hidden divide-y divide-slate-100" aria-label={translateText("Ученики")}>
            {filtered.map((student) => (
              <li key={student.id} className="p-4 space-y-3">
                <Link href={`/students/${student.id}`} className="flex items-center gap-3 min-h-11 rounded-lg focus-visible:outline-2 focus-visible:outline-emerald-600">
                  <div className="size-11 shrink-0 rounded-full overflow-hidden bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold">
                    {student.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={student.avatar} alt="" className="size-full object-cover" />
                    ) : student.fullName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-slate-900 break-words">{student.fullName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{student.age}{translateText(" лет · Группа ")}{getStudentGroupLabel(student.group)}</p>
                  </div>
                  <span className="shrink-0 font-bold text-emerald-700 text-sm">{student.totalPoints}{translateText(" б.")}</span>
                </Link>
                <div className="flex flex-wrap items-center gap-2">
                  <LevelBadge level={student.level} />
                  <PresenceBadge studentId={student.id} records={records} />
                </div>
                {studentContactMap[student.id] && (
                  <Link href={`/parents/${studentContactMap[student.id].contactId}`} className="flex items-center min-h-11 text-sm text-slate-600 hover:text-emerald-700 break-words">{translateText("Представитель:")}{studentContactMap[student.id].contactName}
                  </Link>
                )}
                <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
                  <span className="text-xs text-slate-400">{translateText("С ")}{formatDate(student.startedAt)}</span>
                  <div className="flex items-center gap-1">
                    <Link href={`/students/${student.id}/edit`} aria-label={translateText(translateText(`Редактировать: ${student.fullName}`))} className="size-11 flex items-center justify-center rounded-lg text-slate-500 hover:bg-emerald-50 hover:text-emerald-700">
                      <Pencil className="size-4" />
                    </Link>
                    <Button variant="ghost" size="sm" className="size-11 p-0 text-slate-400 hover:text-red-500" onClick={() => setDeleteId(student.id)} aria-label={translateText(translateText(`Удалить: ${student.fullName}`))}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="table-scroll hidden md:block" role="region" aria-label={translateText("Таблица учеников с горизонтальной прокруткой")} tabIndex={0}>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{translateText("Ученик")}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{translateText("Группа")}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{translateText("Уровень")}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{translateText("Родитель")}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{translateText("Баллы")}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{translateText("Начало")}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{translateText("Посещаемость")}</th>
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
                        <p className="text-xs text-slate-400">{student.age}{translateText(" лет")}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-600 font-medium">{getStudentGroupLabel(student.group)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <LevelBadge level={student.level} />
                  </td>
                  <td className="px-4 py-3">
                    {studentContactMap[student.id] ? (
                      <Link
                        href={`/parents/${studentContactMap[student.id].contactId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-sm text-slate-600 hover:text-emerald-600 transition-colors"
                      >
                        {studentContactMap[student.id].contactName}
                      </Link>
                    ) : (
                      <span className="text-sm text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-bold text-slate-900">{student.totalPoints}</span>
                    <span className="text-xs text-slate-400 ml-1">{translateText("б.")}</span>
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
          </div>
          </>
        )}
      </Card>

      {/* Delete confirm modal */}
      <Modal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        size="sm"
        title={translateText("Удалить ученика?")}
        description={studentToDelete ? translateText(`«${studentToDelete.fullName}» будет удалён из списка. Это действие нельзя отменить.`) : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>{translateText("Отмена")}</Button>
            <Button
              variant="danger"
              onClick={() => {
                if (deleteId) {
                  removeStudent(deleteId);
                  setDeleteId(null);
                }
              }}
            >{translateText("Удалить")}</Button>
          </>
        }
      >
        <p className="text-sm text-slate-500">{translateText("Вместе с учеником будут удалены все связанные задания и история баллов.")}</p>
      </Modal>
    </div>
  );
}
