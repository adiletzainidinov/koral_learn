'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Save, User, Phone, FileText, AlertTriangle, UserRound,
  Plus, Users, Check, X, ChevronDown, ChevronUp, MapPin, CheckCircle, Tag,
} from 'lucide-react';
import { Breadcrumb } from '@/shared/ui/breadcrumb';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Select } from '@/shared/ui/select';
import { Card } from '@/shared/ui/card';
import { Modal } from '@/shared/ui/modal';
import { CreatableCombobox } from '@/shared/ui/creatable-combobox';
import {
  useAppStore, useAllFamilyContacts, useFamilies, useStudents,
  useContactStudentLinks, useAllStudentContactLinks,
} from '@/store/app-store';
import {
  PREFERRED_CONTACT_METHOD_LABELS,
  FAMILY_RELATION_LABELS,
  FAMILY_RELATION_OPTIONS,
  FAMILY_CONTACT_ROLE_LABELS,
  ALL_FAMILY_CONTACT_ROLES,
  type FamilyRelationType,
  type PreferredContactMethod,
  type FamilyContactRole,
} from '@/entities/family-contact/model/types';
import { normalizePhone, getContactInitials } from '@/entities/family-contact/model/helpers';
import { generateId } from '@/shared/lib/ids';
import { cn } from '@/shared/lib/cn';

// ─── Shared types ─────────────────────────────────────────────────────────────

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

// ─── Draft contact (create mode batch) ───────────────────────────────────────

interface DraftFamilyContact {
  clientId: string;
  fullName: string;
  whatsapp: string;
  phone: string;
  telegram: string;
  instagram: string;
  preferredContact: PreferredContactMethod | '';
  familyRelation: FamilyRelationType | '';
  customFamilyRelation: string;
  roles: FamilyContactRole[];
  customRoles: string[];
  usesFamilyAddress: boolean;
  address: string;
  notes: string;
  collapsed: boolean;
  isPrimaryContact: boolean;
}

function emptyDraft(): DraftFamilyContact {
  return {
    clientId: generateId(),
    fullName: '',
    whatsapp: '',
    phone: '',
    telegram: '',
    instagram: '',
    preferredContact: '',
    familyRelation: '',
    customFamilyRelation: '',
    roles: [],
    customRoles: [],
    usesFamilyAddress: true,
    address: '',
    notes: '',
    collapsed: false,
    isPrimaryContact: false,
  };
}

// ─── Edit-mode form state ─────────────────────────────────────────────────────

interface EditFormState {
  fullName: string;
  whatsapp: string;
  phone: string;
  telegram: string;
  instagram: string;
  preferredContact: PreferredContactMethod | '';
  familyRelation: FamilyRelationType | '';
  customFamilyRelation: string;
  roles: FamilyContactRole[];
  customRoles: string[];
  usesFamilyAddress: boolean;
  address: string;
  notes: string;
  familyId: string;
}

const EDIT_INITIAL: EditFormState = {
  fullName: '', whatsapp: '', phone: '', telegram: '', instagram: '',
  preferredContact: '', familyRelation: '', customFamilyRelation: '',
  roles: [], customRoles: [], usesFamilyAddress: true, address: '', notes: '', familyId: '',
};

interface EditFormErrors {
  fullName?: string;
  whatsapp?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_PRESETS: { label: string; patch: Partial<StudentLinkConfig> }[] = [
  { label: 'Основной родитель', patch: { isPrimaryContact: true, canDecideEducation: true, canReceiveNotifications: true, isEmergencyContact: false, isBillingContact: false } },
  { label: 'Плательщик', patch: { isBillingContact: true, canReceiveNotifications: true } },
  { label: 'Экстренный', patch: { isEmergencyContact: true, canReceiveNotifications: true } },
  { label: 'Уведомления', patch: { canReceiveNotifications: true, isPrimaryContact: false, canDecideEducation: false, isEmergencyContact: false, isBillingContact: false } },
];

const PREFERRED_CONTACT_OPTIONS = [
  { value: '', label: 'Не указано' },
  ...Object.entries(PREFERRED_CONTACT_METHOD_LABELS).map(([value, label]) => ({ value, label })),
];

// Combobox options — exclude 'other' (it maps to custom input)
const RELATION_COMBOBOX_OPTIONS = FAMILY_RELATION_OPTIONS
  .filter((r) => r !== 'other')
  .map((r) => ({ value: r, label: FAMILY_RELATION_LABELS[r] }));

// Student link row select options (keep native select for student link row)
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
              <Select label="Степень родства *" options={RELATION_SELECT_OPTIONS} value={config.relation}
                onChange={(e) => onChange({ relation: e.target.value as FamilyRelationType | '' })} />
              {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
            </div>
            {config.relation === 'other' && (
              <div className="flex-1">
                <Input label="Уточнение *" placeholder="Напр. «Дядя по маме»" value={config.customRelation}
                  onChange={(e) => onChange({ customRelation: e.target.value })} />
              </div>
            )}
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Быстрые роли</p>
            <div className="flex flex-wrap gap-1.5">
              {ROLE_PRESETS.map((preset) => (
                <button key={preset.label} type="button" onClick={() => onChange(preset.patch)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-200 bg-white text-slate-600 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-colors">
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Права</p>
            <div className="flex flex-wrap gap-1.5">
              <ToggleChip checked={config.isPrimaryContact} onChange={(v) => onChange({ isPrimaryContact: v })} variant="primary">Основной контакт</ToggleChip>
              <ToggleChip checked={config.canDecideEducation} onChange={(v) => onChange({ canDecideEducation: v })}>Решает за обучение</ToggleChip>
              <ToggleChip checked={config.canReceiveNotifications} onChange={(v) => onChange({ canReceiveNotifications: v })}>Уведомления</ToggleChip>
              <ToggleChip checked={config.isEmergencyContact} onChange={(v) => onChange({ isEmergencyContact: v })} variant="emergency">Экстренный</ToggleChip>
              <ToggleChip checked={config.isBillingContact} onChange={(v) => onChange({ isBillingContact: v })} variant="billing">Плательщик</ToggleChip>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Custom roles sub-component ───────────────────────────────────────────────

function CustomRolesInput({
  customRoles,
  onChange,
}: {
  customRoles: string[];
  onChange: (next: string[]) => void;
}) {
  const [inputValue, setInputValue] = useState('');

  function addRole() {
    const trimmed = inputValue.trim();
    if (!trimmed || customRoles.includes(trimmed)) return;
    onChange([...customRoles, trimmed]);
    setInputValue('');
  }

  function removeRole(role: string) {
    onChange(customRoles.filter((r) => r !== role));
  }

  return (
    <div className="flex flex-col gap-2">
      {customRoles.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {customRoles.map((role) => (
            <span
              key={role}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-violet-50 text-violet-700 border border-violet-200"
            >
              {role}
              <button
                type="button"
                onClick={() => removeRole(role)}
                className="text-violet-400 hover:text-violet-600 ml-0.5"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRole(); } }}
          placeholder="Своя роль..."
          className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
        />
        <button
          type="button"
          onClick={addRole}
          disabled={!inputValue.trim()}
          className="px-3 py-2 rounded-lg text-xs font-medium border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Draft card for batch create ─────────────────────────────────────────────

interface DraftCardProps {
  draft: DraftFamilyContact;
  index: number;
  familyAddress?: string;
  errors: Record<string, string>;
  onUpdate: (patch: Partial<DraftFamilyContact>) => void;
  onRemove: () => void;
  onPrimaryChange: (value: boolean) => void;
}

function DraftCard({ draft, index, familyAddress, errors, onUpdate, onRemove, onPrimaryChange }: DraftCardProps) {
  const hasErrors = Object.keys(errors).length > 0;
  const hasNoRoles = draft.roles.length === 0 && draft.customRoles.length === 0;

  const relationLabel = draft.familyRelation === 'other'
    ? (draft.customFamilyRelation || 'Другое')
    : (draft.familyRelation ? FAMILY_RELATION_LABELS[draft.familyRelation] : '');

  const allRoleLabels = [
    ...draft.roles.map((r) => FAMILY_CONTACT_ROLE_LABELS[r]),
    ...draft.customRoles,
  ];

  return (
    <Card padding="none" className={cn(hasErrors && 'border-red-300')}>
      {/* card header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
        <div className={cn(
          'size-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
          draft.isPrimaryContact ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
        )}>
          {draft.fullName ? draft.fullName.slice(0, 2).toUpperCase() : (index + 1)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">
            {draft.fullName || `Представитель ${index + 1}`}
          </p>
          {draft.collapsed ? (
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {draft.isPrimaryContact && (
                <span className="text-[10px] text-emerald-600 font-semibold">● Основной</span>
              )}
              {relationLabel && (
                <span className="text-[10px] text-slate-500">{relationLabel}</span>
              )}
              {allRoleLabels.slice(0, 2).map((lbl) => (
                <span key={lbl} className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{lbl}</span>
              ))}
              {allRoleLabels.length > 2 && (
                <span className="text-[10px] text-slate-400">+{allRoleLabels.length - 2}</span>
              )}
              {draft.whatsapp && (
                <span className="text-[10px] text-slate-400">{draft.whatsapp}</span>
              )}
            </div>
          ) : (
            draft.isPrimaryContact && (
              <p className="text-[10px] text-emerald-600 font-medium">Основной контакт</p>
            )
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onUpdate({ collapsed: !draft.collapsed })}
            className="size-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"
          >
            {draft.collapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
          </button>
          {index > 0 && (
            <button
              type="button"
              onClick={onRemove}
              className="size-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {!draft.collapsed && (
        <div className="p-4 flex flex-col gap-4">
          {/* 1 — Name + Relation */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Полное имя *"
              placeholder="Маматова Жылдыз"
              value={draft.fullName}
              onChange={(e) => onUpdate({ fullName: e.target.value })}
              error={errors.fullName}
            />
            <CreatableCombobox
              label="Кем является в семье"
              placeholder="Выберите или введите..."
              options={RELATION_COMBOBOX_OPTIONS}
              value={draft.familyRelation !== 'other' ? draft.familyRelation : ''}
              customValue={draft.customFamilyRelation}
              isCustom={draft.familyRelation === 'other'}
              onChange={(v, isCustom) => {
                if (isCustom) {
                  onUpdate({ familyRelation: 'other', customFamilyRelation: v });
                } else {
                  onUpdate({ familyRelation: v as FamilyRelationType | '', customFamilyRelation: '' });
                }
              }}
            />
          </div>

          {/* 2 — Primary contact checkbox */}
          <label className="flex items-center gap-2.5 cursor-pointer px-3 py-2.5 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors">
            <input
              type="checkbox"
              checked={draft.isPrimaryContact}
              onChange={(e) => onPrimaryChange(e.target.checked)}
              className="size-4 rounded accent-emerald-600"
            />
            <span className="text-sm text-slate-700 font-medium">Основной контакт семьи</span>
            {draft.isPrimaryContact && <Check className="size-4 text-emerald-600 ml-auto" />}
          </label>

          {/* 3 — Roles */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs font-semibold text-slate-500">Роли в семье</p>
              {hasNoRoles && (
                <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                  Не указаны
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1.5 mb-3">
              {ALL_FAMILY_CONTACT_ROLES.map((role) => (
                <label key={role} className="flex items-center gap-2 cursor-pointer py-1">
                  <input
                    type="checkbox"
                    checked={draft.roles.includes(role)}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...draft.roles, role]
                        : draft.roles.filter((r) => r !== role);
                      onUpdate({ roles: next });
                    }}
                    className="size-4 rounded accent-emerald-600 shrink-0"
                  />
                  <span className="text-xs text-slate-700 leading-tight">{FAMILY_CONTACT_ROLE_LABELS[role]}</span>
                </label>
              ))}
            </div>
            <CustomRolesInput
              customRoles={draft.customRoles}
              onChange={(next) => onUpdate({ customRoles: next })}
            />
          </div>

          {/* 4 — Contacts */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="WhatsApp *"
              placeholder="+996700000000"
              value={draft.whatsapp}
              onChange={(e) => onUpdate({ whatsapp: e.target.value })}
              error={errors.whatsapp}
            />
            <Input
              label="Телефон"
              placeholder="+996 700 000 000"
              value={draft.phone}
              onChange={(e) => onUpdate({ phone: e.target.value })}
            />
            <Input
              label="Telegram"
              placeholder="@username"
              value={draft.telegram}
              onChange={(e) => onUpdate({ telegram: e.target.value })}
            />
            <Input
              label="Instagram"
              placeholder="@username"
              value={draft.instagram}
              onChange={(e) => onUpdate({ instagram: e.target.value })}
            />
          </div>
          <Select
            label="Предпочтительный контакт"
            options={PREFERRED_CONTACT_OPTIONS}
            value={draft.preferredContact}
            onChange={(e) => onUpdate({ preferredContact: e.target.value as PreferredContactMethod | '' })}
          />

          {/* 5 — Address */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={draft.usesFamilyAddress}
                onChange={(e) => onUpdate({ usesFamilyAddress: e.target.checked })}
                className="size-4 rounded accent-emerald-600"
              />
              <span className="text-sm text-slate-700">Использовать адрес семьи</span>
              {familyAddress && <span className="text-xs text-slate-400 truncate ml-1">({familyAddress})</span>}
            </label>
            {!draft.usesFamilyAddress && (
              <Input
                label="Адрес"
                placeholder="г. Бишкек, ул. Токтогула, д. 14"
                value={draft.address}
                onChange={(e) => onUpdate({ address: e.target.value })}
              />
            )}
          </div>

          {/* 6 — Notes */}
          <textarea
            placeholder="Заметки о представителе..."
            value={draft.notes}
            onChange={(e) => onUpdate({ notes: e.target.value })}
            rows={2}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 resize-none outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
          />
        </div>
      )}
    </Card>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  mode?: 'create' | 'edit';
  contactId?: string;
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
  const createFamilyContactsBatch = useAppStore((s) => s.createFamilyContactsBatch);
  const createFamilyContactWithLinks = useAppStore((s) => s.createFamilyContactWithLinks);
  const updateFamilyContact = useAppStore((s) => s.updateFamilyContact);
  const linkContactToStudent = useAppStore((s) => s.linkContactToStudent);
  const updateStudentContactLink = useAppStore((s) => s.updateStudentContactLink);
  const unlinkContactFromStudent = useAppStore((s) => s.unlinkContactFromStudent);
  const setFamilyPrimaryContact = useAppStore((s) => s.setFamilyPrimaryContact);
  const setFamilyBillingContact = useAppStore((s) => s.setFamilyBillingContact);
  const createFamily = useAppStore((s) => s.createFamily);

  // ── Create mode state ────────────────────────────────────────────────────
  const [drafts, setDrafts] = useState<DraftFamilyContact[]>([emptyDraft()]);
  const [batchFamilyId, setBatchFamilyId] = useState(initialFamilyId ?? '');
  const [batchErrors, setBatchErrors] = useState<Record<string, Record<string, string>>>({});
  const [batchFamilyError, setBatchFamilyError] = useState('');
  const [batchSaving, setBatchSaving] = useState(false);
  const [batchSuccess, setBatchSuccess] = useState(false);
  const [successFamilyId, setSuccessFamilyId] = useState('');
  const [primaryConfirm, setPrimaryConfirm] = useState<{ clientId: string; existingName: string } | null>(null);

  // ── Edit mode state ──────────────────────────────────────────────────────
  const [form, setForm] = useState<EditFormState>(EDIT_INITIAL);
  const [editCustomRoleInput, setEditCustomRoleInput] = useState('');
  const [errors, setErrors] = useState<EditFormErrors>({});
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

  // ── Load edit data ─────────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'edit' || !contactId || hasLoaded.current) return;
    const contact = contacts.find((c) => c.id === contactId);
    if (!contact) { setTimeout(() => setNotFound(true), 0); return; }
    hasLoaded.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({
      fullName: contact.fullName,
      whatsapp: contact.whatsapp,
      phone: contact.phone ?? '',
      telegram: contact.telegram ?? '',
      instagram: contact.instagram ?? '',
      preferredContact: contact.preferredContact ?? '',
      familyRelation: contact.familyRelation ?? '',
      customFamilyRelation: contact.customFamilyRelation ?? '',
      roles: contact.roles ?? [],
      customRoles: contact.customRoles ?? [],
      usesFamilyAddress: contact.usesFamilyAddress ?? true,
      address: contact.address ?? '',
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

  // ── Dirty guard ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // ── Edit derived data ────────────────────────────────────────────────────
  const upd = useCallback(<K extends keyof EditFormState>(field: K, value: EditFormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  }, []);

  const selectedFamily = useMemo(
    () => families.find((f) => f.id === form.familyId) ?? null,
    [families, form.familyId]
  );

  const familyStudents = useMemo(
    () => selectedFamily ? allStudents.filter((s) => selectedFamily.studentIds.includes(s.id)) : [],
    [selectedFamily, allStudents]
  );

  const familyOptions = useMemo(
    () => [{ value: '', label: 'Выберите семью...' }, ...families.map((f) => ({ value: f.id, label: f.name }))],
    [families]
  );

  const selectedStudentIds = useMemo(
    () => Object.entries(linkConfigs).filter(([, cfg]) => cfg.selected).map(([id]) => id),
    [linkConfigs]
  );

  const studentLinkCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const link of allLinks) counts[link.studentId] = (counts[link.studentId] ?? 0) + 1;
    return counts;
  }, [allLinks]);

  const updateLink = useCallback((studentId: string, patch: Partial<StudentLinkConfig>) => {
    setLinkConfigs((prev) => ({ ...prev, [studentId]: { ...(prev[studentId] ?? defaultLinkConfig()), ...patch } }));
    setIsDirty(true);
  }, []);

  // ── Edit validation ──────────────────────────────────────────────────────
  function validateEdit(): boolean {
    const errs: EditFormErrors = {};
    if (!form.fullName.trim()) errs.fullName = 'Введите имя представителя';
    if (!form.whatsapp.trim()) errs.whatsapp = 'Введите WhatsApp номер';
    setErrors(errs);

    const lErrs: Record<string, string> = {};
    for (const [studentId, cfg] of Object.entries(linkConfigs)) {
      if (!cfg.selected) continue;
      if (!cfg.relation) lErrs[studentId] = 'Укажите степень родства';
      else if (cfg.relation === 'other' && !cfg.customRelation.trim()) lErrs[studentId] = 'Уточните степень родства';
    }
    setLinkErrors(lErrs);

    if (errs.fullName) fullNameRef.current?.focus();
    return Object.keys(errs).length === 0 && Object.keys(lErrs).length === 0;
  }

  function clearError(field: keyof EditFormErrors) {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  // ── Edit submit ──────────────────────────────────────────────────────────
  function buildEditPayload() {
    return {
      fullName: form.fullName.trim(),
      whatsapp: form.whatsapp.trim(),
      phone: form.phone.trim() || undefined,
      telegram: form.telegram.trim() || undefined,
      instagram: form.instagram.trim() || undefined,
      preferredContact: (form.preferredContact || undefined) as PreferredContactMethod | undefined,
      familyRelation: (form.familyRelation || undefined) as FamilyRelationType | undefined,
      customFamilyRelation: form.familyRelation === 'other' ? form.customFamilyRelation.trim() || undefined : undefined,
      roles: form.roles.length > 0 ? form.roles : undefined,
      customRoles: form.customRoles.length > 0 ? form.customRoles : undefined,
      usesFamilyAddress: form.usesFamilyAddress,
      address: form.usesFamilyAddress ? undefined : form.address.trim() || undefined,
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
    const normWA = normalizePhone(form.whatsapp);
    const dupContact = contacts.find((c) => c.id !== contactId && normalizePhone(c.whatsapp) === normWA);
    if (dupContact) { setDuplicateMatch({ id: dupContact.id, fullName: dupContact.fullName }); setSaving(false); return; }
    const id = createFamilyContactWithLinks({
      contact: { familyId: form.familyId, ...buildEditPayload() },
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
    updateFamilyContact(contactId, buildEditPayload());
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
          familyId, studentId, contactId,
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
    for (const item of removeLinksConfirm) unlinkContactFromStudent(item.linkId);
    setRemoveLinksConfirm([]);
    doEdit();
  }

  function handleEditSubmit() {
    setHasAttemptedSubmit(true);
    if (!validateEdit()) return;

    if (mode === 'create') {
      doCreate();
      return;
    }

    const toRemove = Object.entries(linkConfigs)
      .filter(([, cfg]) => !cfg.selected && cfg.existingLinkId)
      .map(([studentId, cfg]) => {
        const student = allStudents.find((s) => s.id === studentId);
        return { linkId: cfg.existingLinkId!, studentName: student?.fullName ?? studentId };
      });
    if (toRemove.length > 0) { setRemoveLinksConfirm(toRemove); return; }
    doEdit();
  }

  function handleCancel() {
    if (isDirty && !confirm('Есть несохранённые изменения. Покинуть страницу?')) return;
    if (mode === 'edit' && contactId) router.push(`/parents/${contactId}`);
    else router.push('/families?tab=representatives');
  }

  // ── Batch create helpers ─────────────────────────────────────────────────
  function updateDraft(clientId: string, patch: Partial<DraftFamilyContact>) {
    setDrafts((prev) => prev.map((d) => d.clientId === clientId ? { ...d, ...patch } : d));
  }

  function removeDraft(clientId: string) {
    setDrafts((prev) => {
      const next = prev.filter((d) => d.clientId !== clientId);
      return next.length > 0 ? next : [emptyDraft()];
    });
  }

  function handlePrimaryChange(clientId: string, value: boolean) {
    if (!value) {
      updateDraft(clientId, { isPrimaryContact: false });
      return;
    }
    const existingPrimary = drafts.find((d) => d.isPrimaryContact && d.clientId !== clientId);
    if (existingPrimary) {
      setPrimaryConfirm({ clientId, existingName: existingPrimary.fullName || `Представитель ${drafts.indexOf(existingPrimary) + 1}` });
    } else {
      updateDraft(clientId, { isPrimaryContact: true });
    }
  }

  function confirmReplacePrimary() {
    if (!primaryConfirm) return;
    const targetId = primaryConfirm.clientId;
    setDrafts((prev) => prev.map((d) => ({ ...d, isPrimaryContact: d.clientId === targetId })));
    setPrimaryConfirm(null);
  }

  function validateBatch(): boolean {
    const errs: Record<string, Record<string, string>> = {};
    let familyErr = '';
    if (!batchFamilyId) familyErr = 'Выберите семью';
    setBatchFamilyError(familyErr);
    for (const draft of drafts) {
      const e: Record<string, string> = {};
      if (!draft.fullName.trim()) e.fullName = 'Введите имя';
      if (!draft.whatsapp.trim()) e.whatsapp = 'Введите WhatsApp';
      if (Object.keys(e).length > 0) errs[draft.clientId] = e;
    }
    setBatchErrors(errs);
    return !familyErr && Object.keys(errs).length === 0;
  }

  function handleBatchSubmit() {
    if (!validateBatch()) return;
    setBatchSaving(true);
    const contactInputs = drafts.map((d) => ({
      fullName: d.fullName.trim(),
      whatsapp: d.whatsapp.trim(),
      phone: d.phone.trim() || undefined,
      telegram: d.telegram.trim() || undefined,
      instagram: d.instagram.trim() || undefined,
      preferredContact: (d.preferredContact || undefined) as PreferredContactMethod | undefined,
      familyRelation: (d.familyRelation || undefined) as FamilyRelationType | undefined,
      customFamilyRelation: d.familyRelation === 'other' ? d.customFamilyRelation.trim() || undefined : undefined,
      roles: d.roles.length > 0 ? d.roles : undefined,
      customRoles: d.customRoles.length > 0 ? d.customRoles : undefined,
      usesFamilyAddress: d.usesFamilyAddress,
      address: d.usesFamilyAddress ? undefined : d.address.trim() || undefined,
      notes: d.notes.trim() || undefined,
    }));
    const primaryIndex = drafts.findIndex((d) => d.isPrimaryContact);
    createFamilyContactsBatch({
      familyId: batchFamilyId,
      contacts: contactInputs,
      primaryContactIndex: primaryIndex >= 0 ? primaryIndex : undefined,
    });
    setSuccessFamilyId(batchFamilyId);
    setBatchSuccess(true);
    setBatchSaving(false);
  }

  const noPrimaryWarning = drafts.length > 0 && !drafts.some((d) => d.isPrimaryContact);

  // ── Not found ────────────────────────────────────────────────────────────
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

  // ── Batch success ────────────────────────────────────────────────────────
  if (mode === 'create' && batchSuccess) {
    return (
      <div className="flex flex-col gap-6">
        <div className="sticky top-14 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-200 -mx-6 xl:-mx-8 px-6 xl:px-8 py-4">
          <Breadcrumb items={[{ label: 'Семьи', href: '/families' }, { label: 'Представители' }]} />
          <h1 className="text-xl font-bold text-slate-900 mt-1">Представители добавлены</h1>
        </div>
        <Card padding="none">
          <div className="p-8 flex flex-col items-center text-center gap-4">
            <div className="size-14 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="size-7 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {drafts.length === 1 ? '1 представитель добавлен' : `${drafts.length} представителя добавлено`}
              </h2>
              <p className="text-sm text-slate-500 mt-1">Профили созданы и привязаны к семье</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-2 w-full max-w-sm">
              <Button className="flex-1" onClick={() => router.push(`/support/families/${successFamilyId}`)}>
                Открыть семью
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => {
                setDrafts([emptyDraft()]);
                setBatchSuccess(false);
                setBatchErrors({});
              }}>
                Добавить ещё
              </Button>
            </div>
            <button type="button" onClick={() => router.push('/families?tab=representatives')}
              className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
              К списку представителей
            </button>
          </div>
        </Card>
      </div>
    );
  }

  // ── BATCH CREATE MODE ─────────────────────────────────────────────────────
  if (mode === 'create') {
    const batchFamily = families.find((f) => f.id === batchFamilyId);

    return (
      <div className="flex flex-col gap-6">
        <div className="sticky top-14 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-200 -mx-6 xl:-mx-8 px-6 xl:px-8 py-4">
          <Breadcrumb items={[
            { label: 'Семьи', href: '/families' },
            { label: 'Представители', href: '/families?tab=representatives' },
            { label: 'Добавить представителей' },
          ]} />
          <div className="flex items-center gap-3 mt-1">
            <button type="button" onClick={() => router.push('/families?tab=representatives')}
              className="size-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors shrink-0">
              <ArrowLeft className="size-4" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Добавить представителей</h1>
              <p className="text-sm text-slate-500">Можно добавить сразу несколько представителей</p>
            </div>
          </div>
        </div>

        {/* Family selector */}
        <Section icon={<UserRound className="size-4" />} title="Семья" description="К какой семье относятся эти представители">
          <Select
            label="Семья *"
            options={familyOptions}
            value={batchFamilyId}
            onChange={(e) => { setBatchFamilyId(e.target.value); setBatchFamilyError(''); }}
          />
          {batchFamilyError && <p className="text-xs text-red-500 mt-1">{batchFamilyError}</p>}
          <button type="button" onClick={() => { setNewFamilyName(''); setShowNewFamilyModal(true); }}
            className="flex items-center gap-1 mt-2 text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
            <Plus className="size-3.5" />Создать новую семью
          </button>
        </Section>

        {/* Draft cards */}
        <div className="flex flex-col gap-3">
          {drafts.map((draft, index) => (
            <DraftCard
              key={draft.clientId}
              draft={draft}
              index={index}
              familyAddress={batchFamily?.address}
              errors={batchErrors[draft.clientId] ?? {}}
              onUpdate={(patch) => updateDraft(draft.clientId, patch)}
              onRemove={() => removeDraft(draft.clientId)}
              onPrimaryChange={(value) => handlePrimaryChange(draft.clientId, value)}
            />
          ))}
        </div>

        {/* Add another button */}
        <button
          type="button"
          onClick={() => setDrafts((prev) => [...prev, emptyDraft()])}
          className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-slate-200 text-sm font-medium text-slate-500 hover:border-emerald-300 hover:text-emerald-600 transition-colors"
        >
          <Plus className="size-4" />
          Добавить ещё представителя
        </button>

        {/* Soft warning: no primary */}
        {noPrimaryWarning && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
            <AlertTriangle className="size-4 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-700">
              Не указан основной контакт — рекомендуем отметить одного из представителей
            </p>
          </div>
        )}

        {/* bottom bar */}
        <div className="flex items-center justify-end gap-3 py-4 border-t border-slate-200 mt-2">
          <Button variant="outline" onClick={() => router.push('/families?tab=representatives')}>Отмена</Button>
          <Button onClick={handleBatchSubmit} loading={batchSaving}>
            <Save className="size-4" />
            {drafts.length === 1 ? 'Сохранить' : `Сохранить (${drafts.length})`}
          </Button>
        </div>

        {/* Confirm replace primary modal */}
        <Modal
          isOpen={primaryConfirm !== null}
          onClose={() => setPrimaryConfirm(null)}
          size="sm"
          title="Заменить основной контакт?"
          footer={
            <>
              <Button variant="ghost" onClick={() => setPrimaryConfirm(null)}>Отмена</Button>
              <Button onClick={confirmReplacePrimary}>Заменить</Button>
            </>
          }
        >
          <p className="text-sm text-slate-600">
            Основным уже отмечен: <strong>{primaryConfirm?.existingName}</strong>. Заменить на нового?
          </p>
        </Modal>

        {/* Quick-create family modal */}
        <Modal
          isOpen={showNewFamilyModal}
          onClose={() => setShowNewFamilyModal(false)}
          size="sm"
          title="Создать новую семью"
          footer={
            <>
              <Button variant="ghost" onClick={() => setShowNewFamilyModal(false)}>Отмена</Button>
              <Button onClick={() => {
                const name = newFamilyName.trim();
                if (!name) return;
                const id = createFamily({ name });
                setBatchFamilyId(id);
                setBatchFamilyError('');
                setShowNewFamilyModal(false);
              }} disabled={!newFamilyName.trim()}>
                <Plus className="size-4" />Создать и выбрать
              </Button>
            </>
          }
        >
          <Input label="Название семьи *" placeholder="Маматовы" value={newFamilyName}
            onChange={(e) => setNewFamilyName(e.target.value)} autoFocus />
        </Modal>
      </div>
    );
  }

  // ── EDIT MODE ─────────────────────────────────────────────────────────────

  const hasFormErrors = hasAttemptedSubmit && (Object.keys(errors).length > 0 || Object.keys(linkErrors).length > 0);
  const currentPrimaryName = selectedFamily ? contacts.find((c) => c.id === selectedFamily.primaryContactId)?.fullName : undefined;
  const currentBillingName = selectedFamily ? contacts.find((c) => c.id === selectedFamily.billingContactId)?.fullName : undefined;

  function addEditCustomRole() {
    const trimmed = editCustomRoleInput.trim();
    if (!trimmed || form.customRoles.includes(trimmed)) return;
    upd('customRoles', [...form.customRoles, trimmed]);
    setEditCustomRoleInput('');
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="sticky top-14 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-200 -mx-6 xl:-mx-8 px-6 xl:px-8 py-4">
        <Breadcrumb items={[
          { label: 'Семьи', href: '/families' },
          { label: 'Представители', href: '/families?tab=representatives' },
          { label: 'Редактировать' },
        ]} />
        <div className="flex items-center gap-3 mt-1">
          <button type="button" onClick={handleCancel}
            className="size-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors shrink-0">
            <ArrowLeft className="size-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Редактировать представителя</h1>
            <p className="text-sm text-slate-500">Измените данные и сохраните</p>
          </div>
        </div>
      </div>

      {hasFormErrors && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
          <AlertTriangle className="size-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">
            Заполните обязательные поля:{' '}
            <span className="font-medium">
              {[errors.fullName && 'Полное имя', errors.whatsapp && 'WhatsApp', Object.keys(linkErrors).length > 0 && 'Степень родства'].filter(Boolean).join(', ')}
            </span>
          </p>
        </div>
      )}

      {/* Children & Roles */}
      <Section icon={<Users className="size-4" />} title="Дети и роли" description="Выберите детей из семьи и настройте права">
        {familyStudents.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">В этой семье пока нет учеников</p>
        ) : (
          <div className="flex flex-col gap-3">
            {selectedStudentIds.length >= 2 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-blue-700 mb-2">Применить ко всем выбранным</p>
                <div className="flex flex-wrap gap-1.5">
                  {ROLE_PRESETS.map((preset) => (
                    <button key={preset.label} type="button" onClick={() => {
                      setLinkConfigs((prev) => {
                        const next = { ...prev };
                        for (const sid of selectedStudentIds) {
                          if (next[sid]?.selected) next[sid] = { ...next[sid], ...preset.patch };
                        }
                        return next;
                      });
                      setIsDirty(true);
                    }}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium border border-blue-300 bg-white text-blue-700 hover:bg-blue-100 transition-colors">
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
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
            {selectedStudentIds.length > 0 && (
              <div className="mt-1 pt-3 border-t border-slate-200">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Роль в семье</p>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={setAsFamilyPrimary} onChange={(e) => setSetAsFamilyPrimary(e.target.checked)} className="size-4 rounded accent-emerald-600" />
                    <span className="text-sm text-slate-700">Сделать основным контактом семьи</span>
                    {currentPrimaryName && <span className="text-xs text-slate-400 ml-auto">сейчас: {currentPrimaryName}</span>}
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={setAsFamilyBilling} onChange={(e) => setSetAsFamilyBilling(e.target.checked)} className="size-4 rounded accent-emerald-600" />
                    <span className="text-sm text-slate-700">Сделать основным плательщиком</span>
                    {currentBillingName && <span className="text-xs text-slate-400 ml-auto">сейчас: {currentBillingName}</span>}
                  </label>
                </div>
              </div>
            )}
          </div>
        )}
      </Section>

      {/* Basic info */}
      <Section icon={<User className="size-4" />} title="Основная информация" description="Имя, родство в семье и предпочтительный способ связи">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              ref={fullNameRef}
              label="Полное имя *"
              placeholder="Маматова Жылдыз Абдыбековна"
              value={form.fullName}
              onChange={(e) => { upd('fullName', e.target.value); clearError('fullName'); }}
              error={errors.fullName}
            />
            <CreatableCombobox
              label="Кем является в семье"
              placeholder="Выберите или введите..."
              options={RELATION_COMBOBOX_OPTIONS}
              value={form.familyRelation !== 'other' ? form.familyRelation : ''}
              customValue={form.customFamilyRelation}
              isCustom={form.familyRelation === 'other'}
              onChange={(v, isCustom) => {
                if (isCustom) {
                  upd('familyRelation', 'other');
                  upd('customFamilyRelation', v);
                } else {
                  upd('familyRelation', v as FamilyRelationType | '');
                  upd('customFamilyRelation', '');
                }
              }}
            />
          </div>
          <Select
            label="Предпочтительный контакт"
            options={PREFERRED_CONTACT_OPTIONS}
            value={form.preferredContact}
            onChange={(e) => upd('preferredContact', e.target.value as PreferredContactMethod | '')}
          />
        </div>
      </Section>

      {/* Family-level roles */}
      <Section icon={<Tag className="size-4" />} title="Роли в семье" description="Функциональные роли этого представителя">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-1.5">
            {ALL_FAMILY_CONTACT_ROLES.map((role) => (
              <label key={role} className="flex items-center gap-2.5 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={form.roles.includes(role)}
                  onChange={(e) => {
                    const next = e.target.checked ? [...form.roles, role] : form.roles.filter((r) => r !== role);
                    upd('roles', next);
                  }}
                  className="size-4 rounded accent-emerald-600"
                />
                <span className="text-sm text-slate-700">{FAMILY_CONTACT_ROLE_LABELS[role]}</span>
              </label>
            ))}
          </div>
          {form.customRoles.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {form.customRoles.map((role) => (
                <span key={role} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-violet-50 text-violet-700 border border-violet-200">
                  {role}
                  <button
                    type="button"
                    onClick={() => upd('customRoles', form.customRoles.filter((r) => r !== role))}
                    className="text-violet-400 hover:text-violet-600 ml-0.5"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={editCustomRoleInput}
              onChange={(e) => setEditCustomRoleInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addEditCustomRole(); } }}
              placeholder="Своя роль..."
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
            <button
              type="button"
              onClick={addEditCustomRole}
              disabled={!editCustomRoleInput.trim()}
              className="px-3 py-2 rounded-lg text-xs font-medium border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>
      </Section>

      {/* Address */}
      <Section icon={<MapPin className="size-4" />} title="Адрес" description="Адрес представителя или использование адреса семьи">
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.usesFamilyAddress}
              onChange={(e) => upd('usesFamilyAddress', e.target.checked)}
              className="size-4 rounded accent-emerald-600"
            />
            <span className="text-sm text-slate-700">Использовать адрес семьи</span>
            {selectedFamily?.address && <span className="text-xs text-slate-400 truncate">({selectedFamily.address})</span>}
          </label>
          {!form.usesFamilyAddress && (
            <Input
              label="Адрес"
              placeholder="г. Бишкек, ул. Токтогула, д. 14"
              value={form.address}
              onChange={(e) => upd('address', e.target.value)}
            />
          )}
        </div>
      </Section>

      {/* Contacts */}
      <Section icon={<Phone className="size-4" />} title="Контакты" description="WhatsApp обязателен, остальное опционально">
        <div className="grid grid-cols-2 gap-4">
          <Input label="WhatsApp *" placeholder="+996700000000" value={form.whatsapp}
            onChange={(e) => { upd('whatsapp', e.target.value); clearError('whatsapp'); }} error={errors.whatsapp} />
          <Input label="Телефон" placeholder="+996 700 000 000" value={form.phone}
            onChange={(e) => upd('phone', e.target.value)} />
          <Input label="Telegram" placeholder="@username" value={form.telegram}
            onChange={(e) => upd('telegram', e.target.value)} />
          <Input label="Instagram" placeholder="@username" value={form.instagram}
            onChange={(e) => upd('instagram', e.target.value)} />
        </div>
      </Section>

      {/* Notes */}
      <Section icon={<FileText className="size-4" />} title="Заметки" description="Дополнительная информация о представителе">
        <textarea
          placeholder="Например: всегда на связи, предпочитает WhatsApp..."
          value={form.notes}
          onChange={(e) => upd('notes', e.target.value)}
          rows={3}
          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 resize-none outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
        />
      </Section>

      {/* bottom bar */}
      <div className="flex items-center justify-between py-4 border-t border-slate-200 mt-2">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          {isDirty && <><div className="size-1.5 rounded-full bg-amber-400" />Есть несохранённые изменения</>}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleCancel}>Отмена</Button>
          <Button onClick={handleEditSubmit} loading={saving}>
            <Save className="size-4" />Сохранить изменения
          </Button>
        </div>
      </div>

      {/* Duplicate detection modal */}
      <Modal
        isOpen={duplicateMatch !== null}
        onClose={() => setDuplicateMatch(null)}
        size="sm"
        title="Возможно, такой представитель уже существует"
        description={duplicateMatch ? `«${duplicateMatch.fullName}» уже зарегистрирован с этим номером WhatsApp.` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDuplicateMatch(null)}>Отмена</Button>
            <Button variant="outline" onClick={() => { const id = duplicateMatch?.id; setDuplicateMatch(null); if (id) router.push(`/parents/${id}`); }}>
              Использовать существующего
            </Button>
            <Button onClick={() => {
              setDuplicateMatch(null);
              if (!contactId) {
                const id = createFamilyContactWithLinks({ contact: { familyId: form.familyId, ...buildEditPayload() }, links: buildLinkInputs(), setAsFamilyPrimary, setAsFamilyBilling });
                setIsDirty(false);
                router.push(`/parents/${id}`);
              } else doEdit();
            }}>
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
        description="Следующие связи будут удалены:"
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
              <X className="size-3.5 text-red-400 shrink-0" />{item.studentName}
            </li>
          ))}
        </ul>
      </Modal>

      {/* Quick-create family modal */}
      <Modal
        isOpen={showNewFamilyModal}
        onClose={() => setShowNewFamilyModal(false)}
        size="sm"
        title="Создать новую семью"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowNewFamilyModal(false)}>Отмена</Button>
            <Button onClick={() => {
              const name = newFamilyName.trim();
              if (!name) return;
              createFamily({ name });
              setShowNewFamilyModal(false);
            }} disabled={!newFamilyName.trim()}>
              <Plus className="size-4" />Создать
            </Button>
          </>
        }
      >
        <Input label="Название семьи *" placeholder="Маматовы" value={newFamilyName}
          onChange={(e) => setNewFamilyName(e.target.value)} autoFocus />
      </Modal>
    </div>
  );
}
