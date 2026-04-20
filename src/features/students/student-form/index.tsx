'use client';

import { useState, useEffect, useRef, useCallback, useId } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Phone,
  User,
  Users,
  MapPin,
  FileText,
  Paperclip,
  File as FileIcon,
  X,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Select } from '@/shared/ui/select';
import { Card } from '@/shared/ui/card';
import { useAppStore } from '@/store/app-store';
import { generateId } from '@/shared/lib/ids';
import type { StudentLevel, StudentContact, FriendContact, StudentAttachment } from '@/entities/student/model/types';
import { CONTACT_RELATION_OPTIONS } from '@/entities/student/model/types';

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
  contacts: (StudentContact & { _key: string })[];
  friendContacts: (FriendContact & { _key: string })[];
  notes: string;
  attachments: AttachmentEntry[];
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

function emptyContact(): StudentContact & { _key: string } {
  return {
    _key: generateId(),
    id: generateId(),
    relation: 'Мама',
    phone: '',
    whatsapp: '',
    telegram: '',
    instagram: '',
    notes: '',
  };
}

function emptyFriend(): FriendContact & { _key: string } {
  return {
    _key: generateId(),
    id: generateId(),
    fullName: '',
    phone: '',
    whatsapp: '',
    telegram: '',
    instagram: '',
    relationNote: '',
  };
}

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

const INITIAL_STATE: FormState = {
  fullName: '',
  age: '',
  group: 'A',
  level: 'beginner',
  startedAt: new Date().toISOString().slice(0, 10),
  address: '',
  contacts: [emptyContact()],
  friendContacts: [],
  notes: '',
  attachments: [],
};

// ─── section wrapper ─────────────────────────────────────────────────────────

function Section({
  icon,
  title,
  description,
  children,
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

// ─── relation combobox ────────────────────────────────────────────────────────
// Native datalist: user can pick from suggestions OR type anything custom

function RelationCombobox({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  // useId() produces a stable id that matches between SSR and hydration
  const uid = useId();
  const inputId = `rel${uid}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
        Кем приходится
      </label>
      <input
        id={inputId}
        list={`${inputId}-list`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Мама, Папа, Сам ученик..."
        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
      />
      <datalist id={`${inputId}-list`}>
        {CONTACT_RELATION_OPTIONS.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>
    </div>
  );
}

// ─── contact block ────────────────────────────────────────────────────────────

function ContactBlock({
  contact,
  onChange,
  onRemove,
  canRemove,
}: {
  contact: StudentContact & { _key: string };
  onChange: (updated: StudentContact & { _key: string }) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const upd = (field: keyof StudentContact, val: string) =>
    onChange({ ...contact, [field]: val });

  return (
    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 relative">
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-3 right-3 size-6 rounded-md flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <X className="size-3.5" />
        </button>
      )}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <RelationCombobox
          value={contact.relation}
          onChange={(v) => upd('relation', v)}
        />
        <Input
          label="Телефон"
          placeholder="+996 700 000 000"
          value={contact.phone}
          onChange={(e) => upd('phone', e.target.value)}
        />
        <Input
          label="WhatsApp"
          placeholder="+996700000000"
          value={contact.whatsapp ?? ''}
          onChange={(e) => upd('whatsapp', e.target.value)}
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Input
          label="Telegram"
          placeholder="@username"
          value={contact.telegram ?? ''}
          onChange={(e) => upd('telegram', e.target.value)}
        />
        <Input
          label="Instagram"
          placeholder="@username"
          value={contact.instagram ?? ''}
          onChange={(e) => upd('instagram', e.target.value)}
        />
        <Input
          label="Заметка"
          placeholder="Рабочий, звонить после 18:00..."
          value={contact.notes ?? ''}
          onChange={(e) => upd('notes', e.target.value)}
        />
      </div>
    </div>
  );
}

// ─── friend block ─────────────────────────────────────────────────────────────

function FriendBlock({
  friend,
  onChange,
  onRemove,
}: {
  friend: FriendContact & { _key: string };
  onChange: (updated: FriendContact & { _key: string }) => void;
  onRemove: () => void;
}) {
  const upd = (field: keyof FriendContact, val: string) =>
    onChange({ ...friend, [field]: val });

  return (
    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 relative">
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-3 right-3 size-6 rounded-md flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
      >
        <X className="size-3.5" />
      </button>
      <div className="grid grid-cols-3 gap-3 mb-3">
        <Input
          label="Имя"
          placeholder="Асел Жумаева"
          value={friend.fullName}
          onChange={(e) => upd('fullName', e.target.value)}
        />
        <Input
          label="Телефон"
          placeholder="+996 700 000 000"
          value={friend.phone}
          onChange={(e) => upd('phone', e.target.value)}
        />
        <Input
          label="Связь с учеником"
          placeholder="друг из класса, сосед..."
          value={friend.relationNote ?? ''}
          onChange={(e) => upd('relationNote', e.target.value)}
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Input
          label="WhatsApp"
          placeholder="+996700000000"
          value={friend.whatsapp ?? ''}
          onChange={(e) => upd('whatsapp', e.target.value)}
        />
        <Input
          label="Telegram"
          placeholder="@username"
          value={friend.telegram ?? ''}
          onChange={(e) => upd('telegram', e.target.value)}
        />
        <Input
          label="Instagram"
          placeholder="@username"
          value={friend.instagram ?? ''}
          onChange={(e) => upd('instagram', e.target.value)}
        />
      </div>
    </div>
  );
}

// ─── attachment item ──────────────────────────────────────────────────────────

function AttachmentItem({
  attachment,
  onRemove,
}: {
  attachment: AttachmentEntry;
  onRemove: () => void;
}) {
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
      <button
        type="button"
        onClick={onRemove}
        className="size-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

// ─── main form ────────────────────────────────────────────────────────────────

interface Errors {
  fullName?: string;
  age?: string;
  startedAt?: string;
}

export function StudentForm() {
  const router = useRouter();
  const addStudent = useAppStore((s) => s.addStudent);
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<Errors>({});
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentZoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
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
    if (!form.fullName.trim()) errs.fullName = 'Введите полное имя';
    if (!form.age || isNaN(Number(form.age)) || Number(form.age) < 1 || Number(form.age) > 100)
      errs.age = 'Укажите корректный возраст (1–100)';
    if (!form.startedAt) errs.startedAt = 'Укажите дату начала обучения';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── contacts ──────────────────────────────────────────────────────────────

  function updateContact(key: string, updated: StudentContact & { _key: string }) {
    upd('contacts', form.contacts.map((c) => (c._key === key ? updated : c)));
  }
  function removeContact(key: string) {
    upd('contacts', form.contacts.filter((c) => c._key !== key));
  }
  function addContact() {
    upd('contacts', [...form.contacts, emptyContact()]);
  }

  // ── friend contacts ───────────────────────────────────────────────────────

  function updateFriend(key: string, updated: FriendContact & { _key: string }) {
    upd('friendContacts', form.friendContacts.map((f) => (f._key === key ? updated : f)));
  }
  function removeFriend(key: string) {
    upd('friendContacts', form.friendContacts.filter((f) => f._key !== key));
  }
  function addFriend() {
    upd('friendContacts', [...form.friendContacts, emptyFriend()]);
  }

  // ── attachments ───────────────────────────────────────────────────────────

  async function processFiles(files: File[]) {
    if (files.length === 0) return;
    const newEntries: AttachmentEntry[] = [];
    for (const file of files) {
      const entry: AttachmentEntry = {
        id: generateId(),
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        createdAt: new Date().toISOString(),
      };
      if (file.type.startsWith('image/') && file.size < 800 * 1024) {
        try { entry.base64 = await fileToBase64(file); } catch { /* objectURL fallback */ }
      }
      newEntries.push(entry);
    }
    setForm((prev) => {
      setIsDirty(true);
      return { ...prev, attachments: [...prev.attachments, ...newEntries] };
    });
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    processFiles(Array.from(e.target.files ?? []));
    // Reset input so same file can be re-selected
    e.target.value = '';
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    processFiles(Array.from(e.dataTransfer.files));
  }

  // Ctrl+V paste handler — picks image items from clipboard
  function handlePaste(e: React.ClipboardEvent) {
    const imageFiles = Array.from(e.clipboardData.items)
      .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter((f): f is File => f !== null)
      .map((f) => {
        // Give pasted screenshots a meaningful name with timestamp
        const ext = f.type.split('/')[1] ?? 'png';
        return new File([f], `screenshot-${Date.now()}.${ext}`, { type: f.type });
      });
    if (imageFiles.length > 0) {
      e.preventDefault();
      processFiles(imageFiles);
    }
  }

  function removeAttachment(id: string) {
    const att = form.attachments.find((a) => a.id === id);
    if (att?.previewUrl && !att.base64) URL.revokeObjectURL(att.previewUrl);
    upd('attachments', form.attachments.filter((a) => a.id !== id));
  }

  // ── submit ────────────────────────────────────────────────────────────────

  function handleSubmit() {
    if (!validate()) return;
    setSaving(true);

    const persistedAttachments: StudentAttachment[] = form.attachments.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      size: a.size,
      base64: a.base64,
      createdAt: a.createdAt,
    }));

    const id = addStudent({
      fullName: form.fullName.trim(),
      age: Number(form.age),
      group: form.group,
      level: form.level,
      startedAt: form.startedAt,
      isActive: true,
      address: form.address.trim(),
      contacts: form.contacts.map(({ _key, ...c }) => c),
      friendContacts: form.friendContacts.map(({ _key, ...f }) => f),
      notes: form.notes.trim(),
      attachments: persistedAttachments,
    });

    setIsDirty(false);
    router.push(`/students/${id}`);
  }

  function handleCancel() {
    if (isDirty && !confirm('Есть несохранённые изменения. Покинуть страницу?')) return;
    router.push('/students');
  }

  const hasNonPersistedFiles = form.attachments.some((a) => !a.base64 && !a.type.startsWith('image/'));

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">

      {/* ── sticky page header (no action buttons) ─────────────────────── */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-200 -mx-6 xl:-mx-8 px-6 xl:px-8 -mt-6 py-4 mb-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="size-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors shrink-0"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Новый ученик</h1>
            <p className="text-sm text-slate-500">Заполните информацию об ученике</p>
          </div>
        </div>
      </div>

      {/* ── section 1: basic info ─────────────────────────────────────────── */}
      <Section
        icon={<User className="size-4" />}
        title="Основная информация"
        description="Имя, возраст, группа и уровень обучения"
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Полное имя *"
            placeholder="Айбек Маматов"
            value={form.fullName}
            onChange={(e) => upd('fullName', e.target.value)}
            error={errors.fullName}
          />
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Возраст *"
              type="number"
              min={1}
              max={100}
              placeholder="12"
              value={form.age}
              onChange={(e) => upd('age', e.target.value)}
              error={errors.age}
            />
            <Select
              label="Группа"
              options={GROUP_OPTIONS}
              value={form.group}
              onChange={(e) => upd('group', e.target.value)}
            />
            <Select
              label="Уровень"
              options={LEVEL_OPTIONS}
              value={form.level}
              onChange={(e) => upd('level', e.target.value as StudentLevel)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Дата начала обучения *"
              type="date"
              value={form.startedAt}
              onChange={(e) => upd('startedAt', e.target.value)}
              error={errors.startedAt}
            />
          </div>
        </div>
      </Section>

      {/* ── section 2: address ───────────────────────────────────────────── */}
      <Section
        icon={<MapPin className="size-4" />}
        title="Адрес"
        description="Место проживания ученика"
      >
        <Input
          label="Адрес"
          placeholder="г. Бишкек, ул. Токтогула, д. 14, кв. 5"
          value={form.address}
          onChange={(e) => upd('address', e.target.value)}
        />
      </Section>

      {/* ── section 3: contacts ──────────────────────────────────────────── */}
      <Section
        icon={<Phone className="size-4" />}
        title="Контакты ученика и семьи"
        description="Телефоны родителей, самого ученика, опекунов и других"
      >
        <div className="flex flex-col gap-3">
          {form.contacts.map((c) => (
            <ContactBlock
              key={c._key}
              contact={c}
              onChange={(updated) => updateContact(c._key, updated)}
              onRemove={() => removeContact(c._key)}
              canRemove={form.contacts.length > 1}
            />
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addContact} className="self-start">
            <Plus className="size-3.5" />
            Добавить контакт
          </Button>
        </div>
      </Section>

      {/* ── section 4: friend contacts ───────────────────────────────────── */}
      <Section
        icon={<Users className="size-4" />}
        title="Контакты друзей"
        description="Через кого можно связаться с учеником, если он не отвечает"
      >
        <div className="flex flex-col gap-3">
          {form.friendContacts.length === 0 ? (
            <p className="text-sm text-slate-400 py-2">
              Пока нет контактов друзей.
            </p>
          ) : (
            form.friendContacts.map((f) => (
              <FriendBlock
                key={f._key}
                friend={f}
                onChange={(updated) => updateFriend(f._key, updated)}
                onRemove={() => removeFriend(f._key)}
              />
            ))
          )}
          <Button type="button" variant="outline" size="sm" onClick={addFriend} className="self-start">
            <Plus className="size-3.5" />
            Добавить друга
          </Button>
        </div>
      </Section>

      {/* ── section 5: notes + attachments ──────────────────────────────── */}
      <Section
        icon={<FileText className="size-4" />}
        title="Заметки и вложения"
        description="Пишите важную информацию, прикладывайте скриншоты, фото и документы"
      >
        <div
          ref={attachmentZoneRef}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="flex flex-col gap-4"
        >
          {/* textarea — onPaste intercepts images, lets normal text paste through */}
          <Textarea
            placeholder="Прилежный ученик, хорошо запоминает. Нужна помощь с произношением..."
            value={form.notes}
            onChange={(e) => upd('notes', e.target.value)}
            onPaste={handlePaste}
            className="min-h-[120px]"
          />

          {/* action bar */}
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="size-3.5" />
              Выбрать файлы
            </Button>
            <span className="text-xs text-slate-400">
              или вставьте скриншот через{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-mono text-slate-600">
                Ctrl+V
              </kbd>{' '}
              прямо в текстовую область
            </span>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="sr-only"
              onChange={handleFileInput}
            />
          </div>

          {hasNonPersistedFiles && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
              <AlertTriangle className="size-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700">
                Файлы (не изображения) не сохраняются в браузере — только метаданные.
                Для полноценного хранения потребуется backend.
              </p>
            </div>
          )}

          {form.attachments.length > 0 && (
            <div className="flex flex-col gap-2">
              {form.attachments.map((att) => (
                <AttachmentItem
                  key={att.id}
                  attachment={att}
                  onRemove={() => removeAttachment(att.id)}
                />
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* ── bottom action bar ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between py-4 border-t border-slate-200 mt-2">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          {isDirty && (
            <>
              <div className="size-1.5 rounded-full bg-amber-400" />
              Есть несохранённые изменения
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleCancel}>Отмена</Button>
          <Button onClick={handleSubmit} loading={saving}>
            <Save className="size-4" />
            Сохранить ученика
          </Button>
        </div>
      </div>
    </div>
  );
}
