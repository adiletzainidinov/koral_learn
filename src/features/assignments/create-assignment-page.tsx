'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Paperclip, X, File, GraduationCap, Home, Save } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { useAppStore, useStudentById } from '@/store/app-store';
import { generateId } from '@/shared/lib/ids';
import type { AssignmentType, AssignmentAttachment } from '@/entities/assignment/model/types';

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

interface Draft {
  title: string;
  assignmentType: AssignmentType;
  description: string;
  dueDate: string;
}

function draftKey(studentId: string) {
  return `assignment-draft-${studentId}`;
}

function loadDraft(studentId: string): Draft | null {
  try {
    const raw = localStorage.getItem(draftKey(studentId));
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

function saveDraft(studentId: string, draft: Draft) {
  try {
    localStorage.setItem(draftKey(studentId), JSON.stringify(draft));
  } catch {}
}

function clearDraft(studentId: string) {
  try {
    localStorage.removeItem(draftKey(studentId));
  } catch {}
}

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

interface Props {
  studentId: string;
}

export function CreateAssignmentPage({ studentId }: Props) {
  const router = useRouter();
  const student = useStudentById(studentId);
  const createAssignment = useAppStore((s) => s.createAssignment);

  const [draftRestored, setDraftRestored] = useState(false);
  const [title, setTitle] = useState('');
  const [assignmentType, setAssignmentType] = useState<AssignmentType>('intermediate');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [attachments, setAttachments] = useState<AssignmentAttachment[]>([]);
  const [errors, setErrors] = useState<{ title?: string }>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Restore draft on mount
  useEffect(() => {
    const draft = loadDraft(studentId);
    if (draft && (draft.title || draft.description || draft.dueDate)) {
      setTitle(draft.title);
      setAssignmentType(draft.assignmentType ?? 'intermediate');
      setDescription(draft.description);
      setDueDate(draft.dueDate);
      setDraftRestored(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  // Auto-save draft on every change
  useEffect(() => {
    saveDraft(studentId, { title, assignmentType, description, dueDate });
  }, [studentId, title, assignmentType, description, dueDate]);

  const isDirty = !!(title || description || dueDate || attachments.length > 0);

  // Warn on browser refresh / tab close
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  function validate(): boolean {
    const errs: typeof errors = {};
    if (!title.trim()) errs.title = 'Введите название задания';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    createAssignment({
      studentId,
      title: title.trim(),
      description: description.trim(),
      dueDate: dueDate || undefined,
      assignmentType,
      attachments,
    });
    clearDraft(studentId);
    router.push(`/students/${studentId}`);
  }

  function handleCancel() {
    if (isDirty) {
      const confirmed = window.confirm(
        'Вы уверены, что хотите уйти? Черновик сохранён и будет доступен при следующем открытии.'
      );
      if (!confirmed) return;
    }
    router.push(`/students/${studentId}`);
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

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <p className="text-slate-500 mb-4">Ученик не найден</p>
        <Link href="/students">
          <Button variant="outline"><ArrowLeft className="size-4" />К списку учеников</Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6 pb-28">
        {/* breadcrumb */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/students">
            <Button variant="ghost" size="sm" className="size-8 p-0"><ArrowLeft className="size-4" /></Button>
          </Link>
          <Link href="/students" className="text-sm text-slate-400 hover:text-slate-600 transition-colors">Ученики</Link>
          <span className="text-slate-300">/</span>
          <Link href={`/students/${studentId}`} className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
            {student.fullName}
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-sm font-medium text-slate-900">Создать задание</span>
        </div>

        {/* header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Создать задание</h1>
            <p className="text-sm text-slate-500 mt-1">Выдайте задание ученику — {student.fullName}</p>
          </div>
          {draftRestored && (
            <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 shrink-0">
              <Save className="size-3.5" />
              Черновик восстановлен
            </div>
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
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <Save className="size-3" />
            Черновик сохраняется автоматически
          </p>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleCancel}>Отмена</Button>
            <Button onClick={handleSubmit}>Создать задание</Button>
          </div>
        </div>
      </div>
    </>
  );
}
