'use client';

import { useState, useRef, useEffect } from 'react';
import {
  ClipboardCheck, Search, X, File, Paperclip, ChevronRight,
  Check, ChevronDown, Users, Pencil, GraduationCap, Home,
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { AssignmentStatusBadge, AssignmentTypeBadge } from '@/shared/ui/badge';
import { EmptyState } from '@/shared/ui/empty-state';
import { PageHeader } from '@/shared/ui/page-header';
import { Modal } from '@/shared/ui/modal';
import { Lightbox } from '@/shared/ui/lightbox';
import { useAppStore, usePendingAssignments, useStudents } from '@/store/app-store';
import { formatDate, isTodayDate, isOverdue } from '@/shared/lib/dates';
import { getAssignmentPoints } from '@/entities/assignment/model/types';
import type { Assignment, AssignmentStatus, AssignmentType } from '@/entities/assignment/model/types';
import type { Student } from '@/entities/student/model/types';

// ─── constants ───────────────────────────────────────────────────────────────

const REVIEW_ACTIONS: {
  status: Exclude<AssignmentStatus, 'pending'>;
  label: string;
  cls: string;
}[] = [
  { status: 'not_done', label: 'Не сделано', cls: 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' },
  { status: 'done',     label: 'Сделано',    cls: 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200' },
  { status: 'good',     label: 'Хорошо',     cls: 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-200' },
  { status: 'excellent',label: 'Отлично',    cls: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200' },
];

const TYPE_BUTTONS: { value: AssignmentType; label: string; icon: React.ReactNode }[] = [
  { value: 'intermediate', label: 'Промежуточная', icon: <GraduationCap className="size-4" /> },
  { value: 'homework',     label: 'Домашняя',      icon: <Home className="size-4" /> },
];

type SortKey = 'newest' | 'oldest' | 'nearest_deadline' | 'overdue_first';
type DeadlineFilter = 'all' | 'today' | 'overdue' | 'none';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'newest',           label: 'Сначала новые' },
  { value: 'oldest',           label: 'Сначала старые' },
  { value: 'nearest_deadline', label: 'Ближайший дедлайн' },
  { value: 'overdue_first',    label: 'Просроченные сверху' },
];

const TYPE_OPTS: { value: AssignmentType | 'all'; label: string }[] = [
  { value: 'all',          label: 'Все типы' },
  { value: 'intermediate', label: 'Промежуточные' },
  { value: 'homework',     label: 'Домашние' },
];

const DEADLINE_OPTS: { value: DeadlineFilter; label: string }[] = [
  { value: 'all',     label: 'Любой дедлайн' },
  { value: 'today',   label: 'Сегодня' },
  { value: 'overdue', label: 'Просроченные' },
  { value: 'none',    label: 'Без дедлайна' },
];

// ─── helpers ─────────────────────────────────────────────────────────────────

function InfoCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs text-slate-400">{label}</p>
      <div>{children}</div>
    </div>
  );
}

function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ─── Student Multi-Select ─────────────────────────────────────────────────────

interface StudentMultiSelectProps {
  students: Student[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

function StudentMultiSelect({ students, selectedIds, onChange }: StudentMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onOutsideClick);
    return () => document.removeEventListener('mousedown', onOutsideClick);
  }, [open]);

  const visible = students.filter(
    (s) => !search || s.fullName.toLowerCase().includes(search.toLowerCase())
  );

  function toggle(id: string) {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id]
    );
  }

  function clearAll() {
    onChange([]);
    setOpen(false);
  }

  const selectedStudents = students.filter((s) => selectedIds.includes(s.id));

  return (
    <div ref={containerRef} className="relative">
      {/* trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-xl bg-white cursor-pointer transition-colors min-w-[160px] ${
          open
            ? 'border-emerald-500 ring-2 ring-emerald-500/20'
            : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <Users className="size-4 text-slate-400 shrink-0" />
        <span className={`flex-1 text-left ${selectedIds.length > 0 ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>
          {selectedIds.length === 0 ? 'Все ученики' : `${selectedIds.length} учен.`}
        </span>
        <ChevronDown className={`size-3.5 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* dropdown */}
      {open && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-slate-200 rounded-xl shadow-lg z-30">
          {/* search inside dropdown */}
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Поиск ученика…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-colors"
                autoFocus
              />
            </div>
          </div>

          {/* list */}
          <div className="max-h-52 overflow-y-auto p-1">
            {visible.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">Не найдено</p>
            ) : (
              visible.map((s) => {
                const isSelected = selectedIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggle(s.id)}
                    className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer text-left ${
                      isSelected ? 'bg-emerald-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className={`size-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                      isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 bg-white'
                    }`}>
                      {isSelected && <Check className="size-2.5 text-white" strokeWidth={3} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`truncate ${isSelected ? 'text-emerald-900 font-medium' : 'text-slate-700'}`}>
                        {s.fullName}
                      </p>
                      <p className="text-xs text-slate-400">Группа {s.group}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* footer */}
          {selectedIds.length > 0 && (
            <div className="p-2 border-t border-slate-100">
              <button
                onClick={clearAll}
                className="w-full text-xs text-center text-slate-500 hover:text-red-500 transition-colors cursor-pointer py-1"
              >
                Снять выбор ({selectedIds.length})
              </button>
            </div>
          )}
        </div>
      )}

      {/* selected chips row */}
      {selectedStudents.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {selectedStudents.map((s) => (
            <span
              key={s.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-xs font-medium"
            >
              {s.fullName}
              <button
                onClick={(e) => { e.stopPropagation(); toggle(s.id); }}
                className="size-3 flex items-center justify-center rounded-full text-emerald-400 hover:text-red-500 transition-colors cursor-pointer"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

interface DetailModalProps {
  assignment: Assignment;
  student: Student | undefined;
  onClose: () => void;
  onStatusChange: (status: Exclude<AssignmentStatus, 'pending'>) => void;
  onLightbox: (src: string, alt: string) => void;
}

function AssignmentDetailModal({
  assignment,
  student,
  onClose,
  onStatusChange,
  onLightbox,
}: DetailModalProps) {
  const updateAssignment = useAppStore((s) => s.updateAssignment);
  const updateComment    = useAppStore((s) => s.updateAssignmentComment);

  // view-mode comment (auto-save on blur)
  const [comment, setComment] = useState(assignment.teacherComment ?? '');

  // edit mode
  const [isEditing,       setIsEditing]       = useState(false);
  const [editTitle,       setEditTitle]       = useState(assignment.title);
  const [editDescription, setEditDescription] = useState(assignment.description);
  const [editType,        setEditType]        = useState<AssignmentType>(assignment.assignmentType ?? 'homework');
  const [editDueDate,     setEditDueDate]     = useState(assignment.dueDate ?? '');

  const attachments    = assignment.attachments ?? [];
  const dueDateOverdue = assignment.dueDate && isOverdue(assignment.dueDate);
  const dueDateToday   = assignment.dueDate && isTodayDate(assignment.dueDate);

  function saveComment() {
    const trimmed = comment.trim();
    if (trimmed !== (assignment.teacherComment ?? '')) {
      updateComment(assignment.id, trimmed);
    }
  }

  function handleStatus(status: Exclude<AssignmentStatus, 'pending'>) {
    saveComment();
    onStatusChange(status);
  }

  function handleStartEdit() {
    // sync edit fields with latest assignment data
    setEditTitle(assignment.title);
    setEditDescription(assignment.description);
    setEditType(assignment.assignmentType ?? 'homework');
    setEditDueDate(assignment.dueDate ?? '');
    setIsEditing(true);
  }

  function handleSave() {
    updateAssignment(assignment.id, {
      title:          editTitle.trim() || assignment.title,
      description:    editDescription.trim(),
      assignmentType: editType,
      dueDate:        editDueDate || undefined,
      teacherComment: comment.trim(),
    });
    setIsEditing(false);
  }

  function handleCancelEdit() {
    setEditTitle(assignment.title);
    setEditDescription(assignment.description);
    setEditType(assignment.assignmentType ?? 'homework');
    setEditDueDate(assignment.dueDate ?? '');
    setIsEditing(false);
  }

  // ── footer

  const footer = isEditing ? (
    <div className="flex items-center justify-between w-full">
      <Button variant="outline" onClick={handleCancelEdit}>
        Отмена
      </Button>
      <Button onClick={handleSave}>
        Сохранить изменения
      </Button>
    </div>
  ) : (
    <div className="flex items-center justify-between w-full gap-3">
      {/* LEFT: secondary actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          Закрыть
        </button>
        <button
          onClick={handleStartEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <Pencil className="size-3.5" />
          Редактировать
        </button>
      </div>
      {/* RIGHT: primary actions */}
      <div className="flex items-center gap-2">
        {REVIEW_ACTIONS.map(({ status, label, cls }) => (
          <button
            key={status}
            onClick={() => handleStatus(status)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${cls}`}
          >
            {label}
            <span className="opacity-60 ml-1">
              +{getAssignmentPoints(status, assignment.assignmentType)}б
            </span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Modal
      isOpen
      onClose={isEditing ? handleCancelEdit : onClose}
      title={isEditing ? 'Редактировать задание' : assignment.title}
      description={
        isEditing
          ? undefined
          : student
          ? `${student.fullName} · Группа ${student.group}`
          : undefined
      }
      size="lg"
      closeOnBackdrop={!isEditing}
      footer={footer}
    >
      {isEditing ? (
        /* ── edit form ─────────────────────────────────────────────── */
        <div className="flex flex-col gap-5">
          {/* title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Название *
            </label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="px-4 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
              placeholder="Название задания…"
            />
          </div>

          {/* type */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Тип задания
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TYPE_BUTTONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setEditType(opt.value)}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border-2 text-left text-sm font-medium transition-all cursor-pointer ${
                    editType === opt.value
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  <span className={editType === opt.value ? 'text-emerald-600' : 'text-slate-400'}>
                    {opt.icon}
                  </span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Описание
            </label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="px-4 py-3 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors resize-none min-h-[100px] placeholder:text-slate-400"
              placeholder="Что нужно сделать ученику…"
            />
          </div>

          {/* due date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Дедлайн
            </label>
            <input
              type="date"
              value={editDueDate}
              onChange={(e) => setEditDueDate(e.target.value)}
              className="px-4 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors w-full"
            />
            {editDueDate && (
              <button
                onClick={() => setEditDueDate('')}
                className="text-xs text-slate-400 hover:text-red-500 self-start transition-colors cursor-pointer"
              >
                Убрать дедлайн
              </button>
            )}
          </div>

          {/* comment */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Комментарий преподавателя
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="px-4 py-3 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors resize-none min-h-[80px] placeholder:text-slate-400"
              placeholder="Хорошо, но нужно повторить…"
            />
          </div>
        </div>
      ) : (
        /* ── view mode ─────────────────────────────────────────────── */
        <>
          {/* info grid */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
            <InfoCell label="Тип">
              {assignment.assignmentType
                ? <AssignmentTypeBadge type={assignment.assignmentType} />
                : <span className="text-sm text-slate-400">—</span>}
            </InfoCell>
            <InfoCell label="Статус">
              <AssignmentStatusBadge status={assignment.status} />
            </InfoCell>
            <InfoCell label="Выдано">
              <span className="text-sm text-slate-700">{formatDate(assignment.issuedAt)}</span>
            </InfoCell>
            <InfoCell label="Дедлайн">
              {assignment.dueDate ? (
                <span className={`text-sm font-medium ${
                  dueDateOverdue ? 'text-red-600' : dueDateToday ? 'text-amber-600' : 'text-slate-700'
                }`}>
                  {formatDate(assignment.dueDate)}
                  {dueDateOverdue && <span className="ml-1 text-xs">(просрочен)</span>}
                  {dueDateToday   && <span className="ml-1 text-xs">(сегодня)</span>}
                </span>
              ) : (
                <span className="text-sm text-slate-400">Без дедлайна</span>
              )}
            </InfoCell>
          </div>

          {/* description */}
          {assignment.description && (
            <div className="mb-6">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Описание</p>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {assignment.description}
              </p>
            </div>
          )}

          {/* attachments */}
          {attachments.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Вложения ({attachments.length})
              </p>
              <div className="grid grid-cols-4 gap-2">
                {attachments.map((att) => {
                  const isImage = att.type.startsWith('image/');
                  return (
                    <div
                      key={att.id}
                      onClick={() => isImage && att.base64 && onLightbox(att.base64, att.name)}
                      className={`rounded-xl border border-slate-200 overflow-hidden bg-slate-50 ${
                        isImage && att.base64 ? 'cursor-pointer hover:border-emerald-300 transition-colors' : ''
                      }`}
                    >
                      <div className="aspect-square flex items-center justify-center bg-slate-100">
                        {isImage && att.base64 ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={att.base64} alt={att.name} className="size-full object-cover" />
                        ) : (
                          <File className="size-6 text-slate-300" />
                        )}
                      </div>
                      <div className="px-2 py-1.5">
                        <p className="text-[10px] font-medium text-slate-600 truncate">{att.name}</p>
                        <p className="text-[10px] text-slate-400">{fileSize(att.size)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* comment */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Комментарий преподавателя
            </p>
            <textarea
              className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors resize-none min-h-[80px] placeholder:text-slate-400"
              placeholder="Хорошо, но нужно повторить…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onBlur={saveComment}
            />
            <p className="text-xs text-slate-400 mt-1.5">
              Сохраняется автоматически · также сохраняется при нажатии кнопки проверки
            </p>
          </div>
        </>
      )}
    </Modal>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function ReviewsList() {
  const pending  = usePendingAssignments();
  const students = useStudents();
  const updateStatus = useAppStore((s) => s.updateAssignmentStatus);

  // ── filter state
  const [search,          setSearch]          = useState('');
  const [selectedStudIds, setSelectedStudIds] = useState<string[]>([]);
  const [groupFilter,     setGroupFilter]     = useState('all');
  const [typeFilter,      setTypeFilter]      = useState<AssignmentType | 'all'>('all');
  const [deadlineFilter,  setDeadlineFilter]  = useState<DeadlineFilter>('all');
  const [sortKey,         setSortKey]         = useState<SortKey>('newest');

  // ── ui state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lightbox,   setLightbox]   = useState<{ src: string; alt: string } | null>(null);

  const studentMap = new Map(students.map((s) => [s.id, s]));

  // options derived from pending only
  const pendingStudentIds  = new Set(pending.map((a) => a.studentId));
  const relevantStudents   = students
    .filter((s) => pendingStudentIds.has(s.id))
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
  const groups = [...new Set(relevantStudents.map((s) => String(s.group)))].sort();

  // ── filtering
  const filtered = pending
    .filter((a) => {
      if (!search) return true;
      const q = search.toLowerCase();
      const studentName = studentMap.get(a.studentId)?.fullName.toLowerCase() ?? '';
      return (
        a.title.toLowerCase().includes(q) ||
        (a.description?.toLowerCase().includes(q) ?? false) ||
        studentName.includes(q)
      );
    })
    .filter((a) =>
      selectedStudIds.length === 0 || selectedStudIds.includes(a.studentId)
    )
    .filter((a) => {
      if (groupFilter === 'all') return true;
      return String(studentMap.get(a.studentId)?.group ?? '') === groupFilter;
    })
    .filter((a) => typeFilter === 'all' || (a.assignmentType ?? 'homework') === typeFilter)
    .filter((a) => {
      if (deadlineFilter === 'all')     return true;
      if (deadlineFilter === 'none')    return !a.dueDate;
      if (deadlineFilter === 'today')   return !!a.dueDate && isTodayDate(a.dueDate);
      if (deadlineFilter === 'overdue') return !!a.dueDate && isOverdue(a.dueDate);
      return true;
    });

  // ── sorting
  const sorted = [...filtered].sort((a, b) => {
    switch (sortKey) {
      case 'oldest':
        return new Date(a.issuedAt).getTime() - new Date(b.issuedAt).getTime();
      case 'nearest_deadline':
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      case 'overdue_first': {
        const aOvr = a.dueDate && isOverdue(a.dueDate);
        const bOvr = b.dueDate && isOverdue(b.dueDate);
        if (aOvr && !bOvr) return -1;
        if (!aOvr && bOvr) return  1;
        return new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime();
      }
      default:
        return new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime();
    }
  });

  const selectedAssignment = selectedId
    ? (pending.find((a) => a.id === selectedId) ?? null)
    : null;

  const hasActiveFilters =
    !!search || selectedStudIds.length > 0 || groupFilter !== 'all' ||
    typeFilter !== 'all' || deadlineFilter !== 'all';

  function resetFilters() {
    setSearch('');
    setSelectedStudIds([]);
    setGroupFilter('all');
    setTypeFilter('all');
    setDeadlineFilter('all');
  }

  function handleQuickStatus(
    assignmentId: string,
    status: Exclude<AssignmentStatus, 'pending'>,
    e: React.MouseEvent,
  ) {
    e.stopPropagation();
    updateStatus(assignmentId, status);
  }

  function handleDetailStatus(status: Exclude<AssignmentStatus, 'pending'>) {
    if (!selectedId) return;
    updateStatus(selectedId, status);
    setSelectedId(null);
  }

  // ─── render ──────────────────────────────────────────────────────────────

  return (
    <div>
      <PageHeader
        title="Проверка заданий"
        description={`${pending.length} заданий ожидают проверки`}
      />

      {/* ── filter panel ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 mb-6">
        {/* search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Поиск по названию, описанию или ученику…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors bg-white"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* selects row */}
        <div className="flex items-start gap-2 flex-wrap">
          {/* multi-select студентов */}
          <StudentMultiSelect
            students={relevantStudents}
            selectedIds={selectedStudIds}
            onChange={setSelectedStudIds}
          />

          {/* group */}
          {groups.length > 1 && (
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-slate-700 cursor-pointer"
            >
              <option value="all">Все группы</option>
              {groups.map((g) => (
                <option key={g} value={g}>Группа {g}</option>
              ))}
            </select>
          )}

          {/* sort */}
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-slate-700 cursor-pointer"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* reset */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 hover:text-red-500 border border-slate-200 hover:border-red-200 rounded-xl transition-colors cursor-pointer bg-white"
            >
              <X className="size-3.5" />
              Сбросить
            </button>
          )}
        </div>

        {/* type + deadline pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {TYPE_OPTS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTypeFilter(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                typeFilter === opt.value
                  ? 'bg-slate-800 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
          <span className="text-slate-200 mx-1">|</span>
          {DEADLINE_OPTS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDeadlineFilter(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                deadlineFilter === opt.value
                  ? 'bg-amber-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── result count ─────────────────────────────────────────────────── */}
      {pending.length > 0 && (
        <p className="text-xs text-slate-400 mb-3">
          {hasActiveFilters
            ? `Показано ${sorted.length} из ${pending.length}`
            : `${pending.length} заданий на проверке`}
        </p>
      )}

      {/* ── list ─────────────────────────────────────────────────────────── */}
      {pending.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ClipboardCheck className="size-5" />}
            title="Нет заданий на проверку"
            description="Все задания уже проверены. Отличная работа!"
            className="py-16"
          />
        </Card>
      ) : sorted.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Search className="size-5" />}
            title="Ничего не найдено"
            description="Попробуйте изменить фильтры или поисковый запрос"
            action={
              <Button variant="outline" onClick={resetFilters}>
                <X className="size-4" />Сбросить фильтры
              </Button>
            }
            className="py-16"
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((assignment) => {
            const student     = studentMap.get(assignment.studentId);
            const attachCount = assignment.attachments?.length ?? 0;
            const overdue     = assignment.dueDate && isOverdue(assignment.dueDate);
            const todayDue    = assignment.dueDate && isTodayDate(assignment.dueDate);

            return (
              <div
                key={assignment.id}
                onClick={() => setSelectedId(assignment.id)}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 cursor-pointer hover:border-emerald-300 hover:shadow-md transition-all group"
              >
                <div className="flex items-start gap-3">
                  {/* left: info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <AssignmentStatusBadge status={assignment.status} />
                      {assignment.assignmentType && (
                        <AssignmentTypeBadge type={assignment.assignmentType} />
                      )}
                      {overdue && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-red-100 text-red-700">
                          Просрочен
                        </span>
                      )}
                      {todayDue && !overdue && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-amber-100 text-amber-700">
                          Сегодня
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-semibold text-slate-900 group-hover:text-emerald-800 transition-colors">
                      {assignment.title}
                    </p>

                    {assignment.description && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                        {assignment.description}
                      </p>
                    )}

                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap text-xs text-slate-400">
                      {student && (
                        <>
                          <span>{student.fullName}</span>
                          <span>·</span>
                          <span>Группа {student.group}</span>
                          <span>·</span>
                        </>
                      )}
                      <span>Выдано {formatDate(assignment.issuedAt)}</span>
                      {assignment.dueDate && (
                        <>
                          <span>·</span>
                          <span className={
                            overdue ? 'text-red-500 font-medium' :
                            todayDue ? 'text-amber-500 font-medium' : ''
                          }>
                            до {formatDate(assignment.dueDate)}
                          </span>
                        </>
                      )}
                      {attachCount > 0 && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-0.5">
                            <Paperclip className="size-3" />{attachCount}
                          </span>
                        </>
                      )}
                      {assignment.teacherComment && (
                        <>
                          <span>·</span>
                          <span className="text-emerald-600">💬 комментарий</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* right: quick actions + chevron */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div
                      className="hidden sm:flex items-center gap-1 flex-wrap justify-end"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {REVIEW_ACTIONS.map(({ status, label, cls }) => (
                        <button
                          key={status}
                          onClick={(e) => handleQuickStatus(assignment.id, status, e)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${cls}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <ChevronRight className="size-4 text-slate-300 group-hover:text-emerald-500 transition-colors shrink-0" />
                  </div>
                </div>

                {/* mobile: action buttons below */}
                <div
                  className="flex sm:hidden items-center gap-1.5 mt-3 pt-3 border-t border-slate-100 flex-wrap"
                  onClick={(e) => e.stopPropagation()}
                >
                  {REVIEW_ACTIONS.map(({ status, label, cls }) => (
                    <button
                      key={status}
                      onClick={(e) => handleQuickStatus(assignment.id, status, e)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${cls}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── detail modal ─────────────────────────────────────────────────── */}
      {selectedAssignment && (
        <AssignmentDetailModal
          assignment={selectedAssignment}
          student={studentMap.get(selectedAssignment.studentId)}
          onClose={() => setSelectedId(null)}
          onStatusChange={handleDetailStatus}
          onLightbox={(src, alt) => setLightbox({ src, alt })}
        />
      )}

      {/* ── lightbox ─────────────────────────────────────────────────────── */}
      <Lightbox
        isOpen={!!lightbox}
        imageSrc={lightbox?.src ?? ''}
        imageAlt={lightbox?.alt ?? ''}
        onClose={() => setLightbox(null)}
      />
    </div>
  );
}
