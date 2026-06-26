'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, User, Phone, FileText, AlertTriangle, UserRound, Plus } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Select } from '@/shared/ui/select';
import { Card } from '@/shared/ui/card';
import { Modal } from '@/shared/ui/modal';
import { useAppStore, useAllFamilyContacts, useFamilies } from '@/store/app-store';
import {
  PREFERRED_CONTACT_METHOD_LABELS,
  type PreferredContactMethod,
} from '@/entities/family-contact/model/types';
import { normalizePhone, getContactInitials } from '@/entities/family-contact/model/helpers';

interface FormState {
  fullName: string;
  whatsapp: string;
  phone: string;
  telegram: string;
  instagram: string;
  preferredContact: PreferredContactMethod | '';
  notes: string;
  familyId: string;
}

const INITIAL: FormState = {
  fullName: '',
  whatsapp: '',
  phone: '',
  telegram: '',
  instagram: '',
  preferredContact: '',
  notes: '',
  familyId: '',
};

interface Errors {
  fullName?: string;
  whatsapp?: string;
  familyId?: string;
}

const PREFERRED_CONTACT_OPTIONS = [
  { value: '', label: 'Не указано' },
  ...Object.entries(PREFERRED_CONTACT_METHOD_LABELS).map(([value, label]) => ({ value, label })),
];

function Section({
  icon, title, description, children,
}: { icon: React.ReactNode; title: string; description?: string; children: React.ReactNode }) {
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

interface Props {
  mode?: 'create' | 'edit';
  /** ID of FamilyContact (URL still uses `parentId` slug) */
  contactId?: string;
  /** Preset family for new contacts (e.g. from family detail page) */
  initialFamilyId?: string;
}

export function ParentForm({ mode = 'create', contactId, initialFamilyId }: Props) {
  const router = useRouter();
  const contacts = useAllFamilyContacts();
  const families = useFamilies();
  const createFamilyContact = useAppStore((s) => s.createFamilyContact);
  const updateFamilyContact = useAppStore((s) => s.updateFamilyContact);

  const createFamily = useAppStore((s) => s.createFamily);

  const [form, setForm] = useState<FormState>({ ...INITIAL, familyId: initialFamilyId ?? '' });
  const [errors, setErrors] = useState<Errors>({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [duplicateMatch, setDuplicateMatch] = useState<null | { id: string; fullName: string }>(null);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [showNewFamilyModal, setShowNewFamilyModal] = useState(false);
  const hasLoaded = useRef(false);
  const fullNameRef = useRef<HTMLInputElement>(null);
  const whatsappRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode !== 'edit' || !contactId || hasLoaded.current) return;
    const contact = contacts.find((c) => c.id === contactId);
    if (!contact) { setNotFound(true); return; }
    hasLoaded.current = true;
    setForm({
      fullName: contact.fullName,
      whatsapp: contact.whatsapp,
      phone: contact.phone ?? '',
      telegram: contact.telegram ?? '',
      instagram: contact.instagram ?? '',
      preferredContact: contact.preferredContact ?? '',
      notes: contact.notes ?? '',
      familyId: contact.familyId,
    });
    setIsDirty(false);
  }, [mode, contactId, contacts]);

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

  const familyOptions = useMemo(
    () => [
      { value: '', label: 'Выберите семью...' },
      ...families.map((f) => ({ value: f.id, label: f.name })),
    ],
    [families]
  );

  function validate(): boolean {
    const errs: Errors = {};
    if (!form.fullName.trim()) errs.fullName = 'Введите имя представителя';
    if (!form.whatsapp.trim()) errs.whatsapp = 'Введите WhatsApp номер';
    if (mode === 'create' && !form.familyId) errs.familyId = 'Выберите семью';
    setErrors(errs);
    if (errs.fullName) fullNameRef.current?.focus();
    else if (errs.whatsapp) whatsappRef.current?.focus();
    return Object.keys(errs).length === 0;
  }

  function clearError(field: keyof Errors) {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function findDuplicate(): { id: string; fullName: string } | null {
    const normWA = normalizePhone(form.whatsapp);
    if (!normWA) return null;
    const match = contacts.find(
      (c) => c.id !== contactId && normalizePhone(c.whatsapp) === normWA
    );
    return match ? { id: match.id, fullName: match.fullName } : null;
  }

  function doSubmit() {
    setSaving(true);
    const payload = {
      fullName: form.fullName.trim(),
      whatsapp: form.whatsapp.trim(),
      phone: form.phone.trim() || undefined,
      telegram: form.telegram.trim() || undefined,
      instagram: form.instagram.trim() || undefined,
      preferredContact: (form.preferredContact || undefined) as PreferredContactMethod | undefined,
      notes: form.notes.trim() || undefined,
    };

    if (mode === 'edit' && contactId) {
      updateFamilyContact(contactId, payload);
      setIsDirty(false);
      router.push(`/parents/${contactId}`);
    } else {
      const id = createFamilyContact({ familyId: form.familyId, ...payload });
      setIsDirty(false);
      router.push(`/parents/${id}`);
    }
  }

  function handleSubmit() {
    setHasAttemptedSubmit(true);
    if (!validate()) return;
    if (mode === 'create') {
      const dup = findDuplicate();
      if (dup) {
        setDuplicateMatch(dup);
        return;
      }
    }
    doSubmit();
  }

  function handleCancel() {
    if (isDirty && !confirm('Есть несохранённые изменения. Покинуть страницу?')) return;
    if (mode === 'edit' && contactId) router.push(`/parents/${contactId}`);
    else router.push('/parents');
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <AlertTriangle className="size-8 text-red-400" />
        <p className="text-lg font-semibold text-slate-700">Представитель не найден</p>
        <Button variant="outline" onClick={() => router.push('/parents')}>
          <ArrowLeft className="size-4" />Назад к списку
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* sticky header */}
      <div className="sticky top-14 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-200 -mx-6 xl:-mx-8 px-6 xl:px-8 py-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="size-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors shrink-0"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {mode === 'edit' ? 'Редактировать представителя' : 'Новый представитель'}
            </h1>
            <p className="text-sm text-slate-500">
              {mode === 'edit' ? 'Измените данные и сохраните' : 'Заполните информацию о представителе семьи'}
            </p>
          </div>
        </div>
      </div>

      {/* validation banner */}
      {hasAttemptedSubmit && Object.keys(errors).length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
          <AlertTriangle className="size-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">
            Заполните обязательные поля:{' '}
            <span className="font-medium">
              {[
                errors.fullName && 'Полное имя',
                errors.whatsapp && 'WhatsApp',
                errors.familyId && 'Семья',
              ].filter(Boolean).join(', ')}
            </span>
          </p>
        </div>
      )}

      {/* Family selector (only in create) */}
      {mode === 'create' && (
        <Section icon={<UserRound className="size-4" />} title="Семья" description="К какой семье относится этот представитель">
          <Select
            label="Семья *"
            options={familyOptions}
            value={form.familyId}
            onChange={(e) => { upd('familyId', e.target.value); clearError('familyId'); }}
          />
          {errors.familyId && <p className="text-xs text-red-500 mt-1">{errors.familyId}</p>}
          <button
            type="button"
            onClick={() => { setNewFamilyName(''); setShowNewFamilyModal(true); }}
            className="flex items-center gap-1 mt-2 text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            <Plus className="size-3.5" />Создать новую семью
          </button>
        </Section>
      )}

      {/* Section 1: Basic info */}
      <Section icon={<User className="size-4" />} title="Основная информация" description="Имя и предпочтительный способ связи">
        <div className="flex flex-col gap-4">
          <Input
            ref={fullNameRef}
            label="Полное имя *"
            placeholder="Маматова Жылдыз Абдыбековна"
            value={form.fullName}
            onChange={(e) => { upd('fullName', e.target.value); clearError('fullName'); }}
            error={errors.fullName}
          />
          <Select
            label="Предпочтительный контакт"
            options={PREFERRED_CONTACT_OPTIONS}
            value={form.preferredContact}
            onChange={(e) => upd('preferredContact', e.target.value as PreferredContactMethod | '')}
          />
        </div>
      </Section>

      {/* Section 2: Contacts */}
      <Section icon={<Phone className="size-4" />} title="Контакты" description="WhatsApp обязателен, остальное опционально">
        <div className="grid grid-cols-2 gap-4">
          <Input
            ref={whatsappRef}
            label="WhatsApp *"
            placeholder="+996700000000"
            value={form.whatsapp}
            onChange={(e) => { upd('whatsapp', e.target.value); clearError('whatsapp'); }}
            error={errors.whatsapp}
          />
          <Input
            label="Телефон"
            placeholder="+996 700 000 000"
            value={form.phone}
            onChange={(e) => upd('phone', e.target.value)}
          />
          <Input
            label="Telegram"
            placeholder="@username"
            value={form.telegram}
            onChange={(e) => upd('telegram', e.target.value)}
          />
          <Input
            label="Instagram"
            placeholder="@username"
            value={form.instagram}
            onChange={(e) => upd('instagram', e.target.value)}
          />
        </div>
      </Section>

      {/* Section 3: Notes */}
      <Section icon={<FileText className="size-4" />} title="Заметки" description="Дополнительная информация о представителе">
        <textarea
          placeholder="Например: всегда на связи, предпочитает WhatsApp, важные особенности общения..."
          value={form.notes}
          onChange={(e) => upd('notes', e.target.value)}
          rows={3}
          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 resize-none outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
        />
      </Section>

      {/* bottom bar */}
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
            {mode === 'edit' ? 'Сохранить изменения' : 'Сохранить'}
          </Button>
        </div>
      </div>

      {/* Quick-create family modal */}
      <Modal
        isOpen={showNewFamilyModal}
        onClose={() => setShowNewFamilyModal(false)}
        size="sm"
        title="Создать новую семью"
        description="Введите название семьи, чтобы быстро создать её и выбрать для этого представителя"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowNewFamilyModal(false)}>Отмена</Button>
            <Button
              onClick={() => {
                const name = newFamilyName.trim();
                if (!name) return;
                const id = createFamily({ name });
                upd('familyId', id);
                clearError('familyId');
                setShowNewFamilyModal(false);
              }}
              disabled={!newFamilyName.trim()}
            >
              <Plus className="size-4" />Создать и выбрать
            </Button>
          </>
        }
      >
        <Input
          label="Название семьи *"
          placeholder="Маматовы"
          value={newFamilyName}
          onChange={(e) => setNewFamilyName(e.target.value)}
          autoFocus
        />
      </Modal>

      {/* Duplicate detection modal */}
      <Modal
        isOpen={duplicateMatch !== null}
        onClose={() => setDuplicateMatch(null)}
        size="sm"
        title="Возможно, такой представитель уже существует"
        description={
          duplicateMatch
            ? `«${duplicateMatch.fullName}» уже зарегистрирован с этим номером WhatsApp.`
            : undefined
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setDuplicateMatch(null)}>Отмена</Button>
            <Button
              variant="outline"
              onClick={() => {
                const id = duplicateMatch?.id;
                setDuplicateMatch(null);
                if (id) router.push(`/parents/${id}`);
              }}
            >
              Использовать существующего
            </Button>
            <Button onClick={() => { setDuplicateMatch(null); doSubmit(); }}>
              Всё равно создать
            </Button>
          </>
        }
      >
        {duplicateMatch && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="size-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold shrink-0">
              {getContactInitials(duplicateMatch.fullName)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{duplicateMatch.fullName}</p>
              <p className="text-xs text-slate-500">WhatsApp: {form.whatsapp}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
