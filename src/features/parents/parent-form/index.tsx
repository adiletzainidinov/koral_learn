'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Save, User, Phone, FileText, AlertTriangle, UserRound,
  Plus, Users, Check, X,
} from 'lucide-react';
import { Breadcrumb } from '@/shared/ui/breadcrumb';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Select } from '@/shared/ui/select';
import { Card } from '@/shared/ui/card';
import { Modal } from '@/shared/ui/modal';
import {
  useAppStore, useAllFamilyContacts, useFamilies, useStudents,
  useContactStudentLinks, useAllStudentContactLinks,
} from '@/store/app-store';
import {
  PREFERRED_CONTACT_METHOD_LABELS,
  FAMILY_RELATION_LABELS,
  FAMILY_RELATION_OPTIONS,
  type FamilyRelationType,
  type PreferredContactMethod,
} from '@/entities/family-contact/model/types';
import { normalizePhone, getContactInitials } from '@/entities/family-contact/model/helpers';
import { cn } from '@/shared/lib/cn';

// ─── Types ───────────────────────────────────────────────────────────────────

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

interface StudentLinkConfig {
  selected: boolean;
  relation: FamilyRelationType | '';
  customRelation: string;
  isPrimaryContact: boolean;
  canDecideEducation: boolean;
  canReceiveNotifications: boolean;
  isEmergencyContact: boolean;
  isBillingContact: boolean;
  existingLinkId?: string;
}

function defaultLinkConfig(): StudentLinkConfig {
  return {
    selected: false,
    relation: '',
    customRelation: '',
    isPrimaryContact: false,
    canDecideEducation: false,
    canReceiveNotifications: true,
    isEmergencyContact: false,
    isBillingContact: false,
  };
}

interface FormErrors {
  fullName?: string;
  whatsapp?: string;
  familyId?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_PRESETS: { label: string; patch: Partial<StudentLinkConfig> }[] = [
  {
    label: 'Основной родитель',
    patch: {
      isPrimaryContact: true,
      canDecideEducation: true,
      canReceiveNotifications: true,
      isEmergencyContact: false,
      isBillingContact: false,
    },
  },
  {
    label: 'Плательщик',
    patch: { isBillingContact: true, canReceiveNotifications: true },
  },
  {
    label: 'Экстренный',
    patch: { isEmergencyContact: true, canReceiveNotifications: true },
  },
  {
    label: 'Уведомления',
    patch: {
      canReceiveNotifications: true,
      isPrimaryContact: false,
      canDecideEducation: false,
      isEmergencyContact: false,
      isBillingContact: false,
    },
  },
];

const PREFERRED_CONTACT_OPTIONS = [
  { value: '', label: 'Не указано' },
  ...Object.entries(PREFERRED_CONTACT_METHOD_LABELS).map(([value, label]) => ({ value, label })),
];

const RELATION_SELECT_OPTIONS = [
  { value: '', label: 'Выберите родство...' },
  ...FAMILY_RELATION_OPTIONS.map((r) => ({ value: r, label: FAMILY_RELATION_LABELS[r] })),
];

// ─── UI helpers ───────────────────────────────────────────────────────────────

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

function ToggleChip({
  checked, onChange, children, variant = 'default',
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
  variant?: 'primary' | 'billing' | 'emergency' | 'default';
}) {
  const activeClass = {
    primary: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    billing: 'bg-blue-100 text-blue-700 border-blue-300',
    emergency: 'bg-red-100 text-red-700 border-red-300',
    default: 'bg-slate-200 text-slate-700 border-slate-300',
  }[variant];

  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors',
        checked ? activeClass : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
      )}
    >
      {checked && <Check className="size-3" />}
      {children}
    </button>
  );
}

interface StudentLinkRowProps {
  studentId: string;
  studentName: string;
  studentGroup: string;
  config: StudentLinkConfig;
  onChange: (patch: Partial<StudentLinkConfig>) => void;
  error?: string;
  canDeselect?: boolean;
}

function StudentLinkRow({
  studentId, studentName, studentGroup, config, onChange, error, canDeselect = true,
}: StudentLinkRowProps) {
  const initials = studentName.slice(0, 2).toUpperCase();

  return (
    <div className={cn(
      'rounded-xl border transition-colors',
      config.selected ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 bg-white'
    )}>
      <div className="flex items-center gap-3 px-4 py-3">
        <input
          type="checkbox"
          id={`student-${studentId}`}
          checked={config.selected}
          disabled={!canDeselect && config.selected}
          onChange={(e) => onChange({ selected: e.target.checked })}
          className="size-4 rounded accent-emerald-600 cursor-pointer"
        />
        <div className="size-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold shrink-0">
          {initials}
        </div>
        <label htmlFor={`student-${studentId}`} className="flex-1 min-w-0 cursor-pointer">
          <p className="text-sm font-semibold text-slate-900">{studentName}</p>
          <p className="text-xs text-slate-400">Группа {studentGroup}</p>
        </label>
        {!canDeselect && config.selected && (
          <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md shrink-0">
            Единственный контакт
          </span>
        )}
      </div>

      {config.selected && (
        <div className="border-t border-emerald-100 px-4 pb-4 pt-3 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <Select
                label="Степень родства *"
                options={RELATION_SELECT_OPTIONS}
                value={config.relation}
                onChange={(e) => onChange({ relation: e.target.value as FamilyRelationType | '' })}
              />
              {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
            </div>
            {config.relation === 'other' && (
              <div className="flex-1">
                <Input
                  label="Уточнение *"
                  placeholder="Напр. «Дядя по маме»"
                  value={config.customRelation}
                  onChange={(e) => onChange({ customRelation: e.target.value })}
                />
              </div>
            )}
          </div>

          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Быстрые роли</p>
            <div className="flex flex-wrap gap-1.5">
              {ROLE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => onChange(preset.patch)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-200 bg-white text-slate-600 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Права</p>
            <div className="flex flex-wrap gap-1.5">
              <ToggleChip checked={config.isPrimaryContact} onChange={(v) => onChange({ isPrimaryContact: v })} variant="primary">
                Основной контакт
              </ToggleChip>
              <ToggleChip checked={config.canDecideEducation} onChange={(v) => onChange({ canDecideEducation: v })}>
                Решает за обучение
              </ToggleChip>
              <ToggleChip checked={config.canReceiveNotifications} onChange={(v) => onChange({ canReceiveNotifications: v })}>
                Уведомления
              </ToggleChip>
              <ToggleChip checked={config.isEmergencyContact} onChange={(v) => onChange({ isEmergencyContact: v })} variant="emergency">
                Экстренный
              </ToggleChip>
              <ToggleChip checked={config.isBillingContact} onChange={(v) => onChange({ isBillingContact: v })} variant="billing">
                Плательщик
              </ToggleChip>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  mode?: 'create' | 'edit';
  /** ID of FamilyContact (URL still uses `parentId` slug) */
  contactId?: string;
  /** Preset family for new contacts (e.g. from family detail page) */
  initialFamilyId?: string;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ParentForm({ mode = 'create', contactId, initialFamilyId }: Props) {
  const router = useRouter();
  const contacts = useAllFamilyContacts();
  const families = useFamilies();
  const allStudents = useStudents();
  const existingLinks = useContactStudentLinks(contactId ?? '');
  const allLinks = useAllStudentContactLinks();

  const createFamilyContactWithLinks = useAppStore((s) => s.createFamilyContactWithLinks);
  const updateFamilyContact = useAppStore((s) => s.updateFamilyContact);
  const linkContactToStudent = useAppStore((s) => s.linkContactToStudent);
  const updateStudentContactLink = useAppStore((s) => s.updateStudentContactLink);
  const unlinkContactFromStudent = useAppStore((s) => s.unlinkContactFromStudent);
  const setFamilyPrimaryContact = useAppStore((s) => s.setFamilyPrimaryContact);
  const setFamilyBillingContact = useAppStore((s) => s.setFamilyBillingContact);
  const createFamily = useAppStore((s) => s.createFamily);

  const [form, setForm] = useState<FormState>({ ...INITIAL, familyId: initialFamilyId ?? '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [linkErrors, setLinkErrors] = useState<Record<string, string>>({});
  const [linkConfigs, setLinkConfigs] = useState<Record<string, StudentLinkConfig>>({});
  const [setAsFamilyPrimary, setSetAsFamilyPrimary] = useState(false);
  const [setAsFamilyBilling, setSetAsFamilyBilling] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [duplicateMatch, setDuplicateMatch] = useState<null | { id: string; fullName: string }>(null);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [showNewFamilyModal, setShowNewFamilyModal] = useState(false);
  const [removeLinksConfirm, setRemoveLinksConfirm] = useState<{ linkId: string; studentName: string }[]>([]);

  const hasLoaded = useRef(false);
  const fullNameRef = useRef<HTMLInputElement>(null);
  const whatsappRef = useRef<HTMLInputElement>(null);

  // ── Load edit data ─────────────────────────────────────────────────────────

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
    const initConfigs: Record<string, StudentLinkConfig> = {};
    for (const link of existingLinks) {
      initConfigs[link.studentId] = {
        selected: true,
        relation: link.relation,
        customRelation: link.customRelation ?? '',
        isPrimaryContact: link.isPrimaryContact,
        canDecideEducation: link.canDecideEducation,
        canReceiveNotifications: link.canReceiveNotifications,
        isEmergencyContact: link.isEmergencyContact,
        isBillingContact: link.isBillingContact,
        existingLinkId: link.id,
      };
    }
    setLinkConfigs(initConfigs);
    setIsDirty(false);
  }, [mode, contactId, contacts, existingLinks]);

  // ── Reset link configs when family changes (create mode only) ─────────────

  useEffect(() => {
    if (mode !== 'create') return;
    setLinkConfigs({});
    setSetAsFamilyPrimary(false);
    setSetAsFamilyBilling(false);
  }, [form.familyId, mode]);

  // ── Dirty guard ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // ── Derived data ──────────────────────────────────────────────────────────

  const upd = useCallback(<K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  }, []);

  const selectedFamily = useMemo(
    () => families.find((f) => f.id === form.familyId) ?? null,
    [families, form.familyId]
  );

  const familyStudents = useMemo(
    () => selectedFamily
      ? allStudents.filter((s) => selectedFamily.studentIds.includes(s.id))
      : [],
    [selectedFamily, allStudents]
  );

  const familyOptions = useMemo(
    () => [
      { value: '', label: 'Выберите семью...' },
      ...families.map((f) => ({ value: f.id, label: f.name })),
    ],
    [families]
  );

  const selectedStudentIds = useMemo(
    () => Object.entries(linkConfigs).filter(([, cfg]) => cfg.selected).map(([id]) => id),
    [linkConfigs]
  );

  const studentLinkCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const link of allLinks) {
      counts[link.studentId] = (counts[link.studentId] ?? 0) + 1;
    }
    return counts;
  }, [allLinks]);

  const updateLink = useCallback((studentId: string, patch: Partial<StudentLinkConfig>) => {
    setLinkConfigs((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] ?? defaultLinkConfig()), ...patch },
    }));
    setIsDirty(true);
  }, []);

  // ── Validation ────────────────────────────────────────────────────────────

  function validate(): boolean {
    const errs: FormErrors = {};
    if (!form.fullName.trim()) errs.fullName = 'Введите имя представителя';
    if (!form.whatsapp.trim()) errs.whatsapp = 'Введите WhatsApp номер';
    if (mode === 'create' && !form.familyId) errs.familyId = 'Выберите семью';
    setErrors(errs);

    const lErrs: Record<string, string> = {};
    for (const [studentId, cfg] of Object.entries(linkConfigs)) {
      if (!cfg.selected) continue;
      if (!cfg.relation) {
        lErrs[studentId] = 'Укажите степень родства';
      } else if (cfg.relation === 'other' && !cfg.customRelation.trim()) {
        lErrs[studentId] = 'Уточните степень родства';
      }
    }
    setLinkErrors(lErrs);

    if (errs.fullName) fullNameRef.current?.focus();
    else if (errs.whatsapp) whatsappRef.current?.focus();
    return Object.keys(errs).length === 0 && Object.keys(lErrs).length === 0;
  }

  function clearError(field: keyof FormErrors) {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function findDuplicate() {
    const normWA = normalizePhone(form.whatsapp);
    if (!normWA) return null;
    const match = contacts.find((c) => c.id !== contactId && normalizePhone(c.whatsapp) === normWA);
    return match ? { id: match.id, fullName: match.fullName } : null;
  }

  // ── Submit helpers ────────────────────────────────────────────────────────

  function buildPayload() {
    return {
      fullName: form.fullName.trim(),
      whatsapp: form.whatsapp.trim(),
      phone: form.phone.trim() || undefined,
      telegram: form.telegram.trim() || undefined,
      instagram: form.instagram.trim() || undefined,
      preferredContact: (form.preferredContact || undefined) as PreferredContactMethod | undefined,
      notes: form.notes.trim() || undefined,
    };
  }

  function buildLinkInputs() {
    return Object.entries(linkConfigs)
      .filter(([, cfg]) => cfg.selected && cfg.relation)
      .map(([studentId, cfg]) => ({
        studentId,
        relation: cfg.relation as FamilyRelationType,
        customRelation: cfg.relation === 'other' ? cfg.customRelation.trim() || undefined : undefined,
        isPrimaryContact: cfg.isPrimaryContact,
        canDecideEducation: cfg.canDecideEducation,
        canReceiveNotifications: cfg.canReceiveNotifications,
        isEmergencyContact: cfg.isEmergencyContact,
        isBillingContact: cfg.isBillingContact,
      }));
  }

  function doCreate() {
    setSaving(true);
    const id = createFamilyContactWithLinks({
      contact: { familyId: form.familyId, ...buildPayload() },
      links: buildLinkInputs(),
      setAsFamilyPrimary,
      setAsFamilyBilling,
    });
    setIsDirty(false);
    router.push(`/parents/${id}`);
  }

  function doEdit() {
    if (!contactId) return;
    setSaving(true);
    const familyId = form.familyId;
    updateFamilyContact(contactId, buildPayload());

    for (const [studentId, cfg] of Object.entries(linkConfigs)) {
      if (!cfg.selected) continue;
      if (cfg.existingLinkId) {
        updateStudentContactLink(cfg.existingLinkId, {
          relation: cfg.relation as FamilyRelationType,
          customRelation: cfg.relation === 'other' ? cfg.customRelation.trim() || undefined : undefined,
          isPrimaryContact: cfg.isPrimaryContact,
          canDecideEducation: cfg.canDecideEducation,
          canReceiveNotifications: cfg.canReceiveNotifications,
          isEmergencyContact: cfg.isEmergencyContact,
          isBillingContact: cfg.isBillingContact,
        });
      } else {
        linkContactToStudent({
          familyId,
          studentId,
          contactId,
          relation: cfg.relation as FamilyRelationType,
          customRelation: cfg.relation === 'other' ? cfg.customRelation.trim() || undefined : undefined,
          isPrimaryContact: cfg.isPrimaryContact,
          canDecideEducation: cfg.canDecideEducation,
          canReceiveNotifications: cfg.canReceiveNotifications,
          isEmergencyContact: cfg.isEmergencyContact,
          isBillingContact: cfg.isBillingContact,
        });
      }
    }

    if (setAsFamilyPrimary) setFamilyPrimaryContact(familyId, contactId);
    if (setAsFamilyBilling) setFamilyBillingContact(familyId, contactId);

    setIsDirty(false);
    router.push(`/parents/${contactId}`);
  }

  function handleConfirmRemoveLinks() {
    for (const item of removeLinksConfirm) {
      unlinkContactFromStudent(item.linkId);
    }
    setRemoveLinksConfirm([]);
    doEdit();
  }

  function handleSubmit() {
    setHasAttemptedSubmit(true);
    if (!validate()) return;

    if (mode === 'create') {
      const dup = findDuplicate();
      if (dup) { setDuplicateMatch(dup); return; }
      doCreate();
      return;
    }

    const toRemove = Object.entries(linkConfigs)
      .filter(([, cfg]) => !cfg.selected && cfg.existingLinkId)
      .map(([studentId, cfg]) => {
        const student = allStudents.find((s) => s.id === studentId);
        return { linkId: cfg.existingLinkId!, studentName: student?.fullName ?? studentId };
      });

    if (toRemove.length > 0) {
      setRemoveLinksConfirm(toRemove);
      return;
    }

    doEdit();
  }

  function handleCancel() {
    if (isDirty && !confirm('Есть несохранённые изменения. Покинуть страницу?')) return;
    if (mode === 'edit' && contactId) router.push(`/parents/${contactId}`);
    else router.push('/families?tab=representatives');
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <AlertTriangle className="size-8 text-red-400" />
        <p className="text-lg font-semibold text-slate-700">Представитель не найден</p>
        <Button variant="outline" onClick={() => router.push('/families?tab=representatives')}>
          <ArrowLeft className="size-4" />Назад к списку
        </Button>
      </div>
    );
  }

  const hasFormErrors = hasAttemptedSubmit && (
    Object.keys(errors).length > 0 || Object.keys(linkErrors).length > 0
  );

  const currentPrimaryName = selectedFamily
    ? contacts.find((c) => c.id === selectedFamily.primaryContactId)?.fullName
    : undefined;
  const currentBillingName = selectedFamily
    ? contacts.find((c) => c.id === selectedFamily.billingContactId)?.fullName
    : undefined;

  return (
    <div className="flex flex-col gap-6">
      {/* sticky header */}
      <div className="sticky top-14 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-200 -mx-6 xl:-mx-8 px-6 xl:px-8 py-4">
        <Breadcrumb
          items={[
            { label: 'Семьи', href: '/families' },
            { label: 'Представители', href: '/families?tab=representatives' },
            { label: mode === 'edit' ? 'Редактировать' : 'Новый представитель' },
          ]}
        />
        <div className="flex items-center gap-3 mt-1">
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
      {hasFormErrors && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
          <AlertTriangle className="size-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">
            Заполните обязательные поля:{' '}
            <span className="font-medium">
              {[
                errors.fullName && 'Полное имя',
                errors.whatsapp && 'WhatsApp',
                errors.familyId && 'Семья',
                Object.keys(linkErrors).length > 0 && 'Степень родства',
              ].filter(Boolean).join(', ')}
            </span>
          </p>
        </div>
      )}

      {/* Family selector — create mode only */}
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

      {/* Children & Roles */}
      <Section
        icon={<Users className="size-4" />}
        title="Дети и роли"
        description="Выберите детей из семьи и настройте права представителя"
      >
        {!form.familyId ? (
          <p className="text-sm text-slate-400 py-4 text-center">Сначала выберите семью</p>
        ) : familyStudents.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">В этой семье пока нет учеников</p>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Apply-to-all panel */}
            {selectedStudentIds.length >= 2 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-blue-700 mb-2">Применить ко всем выбранным</p>
                <div className="flex flex-wrap gap-1.5">
                  {ROLE_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setLinkConfigs((prev) => {
                          const next = { ...prev };
                          for (const sid of selectedStudentIds) {
                            if (next[sid]?.selected) {
                              next[sid] = { ...next[sid], ...preset.patch };
                            }
                          }
                          return next;
                        });
                        setIsDirty(true);
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium border border-blue-300 bg-white text-blue-700 hover:bg-blue-100 transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Student rows */}
            {familyStudents.map((student) => {
              const config = linkConfigs[student.id] ?? defaultLinkConfig();
              const isOnlyLink = !!config.existingLinkId && (studentLinkCounts[student.id] ?? 0) <= 1;
              return (
                <StudentLinkRow
                  key={student.id}
                  studentId={student.id}
                  studentName={student.fullName}
                  studentGroup={student.group}
                  config={config}
                  onChange={(patch) => updateLink(student.id, patch)}
                  error={linkErrors[student.id]}
                  canDeselect={!isOnlyLink}
                />
              );
            })}

            {/* Family-level role */}
            {selectedStudentIds.length > 0 && (
              <div className="mt-1 pt-3 border-t border-slate-200">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Роль в семье</p>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={setAsFamilyPrimary}
                      onChange={(e) => setSetAsFamilyPrimary(e.target.checked)}
                      className="size-4 rounded accent-emerald-600"
                    />
                    <span className="text-sm text-slate-700">Сделать основным контактом семьи</span>
                    {currentPrimaryName && (
                      <span className="text-xs text-slate-400 ml-auto">сейчас: {currentPrimaryName}</span>
                    )}
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={setAsFamilyBilling}
                      onChange={(e) => setSetAsFamilyBilling(e.target.checked)}
                      className="size-4 rounded accent-emerald-600"
                    />
                    <span className="text-sm text-slate-700">Сделать основным плательщиком</span>
                    {currentBillingName && (
                      <span className="text-xs text-slate-400 ml-auto">сейчас: {currentBillingName}</span>
                    )}
                  </label>
                </div>
              </div>
            )}
          </div>
        )}
      </Section>

      {/* Basic info */}
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

      {/* Contacts */}
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

      {/* Notes */}
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
            <Button onClick={() => { setDuplicateMatch(null); doCreate(); }}>
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

      {/* Remove links confirm modal */}
      <Modal
        isOpen={removeLinksConfirm.length > 0}
        onClose={() => setRemoveLinksConfirm([])}
        size="sm"
        title="Удалить связи с учениками?"
        description="Следующие связи будут удалены без возможности восстановления:"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRemoveLinksConfirm([])}>Отмена</Button>
            <Button onClick={handleConfirmRemoveLinks}>Удалить и сохранить</Button>
          </>
        }
      >
        <ul className="flex flex-col gap-1.5">
          {removeLinksConfirm.map((item) => (
            <li key={item.linkId} className="flex items-center gap-2 text-sm text-slate-700 px-3 py-2 bg-slate-50 rounded-lg">
              <X className="size-3.5 text-red-400 shrink-0" />
              {item.studentName}
            </li>
          ))}
        </ul>
      </Modal>
    </div>
  );
}
