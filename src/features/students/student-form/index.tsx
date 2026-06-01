'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  User,
  MapPin,
  FileText,
  Paperclip,
  File as FileIcon,
  Trash2,
  X,
  AlertTriangle,
  Camera,
  UserRound,
  MessageCircle,
  Phone,
  Users,
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Select } from '@/shared/ui/select';
import { Card } from '@/shared/ui/card';
import { useAppStore, useParents } from '@/store/app-store';
import { generateId } from '@/shared/lib/ids';
import { cn } from '@/shared/lib/cn';
import type { StudentLevel, StudentContact, StudentAttachment } from '@/entities/student/model/types';
import type { Parent } from '@/entities/parent/model/types';
import { formatWhatsappLink } from '@/entities/parent/model/helpers';
import { StudentFriendsSelector } from '@/features/students/student-friends-selector';

// ─── internal form types ─────────────────────────────────────────────────────

interface AttachmentEntry {
  id: string;
  name: string;
  type: string;
  size: number;
  previewUrl?: string;
  base64?: string;
  createdAt: string;
}

interface FormState {
  fullName: string;
  age: string;
  group: string;
  level: StudentLevel;
  startedAt: string;
  address: string;
  studentPhone: string;
  studentWhatsapp: string;
  studentTelegram: string;
  studentInstagram: string;
  friendIds: string[];
  notes: string;
  attachments: AttachmentEntry[];
  avatar?: string;
  parentId?: string;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const LEVEL_OPTIONS = [
  { value: 'beginner', label: 'Начинающий' },
  { value: 'intermediate', label: 'Средний' },
  { value: 'advanced', label: 'Продвинутый' },
];

const GROUP_OPTIONS = [
  { value: 'A', label: 'Группа A' },
  { value: 'B', label: 'Группа B' },
  { value: 'C', label: 'Группа C' },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function compressAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const MAX = 256;
      let { naturalWidth: w, naturalHeight: h } = img;
      if (w > h) { if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; } }
      else        { if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; } }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('canvas ctx unavailable')); return; }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('image load failed')); };
    img.src = objectUrl;
  });
}

const INITIAL_STATE: FormState = {
  fullName: '',
  age: '',
  group: 'A',
  level: 'beginner',
  startedAt: new Date().toISOString().slice(0, 10),
  address: '',
  studentPhone: '',
  studentWhatsapp: '',
  studentTelegram: '',
  studentInstagram: '',
  friendIds: [],
  notes: '',
  attachments: [],
  avatar: undefined,
  parentId: undefined,
};

// ─── section wrapper ─────────────────────────────────────────────────────────

function Section({
  icon, title, description, children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card padding="none">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
        <div className="size-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="p-6">{children}</div>
    </Card>
  );
}

// ─── avatar uploader ─────────────────────────────────────────────────────────

function AvatarUploader({
  avatar, initials, onFile, onRemove,
}: {
  avatar?: string;
  initials: string;
  onFile: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    e.target.value = '';
  }
  return (
    <div className="flex items-center gap-5 pb-5 mb-1 border-b border-slate-100">
      <div className="relative group/av shrink-0">
        <div className="size-20 rounded-full overflow-hidden bg-emerald-100 flex items-center justify-center text-emerald-700 text-xl font-bold select-none">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="avatar" className="size-full object-cover" />
          ) : (
            initials || <User className="size-7 text-emerald-400" />
          )}
        </div>
        <button type="button" onClick={() => inputRef.current?.click()}
          className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover/av:opacity-100 transition-opacity flex items-center justify-center">
          <Camera className="size-5 text-white" />
        </button>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-slate-700">Фото ученика</p>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            <Camera className="size-3.5" />{avatar ? 'Изменить фото' : 'Загрузить фото'}
          </Button>
          {avatar && (
            <Button type="button" variant="ghost" size="sm" onClick={onRemove}
              className="text-red-500 hover:text-red-600 hover:bg-red-50">
              <X className="size-3.5" />Удалить
            </Button>
          )}
        </div>
        <p className="text-xs text-slate-400">JPG, PNG, WEBP · до 5 МБ</p>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="sr-only" onChange={handleChange} />
    </div>
  );
}

// ─── parent combobox ──────────────────────────────────────────────────────────

function ParentCombobox({
  parentId, onChange, parents, error, inputRef,
}: {
  parentId?: string;
  onChange: (id: string | undefined) => void;
  parents: Parent[];
  error?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedParent = useMemo(() => parents.find((p) => p.id === parentId), [parents, parentId]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return parents;
    return parents.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        p.whatsapp.includes(q) ||
        (p.phone ?? '').includes(q)
    );
  }, [parents, search]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const inputValue = selectedParent ? selectedParent.fullName : search;

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-700">Родитель / опекун *</label>
      <div ref={containerRef} className="relative">
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={inputValue}
          onChange={(e) => {
            if (selectedParent) onChange(undefined);
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Поиск по имени или номеру..."
          className={cn(
            'h-9 w-full rounded-lg border px-3 pr-8 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors',
            error ? 'border-red-300 bg-red-50/40' : 'border-slate-200 bg-white'
          )}
        />
        {selectedParent && (
          <button type="button"
            onClick={() => { onChange(undefined); setSearch(''); setIsOpen(false); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 size-5 flex items-center justify-center text-slate-400 hover:text-slate-600">
            <X className="size-3.5" />
          </button>
        )}
        {isOpen && (
          <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-auto max-h-56">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-sm text-slate-400">Родителей не найдено</p>
            ) : (
              filtered.map((p) => {
                const initials = p.fullName.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
                return (
                  <button key={p.id} type="button"
                    onMouseDown={(e) => { e.preventDefault(); onChange(p.id); setSearch(''); setIsOpen(false); }}
                    className={cn(
                      'w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 transition-colors',
                      parentId === p.id && 'bg-emerald-50'
                    )}
                  >
                    <div className="size-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{p.fullName}</p>
                      <p className="text-xs text-slate-400">{p.whatsapp}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
      {selectedParent && (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg border border-green-100">
          <MessageCircle className="size-3.5 text-green-600 shrink-0" />
          <span className="text-sm text-green-700 flex-1">{selectedParent.whatsapp}</span>
          <a href={formatWhatsappLink(selectedParent.whatsapp)} target="_blank" rel="noopener noreferrer"
            className="text-xs text-green-600 hover:underline font-medium">Написать</a>
        </div>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ─── attachment item ──────────────────────────────────────────────────────────

function AttachmentItem({ attachment, onRemove }: { attachment: AttachmentEntry; onRemove: () => void }) {
  const isImage = attachment.type.startsWith('image/');
  const preview = attachment.base64 ?? attachment.previewUrl;
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white group">
      <div className="size-10 rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center shrink-0">
        {isImage && preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={attachment.name} className="size-full object-cover" />
        ) : (
          <FileIcon className="size-4 text-slate-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{attachment.name}</p>
        <p className="text-xs text-slate-400">
          {formatFileSize(attachment.size)}
          {!isImage && ' · только метаданные'}
          {isImage && !attachment.base64 && ' · превью временное'}
        </p>
      </div>
      <button type="button" onClick={onRemove}
        className="size-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

// ─── main form ────────────────────────────────────────────────────────────────

interface Errors {
  fullName?: string;
  age?: string;
  parentId?: string;
}

interface Props {
  mode?: 'create' | 'edit';
  studentId?: string;
}

export function StudentForm({ mode = 'create', studentId }: Props) {
  const router = useRouter();
  const addStudent = useAppStore((s) => s.addStudent);
  const updateStudent = useAppStore((s) => s.updateStudent);
  const students = useAppStore((s) => s.students);
  const parents = useParents();

  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<Errors>({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [studentNotFound, setStudentNotFound] = useState(false);
  const hasLoaded = useRef(false);

  // Preserve legacy family contacts so edit-mode doesn't erase old data
  const existingContactsRef = useRef<StudentContact[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentZoneRef = useRef<HTMLDivElement>(null);
  const fullNameRef = useRef<HTMLInputElement>(null);
  const ageRef = useRef<HTMLInputElement>(null);
  const parentComboboxRef = useRef<HTMLInputElement>(null);

  // Exclude self from friends list in edit mode
  const otherStudents = useMemo(
    () => students.filter((s) => s.id !== studentId),
    [students, studentId]
  );

  // ── avatar ─────────────────────────────────────────────────────────────────

  async function handleAvatarFile(file: File) {
    if (file.size > 5 * 1024 * 1024) { alert('Файл слишком большой. Максимальный размер — 5 МБ.'); return; }
    try { upd('avatar', await compressAvatar(file)); }
    catch { try { upd('avatar', await fileToBase64(file)); } catch { /* ignore */ } }
  }

  useEffect(() => {
    if (mode !== 'edit' || !studentId || hasLoaded.current) return;
    const student = students.find((s) => s.id === studentId);
    if (!student) { setStudentNotFound(true); return; }
    hasLoaded.current = true;
    existingContactsRef.current = student.contacts ?? [];
    setForm({
      fullName: student.fullName,
      age: String(student.age),
      group: student.group,
      level: student.level,
      startedAt: student.startedAt,
      address: student.address ?? '',
      studentPhone: student.studentPhone ?? '',
      studentWhatsapp: student.studentWhatsapp ?? '',
      studentTelegram: student.studentTelegram ?? '',
      studentInstagram: student.studentInstagram ?? '',
      friendIds: student.friendIds ?? [],
      notes: student.notes ?? '',
      attachments: student.attachments.map((a) => ({
        id: a.id, name: a.name, type: a.type, size: a.size,
        base64: a.base64, previewUrl: a.base64, createdAt: a.createdAt,
      })),
      avatar: student.avatar,
      parentId: student.parentId,
    });
    setIsDirty(false);
  }, [mode, studentId, students]);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const upd = useCallback(<K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  }, []);

  // ── validation ────────────────────────────────────────────────────────────

  function validate(): boolean {
    const errs: Errors = {};
    if (!form.fullName.trim()) errs.fullName = 'Введите имя ученика';
    if (!form.age.trim()) errs.age = 'Введите возраст ученика';
    else if (isNaN(Number(form.age)) || Number(form.age) <= 0) errs.age = 'Введите корректный возраст';
    if (!form.parentId) errs.parentId = 'Выберите родителя ученика';
    setErrors(errs);
    if (errs.fullName) fullNameRef.current?.focus();
    else if (errs.age) ageRef.current?.focus();
    else if (errs.parentId) parentComboboxRef.current?.focus();
    return Object.keys(errs).length === 0;
  }

  function clearError(field: keyof Errors) {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  // ── attachments ───────────────────────────────────────────────────────────

  async function processFiles(files: File[]) {
    if (files.length === 0) return;
    const newEntries: AttachmentEntry[] = [];
    for (const file of files) {
      const entry: AttachmentEntry = {
        id: generateId(), name: file.name,
        type: file.type || 'application/octet-stream', size: file.size,
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        createdAt: new Date().toISOString(),
      };
      if (file.type.startsWith('image/') && file.size < 800 * 1024) {
        try { entry.base64 = await fileToBase64(file); } catch { /* objectURL fallback */ }
      }
      newEntries.push(entry);
    }
    setForm((prev) => { setIsDirty(true); return { ...prev, attachments: [...prev.attachments, ...newEntries] }; });
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    processFiles(Array.from(e.target.files ?? []));
    e.target.value = '';
  }

  function handleDrop(e: React.DragEvent) { e.preventDefault(); processFiles(Array.from(e.dataTransfer.files)); }

  function handlePaste(e: React.ClipboardEvent) {
    const imageFiles = Array.from(e.clipboardData.items)
      .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter((f): f is File => f !== null)
      .map((f) => new File([f], `screenshot-${Date.now()}.${f.type.split('/')[1] ?? 'png'}`, { type: f.type }));
    if (imageFiles.length > 0) { e.preventDefault(); processFiles(imageFiles); }
  }

  function removeAttachment(id: string) {
    const att = form.attachments.find((a) => a.id === id);
    if (att?.previewUrl && !att.base64) URL.revokeObjectURL(att.previewUrl);
    upd('attachments', form.attachments.filter((a) => a.id !== id));
  }

  // ── submit ────────────────────────────────────────────────────────────────

  function handleSubmit() {
    setHasAttemptedSubmit(true);
    if (!validate()) return;
    setSaving(true);

    const persistedAttachments: StudentAttachment[] = form.attachments.map((a) => ({
      id: a.id, name: a.name, type: a.type, size: a.size, base64: a.base64, createdAt: a.createdAt,
    }));

    // Deduplicate friendIds and filter out self (safety guard)
    const cleanFriendIds = [...new Set(form.friendIds)].filter((id) => id !== studentId);

    const payload = {
      fullName: form.fullName.trim(),
      age: Number(form.age),
      group: form.group,
      level: form.level,
      startedAt: form.startedAt,
      isActive: true,
      address: form.address.trim(),
      contacts: mode === 'edit' ? existingContactsRef.current : [],
      friendContacts: [],
      notes: form.notes.trim(),
      attachments: persistedAttachments,
      avatar: form.avatar,
      parentId: form.parentId || undefined,
      studentPhone: form.studentPhone.trim() || undefined,
      studentWhatsapp: form.studentWhatsapp.trim() || undefined,
      studentTelegram: form.studentTelegram.trim() || undefined,
      studentInstagram: form.studentInstagram.trim() || undefined,
      friendIds: cleanFriendIds,
    };

    if (mode === 'edit' && studentId) {
      updateStudent(studentId, payload);
      setIsDirty(false);
      router.push(`/students/${studentId}`);
    } else {
      const id = addStudent(payload);
      setIsDirty(false);
      router.push(`/students/${id}`);
    }
  }

  function handleCancel() {
    if (isDirty && !confirm('Есть несохранённые изменения. Покинуть страницу?')) return;
    router.push('/students');
  }

  const hasNonPersistedFiles = form.attachments.some((a) => !a.base64 && !a.type.startsWith('image/'));

  // ── render ────────────────────────────────────────────────────────────────

  if (studentNotFound) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <AlertTriangle className="size-8 text-red-400" />
        <p className="text-lg font-semibold text-slate-700">Ученик не найден</p>
        <Button variant="outline" onClick={() => router.push('/students')}>
          <ArrowLeft className="size-4" />Назад к списку
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">

      {/* ── sticky page header ─────────────────────────────────────────────── */}
      <div className="sticky top-14 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-200 -mx-6 xl:-mx-8 px-6 xl:px-8 py-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={handleCancel}
            className="size-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors shrink-0">
            <ArrowLeft className="size-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {mode === 'edit' ? 'Редактировать ученика' : 'Новый ученик'}
            </h1>
            <p className="text-sm text-slate-500">
              {mode === 'edit' ? 'Измените данные и сохраните' : 'Заполните информацию об ученике'}
            </p>
          </div>
        </div>
      </div>

      {/* ── validation banner ────────────────────────────────────────────────── */}
      {hasAttemptedSubmit && Object.keys(errors).length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
          <AlertTriangle className="size-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">
            Заполните обязательные поля:{' '}
            <span className="font-medium">
              {[
                errors.fullName && 'Полное имя',
                errors.age && 'Возраст',
                errors.parentId && 'Родитель',
              ].filter(Boolean).join(', ')}
            </span>
          </p>
        </div>
      )}

      {/* ── section 1: basic info ─────────────────────────────────────────── */}
      <Section icon={<User className="size-4" />} title="Основная информация"
        description="Имя, возраст, группа и уровень обучения">
        <div className="flex flex-col gap-4">
          <AvatarUploader
            avatar={form.avatar}
            initials={form.fullName.trim().slice(0, 2).toUpperCase()}
            onFile={handleAvatarFile}
            onRemove={() => upd('avatar', undefined)}
          />
          <Input ref={fullNameRef} label="Полное имя *" placeholder="Айбек Маматов"
            value={form.fullName}
            onChange={(e) => { upd('fullName', e.target.value); clearError('fullName'); }}
            error={errors.fullName} />
          <div className="grid grid-cols-3 gap-4">
            <Input ref={ageRef} label="Возраст *" type="number" min={1} max={100} placeholder="12"
              value={form.age}
              onChange={(e) => { upd('age', e.target.value); clearError('age'); }}
              error={errors.age} />
            <Select label="Группа" options={GROUP_OPTIONS} value={form.group}
              onChange={(e) => upd('group', e.target.value)} />
            <Select label="Уровень" options={LEVEL_OPTIONS} value={form.level}
              onChange={(e) => upd('level', e.target.value as StudentLevel)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Дата начала обучения" type="date" value={form.startedAt}
              onChange={(e) => upd('startedAt', e.target.value)} />
          </div>
        </div>
      </Section>

      {/* ── section 2: parent ────────────────────────────────────────────── */}
      <Section icon={<UserRound className="size-4" />} title="Родитель *"
        description="Основной контакт семьи — источник данных о родителе">
        <div className="flex flex-col gap-3">
          <ParentCombobox
            parentId={form.parentId}
            onChange={(id) => { upd('parentId', id); clearError('parentId'); }}
            parents={parents}
            error={errors.parentId}
            inputRef={parentComboboxRef}
          />
          {parents.length === 0 && (
            <p className="text-xs text-slate-400">
              В системе пока нет родителей.{' '}
              <a href="/parents/new" className="text-emerald-600 hover:underline font-medium">Создать родителя</a>
            </p>
          )}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-slate-400">Нет нужного родителя?</span>
            <a href="/parents/new" target="_blank" rel="noopener noreferrer"
              className="text-xs text-emerald-600 hover:underline font-medium">
              + Создать родителя
            </a>
          </div>
        </div>
      </Section>

      {/* ── section 3: student contacts ──────────────────────────────────── */}
      <Section icon={<Phone className="size-4" />} title="Контакты ученика"
        description="Личные контакты ученика, если он сам пользуется телефоном или мессенджерами">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Телефон" placeholder="+996 550 000 000" value={form.studentPhone}
            onChange={(e) => upd('studentPhone', e.target.value)} />
          <Input label="WhatsApp" placeholder="+996550000000" value={form.studentWhatsapp}
            onChange={(e) => upd('studentWhatsapp', e.target.value)} />
          <Input label="Telegram" placeholder="@username" value={form.studentTelegram}
            onChange={(e) => upd('studentTelegram', e.target.value)} />
          <Input label="Instagram" placeholder="@username" value={form.studentInstagram}
            onChange={(e) => upd('studentInstagram', e.target.value)} />
        </div>
      </Section>

      {/* ── section 4: address ───────────────────────────────────────────── */}
      <Section icon={<MapPin className="size-4" />} title="Адрес"
        description="Место проживания ученика">
        <Input label="Адрес" placeholder="г. Бишкек, ул. Токтогула, д. 14, кв. 5"
          value={form.address}
          onChange={(e) => upd('address', e.target.value)} />
      </Section>

      {/* ── section 5: friends ───────────────────────────────────────────── */}
      <Section icon={<Users className="size-4" />} title="Друзья и связи"
        description="Выберите учеников, через которых можно связаться или которые хорошо знают этого ученика">
        <StudentFriendsSelector
          value={form.friendIds}
          onChange={(ids) => upd('friendIds', ids)}
          allStudents={otherStudents}
          excludeStudentId={studentId}
        />
      </Section>

      {/* ── section 6: notes + attachments ──────────────────────────────── */}
      <Section icon={<FileText className="size-4" />} title="Заметки и вложения"
        description="Пишите важную информацию, прикладывайте скриншоты, фото и документы">
        <div ref={attachmentZoneRef} onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}
          className="flex flex-col gap-3">
          <div className="rounded-xl border border-slate-200 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-transparent overflow-hidden transition-all">
            <textarea
              placeholder="Прилежный ученик, хорошо запоминает. Нужна помощь с произношением..."
              value={form.notes}
              onChange={(e) => upd('notes', e.target.value)}
              onPaste={handlePaste}
              rows={4}
              className="w-full px-4 pt-3 pb-2 text-sm text-slate-900 placeholder:text-slate-400 bg-transparent resize-none outline-none block"
            />
            <div className="flex items-center gap-1 px-3 py-2 border-t border-slate-100 bg-slate-50/60">
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors">
                <Paperclip className="size-3.5" />Прикрепить файл
              </button>
              <span className="text-xs text-slate-400 pl-2">
                или{' '}
                <kbd className="px-1 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-mono text-slate-500">Ctrl+V</kbd>{' '}
                для скриншота
              </span>
              <input ref={fileInputRef} type="file" multiple className="sr-only" onChange={handleFileInput} />
            </div>
          </div>
          {hasNonPersistedFiles && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
              <AlertTriangle className="size-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700">Файлы (не изображения) не сохраняются в браузере — только метаданные.</p>
            </div>
          )}
          {form.attachments.length > 0 && (
            <div className="flex flex-col gap-2">
              {form.attachments.map((att) => (
                <AttachmentItem key={att.id} attachment={att} onRemove={() => removeAttachment(att.id)} />
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* ── bottom action bar ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between py-4 border-t border-slate-200 mt-2">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          {isDirty && (<><div className="size-1.5 rounded-full bg-amber-400" />Есть несохранённые изменения</>)}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleCancel}>Отмена</Button>
          <Button onClick={handleSubmit} loading={saving}>
            <Save className="size-4" />
            {mode === 'edit' ? 'Сохранить изменения' : 'Сохранить ученика'}
          </Button>
        </div>
      </div>
    </div>
  );
}
