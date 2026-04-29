'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Paperclip, X, File, GraduationCap, Home, UserPlus, Search, Check } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { useAppStore, useStudents } from '@/store/app-store';
import { useUIStore } from '@/store/ui-store';
import { generateId } from '@/shared/lib/ids';
import type { AssignmentType, AssignmentAttachment } from '@/entities/assignment/model/types';
import type { Student } from '@/entities/student/model/types';

const TYPE_OPTIONS: { value: AssignmentType; label: string; desc: string; icon: React.ReactNode }[] = [
  {
    value: 'intermediate',
    label: 'Промежуточная',
    desc: 'Выполняется на уроке',
    icon: <GraduationCap className="size-5" />,
  },
  {
    value: 'homework',
    label: 'Домашняя',
    desc: 'Выполняется дома',
    icon: <Home className="size-5" />,
  },
];

function fileToAttachment(file: File): Promise<AssignmentAttachment> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve({
        id: generateId(),
        name: file.name,
        type: file.type,
        size: file.size,
        base64: e.target?.result as string,
        createdAt: new Date().toISOString(),
      });
    };
    reader.readAsDataURL(file);
  });
}

function pluralStudents(n: number) {
  if (n % 10 === 1 && n % 100 !== 11) return `${n} ученик`;
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return `${n} ученика`;
  return `${n} учеников`;
}

// ─── Student Selector Modal ──────────────────────────────────────────────────

interface StudentSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentIds: string[];
  allStudents: Student[];
  onApply: (ids: string[]) => void;
}

function StudentSelectorModal({ isOpen, onClose, currentIds, allStudents, onApply }: StudentSelectorModalProps) {
  const [draft, setDraft] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');

  useEffect(() => {
    if (isOpen) {
      setDraft(currentIds);
      setSearch('');
      setGroupFilter('all');
    }
  // currentIds intentionally omitted: snapshot on open only
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const activeStudents = allStudents.filter((s) => s.isActive);
  const groups = [...new Set(activeStudents.map((s) => String(s.group)))].sort();
  const visible = activeStudents
    .filter((s) => groupFilter === 'all' || String(s.group) === groupFilter)
    .filter((s) => !search || s.fullName.toLowerCase().includes(search.toLowerCase()));

  function toggle(id: string) {
    setDraft((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function selectAll() {
    setDraft((prev) => {
      const visibleIds = visible.map((s) => s.id);
      const merged = [...new Set([...prev, ...visibleIds])];
      return merged;
    });
  }

  function clearAll() {
    setDraft([]);
  }

  function handleApply() {
    onApply(draft);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* backdrop — intentionally no onClick to prevent accidental close */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
        {/* header */}
        <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Выбор учеников</h2>
            <p className={`text-sm mt-0.5 transition-colors ${draft.length > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
              {draft.length > 0 ? `Выбрано: ${pluralStudents(draft.length)}` : 'Никто не выбран'}
            </p>
          </div>
        </div>

        {/* search + filters — sticky */}
        <div className="px-6 pt-4 pb-3 flex flex-col gap-3 shrink-0 border-b border-slate-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по имени..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors bg-white"
            />
          </div>

          {groups.length > 1 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setGroupFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  groupFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Все группы
              </button>
              {groups.map((g) => (
                <button
                  key={g}
                  onClick={() => setGroupFilter(g)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    groupFilter === g ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Группа {g}
                </button>
              ))}
            </div>
          )}

          {visible.length > 1 && (
            <div className="flex items-center gap-3">
              <button
                onClick={selectAll}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium cursor-pointer"
              >
                Выбрать всех
              </button>
              {draft.length > 0 && (
                <>
                  <span className="text-slate-300">·</span>
                  <button onClick={clearAll} className="text-sm text-slate-500 hover:text-slate-700 cursor-pointer">
                    Снять выбор
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* scrollable list */}
        <div className="flex-1 overflow-y-auto px-6 py-3">
          {activeStudents.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-12">Нет активных учеников</p>
          ) : visible.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-12">Ученики не найдены</p>
          ) : (
            <div className="flex flex-col gap-1">
              {visible.map((s) => {
                const isSelected = draft.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggle(s.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer text-left w-full ${
                      isSelected
                        ? 'bg-emerald-50 border border-emerald-200'
                        : 'bg-white border border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`size-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                      isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 bg-white'
                    }`}>
                      {isSelected && <Check className="size-3 text-white" strokeWidth={3} />}
                    </div>
                    <div className={`size-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                      isSelected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {s.fullName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isSelected ? 'text-emerald-900' : 'text-slate-900'}`}>
                        {s.fullName}
                      </p>
                      <p className="text-xs text-slate-400">Группа {s.group}</p>
                    </div>
                    {isSelected && <span className="text-xs text-emerald-600 font-medium shrink-0">Выбран</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* footer — always visible */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <span className={`text-sm font-medium transition-colors ${draft.length > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
            {draft.length > 0 ? `Выбрано: ${pluralStudents(draft.length)}` : 'Никто не выбран'}
          </span>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose}>Отмена</Button>
            <Button onClick={handleApply} disabled={draft.length === 0}>Применить</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function CreateAssignmentsBulkPage() {
  const router = useRouter();
  const students = useStudents();
  const { selectedStudentIds, setSelectedStudentIds, removeStudentId, clearSelectedStudentIds } = useUIStore();
  const createAssignmentsForStudents = useAppStore((s) => s.createAssignmentsForStudents);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [assignmentType, setAssignmentType] = useState<AssignmentType>('intermediate');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [attachments, setAttachments] = useState<AssignmentAttachment[]>([]);
  const [errors, setErrors] = useState<{ title?: string }>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Guard: redirect on first mount if no students selected
  useEffect(() => {
    if (selectedStudentIds.length === 0) {
      router.replace('/assignments/create/select-students');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedStudents = students.filter((s) => selectedStudentIds.includes(s.id));

  function validate(): boolean {
    const errs: typeof errors = {};
    if (!title.trim()) errs.title = 'Введите название задания';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    createAssignmentsForStudents(
      {
        title: title.trim(),
        description: description.trim(),
        dueDate: dueDate || undefined,
        assignmentType,
        attachments,
      },
      selectedStudentIds
    );
    clearSelectedStudentIds();
    router.push('/assignments');
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const newAttachments = await Promise.all(files.map(fileToAttachment));
    setAttachments((prev) => [...prev, ...newAttachments]);
    e.target.value = '';
  }

  async function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find((item) => item.type.startsWith('image/'));
    if (!imageItem) return;
    e.preventDefault();
    const file = imageItem.getAsFile();
    if (!file) return;
    const att = await fileToAttachment(file);
    setAttachments((prev) => [...prev, att]);
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <>
      <div className="flex flex-col gap-6 pb-28">
        {/* breadcrumb */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/assignments">
            <Button variant="ghost" size="sm" className="size-8 p-0">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <Link href="/assignments" className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
            Задания
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-sm font-medium text-slate-900">Создать задание</span>
        </div>

        {/* header */}
        <div>
          <h1 className="text-xl font-bold text-slate-900">Создать задание</h1>
          <p className="text-sm text-slate-500 mt-1">Выдайте задание сразу нескольким ученикам</p>
        </div>

        {/* selected students — editable chips */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Задание будет создано для {pluralStudents(selectedStudentIds.length)}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {selectedStudents.map((s) => (
              <span
                key={s.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-xs font-medium hover:bg-emerald-100 transition-colors"
              >
                {s.fullName}
                <button
                  type="button"
                  onClick={() => removeStudentId(s.id)}
                  aria-label={`Удалить ${s.fullName}`}
                  className="size-3.5 flex items-center justify-center rounded-full text-emerald-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-dashed border-slate-300 text-slate-500 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full text-xs font-medium transition-colors cursor-pointer"
            >
              <UserPlus className="size-3.5" />
              Добавить учеников
            </button>
          </div>
          {selectedStudentIds.length === 0 && (
            <p className="text-xs text-red-500">Выберите хотя бы одного ученика</p>
          )}
        </div>

        {/* form */}
        <div className="max-w-2xl flex flex-col gap-6">
          {/* title */}
          <Input
            label="Название задания *"
            placeholder="Сура Аль-Фатиха, стр. 12–15..."
            value={title}
            onChange={(e) => { setTitle(e.target.value); setErrors((p) => ({ ...p, title: undefined })); }}
            error={errors.title}
          />

          {/* type */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-slate-700">Тип задания</p>
            <div className="grid grid-cols-2 gap-3">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAssignmentType(opt.value)}
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                    assignmentType === opt.value
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className={`mt-0.5 shrink-0 ${assignmentType === opt.value ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {opt.icon}
                  </span>
                  <div>
                    <p className={`text-sm font-semibold ${assignmentType === opt.value ? 'text-emerald-800' : 'text-slate-700'}`}>
                      {opt.label}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* description + attachments */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-slate-700">Описание и вложения</p>
            <div className="rounded-xl border border-slate-200 overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-colors">
              <textarea
                className="w-full px-4 py-3 text-sm resize-none outline-none min-h-[120px] placeholder:text-slate-400"
                placeholder="Что нужно сделать ученику..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onPaste={handlePaste}
              />
              <div className="flex items-center gap-3 px-4 py-2.5 border-t border-slate-100 bg-slate-50/80">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-emerald-600 transition-colors cursor-pointer"
                >
                  <Paperclip className="size-3.5" />
                  Прикрепить файл
                </button>
                <span className="text-slate-300 text-xs">·</span>
                <span className="text-xs text-slate-400">Ctrl+V для скриншота</span>
              </div>
            </div>

            {attachments.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-1">
                {attachments.map((att) => {
                  const isImage = att.type.startsWith('image/');
                  return (
                    <div key={att.id} className="relative group rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
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
                        <p className="text-[10px] text-slate-400">
                          {att.size < 1024
                            ? `${att.size} B`
                            : att.size < 1024 * 1024
                            ? `${(att.size / 1024).toFixed(1)} KB`
                            : `${(att.size / 1024 / 1024).toFixed(1)} MB`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(att.id)}
                        className="absolute top-1 right-1 size-5 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx,.txt"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* due date */}
          <Input
            label="Дедлайн (опционально)"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
      </div>

      {/* sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-slate-200 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-end gap-3">
          <Link href="/assignments">
            <Button variant="outline">Отмена</Button>
          </Link>
          <Button onClick={handleSubmit} disabled={selectedStudentIds.length === 0}>
            Создать для {pluralStudents(selectedStudentIds.length)}
          </Button>
        </div>
      </div>

      {/* student selector modal */}
      <StudentSelectorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentIds={selectedStudentIds}
        allStudents={students}
        onApply={setSelectedStudentIds}
      />
    </>
  );
}
