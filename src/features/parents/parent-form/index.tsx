'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, User, Phone, MapPin, FileText, AlertTriangle } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Select } from '@/shared/ui/select';
import { Card } from '@/shared/ui/card';
import { useAppStore } from '@/store/app-store';
import type { ParentRelation, PreferredContact } from '@/entities/parent/model/types';
import { RELATION_LABELS, PREFERRED_CONTACT_LABELS } from '@/entities/parent/model/types';

interface FormState {
  fullName: string;
  whatsapp: string;
  phone: string;
  telegram: string;
  instagram: string;
  address: string;
  relation: ParentRelation | '';
  preferredContact: PreferredContact | '';
  description: string;
  notes: string;
}

const INITIAL: FormState = {
  fullName: '',
  whatsapp: '',
  phone: '',
  telegram: '',
  instagram: '',
  address: '',
  relation: '',
  preferredContact: '',
  description: '',
  notes: '',
};

interface Errors {
  fullName?: string;
  whatsapp?: string;
}

const RELATION_OPTIONS = [
  { value: '', label: 'Не указано' },
  ...Object.entries(RELATION_LABELS).map(([value, label]) => ({ value, label })),
];

const PREFERRED_CONTACT_OPTIONS = [
  { value: '', label: 'Не указано' },
  ...Object.entries(PREFERRED_CONTACT_LABELS).map(([value, label]) => ({ value, label })),
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
  parentId?: string;
}

export function ParentForm({ mode = 'create', parentId }: Props) {
  const router = useRouter();
  const parents = useAppStore((s) => s.parents);
  const createParent = useAppStore((s) => s.createParent);
  const updateParent = useAppStore((s) => s.updateParent);

  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Errors>({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const hasLoaded = useRef(false);
  const fullNameRef = useRef<HTMLInputElement>(null);
  const whatsappRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode !== 'edit' || !parentId || hasLoaded.current) return;
    const parent = parents.find((p) => p.id === parentId);
    if (!parent) { setNotFound(true); return; }
    hasLoaded.current = true;
    setForm({
      fullName: parent.fullName,
      whatsapp: parent.whatsapp,
      phone: parent.phone ?? '',
      telegram: parent.telegram ?? '',
      instagram: parent.instagram ?? '',
      address: parent.address ?? '',
      relation: parent.relation ?? '',
      preferredContact: parent.preferredContact ?? '',
      description: parent.description ?? '',
      notes: parent.notes ?? '',
    });
    setIsDirty(false);
  }, [mode, parentId, parents]);

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

  function validate(): boolean {
    const errs: Errors = {};
    if (!form.fullName.trim()) errs.fullName = 'Введите имя родителя';
    if (!form.whatsapp.trim()) errs.whatsapp = 'Введите WhatsApp номер';
    setErrors(errs);
    if (errs.fullName) fullNameRef.current?.focus();
    else if (errs.whatsapp) whatsappRef.current?.focus();
    return Object.keys(errs).length === 0;
  }

  function clearError(field: keyof Errors) {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function handleSubmit() {
    setHasAttemptedSubmit(true);
    if (!validate()) return;
    setSaving(true);

    const payload = {
      fullName: form.fullName.trim(),
      whatsapp: form.whatsapp.trim(),
      phone: form.phone.trim() || undefined,
      telegram: form.telegram.trim() || undefined,
      instagram: form.instagram.trim() || undefined,
      address: form.address.trim() || undefined,
      relation: (form.relation || undefined) as ParentRelation | undefined,
      preferredContact: (form.preferredContact || undefined) as PreferredContact | undefined,
      description: form.description.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };

    if (mode === 'edit' && parentId) {
      updateParent(parentId, payload);
      setIsDirty(false);
      router.push(`/parents/${parentId}`);
    } else {
      const id = createParent(payload);
      setIsDirty(false);
      router.push(`/parents/${id}`);
    }
  }

  function handleCancel() {
    if (isDirty && !confirm('Есть несохранённые изменения. Покинуть страницу?')) return;
    if (mode === 'edit' && parentId) router.push(`/parents/${parentId}`);
    else router.push('/parents');
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <AlertTriangle className="size-8 text-red-400" />
        <p className="text-lg font-semibold text-slate-700">Родитель не найден</p>
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
              {mode === 'edit' ? 'Редактировать родителя' : 'Новый родитель'}
            </h1>
            <p className="text-sm text-slate-500">
              {mode === 'edit' ? 'Измените данные и сохраните' : 'Заполните информацию о родителе'}
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
              {[errors.fullName && 'Полное имя', errors.whatsapp && 'WhatsApp']
                .filter(Boolean).join(', ')}
            </span>
          </p>
        </div>
      )}

      {/* Section 1: Basic info */}
      <Section icon={<User className="size-4" />} title="Основная информация" description="Имя, роль и предпочтительный способ связи">
        <div className="flex flex-col gap-4">
          <Input
            ref={fullNameRef}
            label="Полное имя *"
            placeholder="Маматова Жылдыз Абдыбековна"
            value={form.fullName}
            onChange={(e) => { upd('fullName', e.target.value); clearError('fullName'); }}
            error={errors.fullName}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Кем приходится"
              options={RELATION_OPTIONS}
              value={form.relation}
              onChange={(e) => upd('relation', e.target.value as ParentRelation | '')}
            />
            <Select
              label="Предпочтительный контакт"
              options={PREFERRED_CONTACT_OPTIONS}
              value={form.preferredContact}
              onChange={(e) => upd('preferredContact', e.target.value as PreferredContact | '')}
            />
          </div>
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

      {/* Section 3: Address */}
      <Section icon={<MapPin className="size-4" />} title="Адрес" description="Место проживания семьи">
        <Input
          label="Адрес"
          placeholder="г. Бишкек, ул. Токтогула, д. 14"
          value={form.address}
          onChange={(e) => upd('address', e.target.value)}
        />
      </Section>

      {/* Section 4: Notes */}
      <Section icon={<FileText className="size-4" />} title="Заметки" description="Описание и дополнительная информация">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Описание</label>
            <textarea
              placeholder="Активно интересуется успехами ребёнка, всегда на связи..."
              value={form.description}
              onChange={(e) => upd('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 resize-none outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Внутренние заметки</label>
            <textarea
              placeholder="Заметки только для внутреннего пользования..."
              value={form.notes}
              onChange={(e) => upd('notes', e.target.value)}
              rows={2}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 resize-none outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>
        </div>
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
            {mode === 'edit' ? 'Сохранить изменения' : 'Сохранить родителя'}
          </Button>
        </div>
      </div>
    </div>
  );
}
