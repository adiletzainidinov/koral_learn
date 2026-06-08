'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Users, Check, AlertTriangle, MessageCircle, Phone, Send,
  AtSign, MapPin, UserRound, X, Search, Star,
} from 'lucide-react';
import { useAppStore, useParents, useStudents, useFamilyByParentId } from '@/store/app-store';
import {
  SUPPORT_PLANS, PLAN_COLORS, LESSON_TYPE_LABELS,
  calculateMixedAmount, getSelectionAmount, formatAmount, derivePlanType,
} from '@/entities/support/model/helpers';
import type { SupportPlanType, LessonType, LessonSelection } from '@/entities/support/model/types';
import type { Parent } from '@/entities/parent/model/types';
import { formatWhatsappLink, formatTelegramLink, formatInstagramLink } from '@/entities/parent/model/helpers';
import { STUDENT_LEVEL_LABELS } from '@/entities/student/model/types';
import { generateId } from '@/shared/lib/ids';
import { cn } from '@/shared/lib/cn';

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title, description, children, badge,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200">
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-slate-100">
        <div>
          <h2 className="font-semibold text-slate-800">{title}</h2>
          {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
        </div>
        {badge}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Parent combobox ──────────────────────────────────────────────────────────

function ParentCombobox({
  parentId, onChange, parents, allStudents, error, inputRef,
}: {
  parentId?: string;
  onChange: (id: string | undefined) => void;
  parents: Parent[];
  allStudents: ReturnType<typeof useStudents>;
  error?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedParent = useMemo(() => parents.find((p) => p.id === parentId), [parents, parentId]);

  const childCountMap = useMemo(() => {
    const map = new Map<string, number>();
    allStudents.forEach((s) => {
      if (s.parentId) map.set(s.parentId, (map.get(s.parentId) ?? 0) + 1);
    });
    return map;
  }, [allStudents]);

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
      <div ref={containerRef} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
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
            placeholder="Поиск по имени, WhatsApp или телефону..."
            className={cn(
              'h-10 w-full rounded-xl border pl-9 pr-8 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors',
              error ? 'border-red-300 bg-red-50/40' : 'border-slate-200 bg-white'
            )}
          />
          {selectedParent && (
            <button
              type="button"
              onClick={() => { onChange(undefined); setSearch(''); setIsOpen(false); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 size-5 flex items-center justify-center text-slate-400 hover:text-slate-600"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {isOpen && (
          <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-auto max-h-60">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center py-6 gap-2">
                <UserRound className="size-5 text-slate-300" />
                <p className="text-sm text-slate-400">Родителей не найдено</p>
                <a href="/parents/new" target="_blank" rel="noopener noreferrer"
                  className="text-xs text-emerald-600 hover:underline font-medium">
                  + Создать родителя
                </a>
              </div>
            ) : (
              filtered.map((p) => {
                const initials = p.fullName.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
                const count = childCountMap.get(p.id) ?? 0;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); onChange(p.id); setSearch(''); setIsOpen(false); }}
                    className={cn(
                      'w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors',
                      parentId === p.id && 'bg-emerald-50'
                    )}
                  >
                    <div className="size-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{p.fullName}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {p.whatsapp}
                        {count > 0 && (
                          <span className="ml-2 text-emerald-600">
                            · {count} {count === 1 ? 'ребёнок' : count < 5 ? 'ребёнка' : 'детей'}
                          </span>
                        )}
                      </p>
                    </div>
                    {parentId === p.id && <Check className="size-4 text-emerald-600 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// ─── Selected parent card ─────────────────────────────────────────────────────

function ParentCard({ parent, onClear }: { parent: Parent; onClear: () => void }) {
  const initials = parent.fullName.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return (
    <div className="mt-4 p-4 rounded-xl border border-emerald-200 bg-emerald-50/60">
      <div className="flex items-start gap-3">
        <div className="size-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-sm font-bold shrink-0">
          {initials || <UserRound className="size-5 text-emerald-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900">{parent.fullName}</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
            <a href={formatWhatsappLink(parent.whatsapp)} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-green-700 hover:underline">
              <MessageCircle className="size-3 shrink-0" />{parent.whatsapp}
            </a>
            {parent.phone && (
              <a href={`tel:${parent.phone}`} className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-emerald-700">
                <Phone className="size-3 shrink-0" />{parent.phone}
              </a>
            )}
            {parent.telegram && (
              <a href={formatTelegramLink(parent.telegram)} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
                <Send className="size-3 shrink-0" />{parent.telegram}
              </a>
            )}
            {parent.instagram && (
              <a href={formatInstagramLink(parent.instagram)} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-pink-600 hover:underline">
                <AtSign className="size-3 shrink-0" />{parent.instagram}
              </a>
            )}
            {parent.address && (
              <span className="flex items-center gap-1.5 text-xs text-slate-500 col-span-2">
                <MapPin className="size-3 shrink-0" />{parent.address}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href={`/parents/${parent.id}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <UserRound className="size-3" />Открыть
          </Link>
          <button type="button" onClick={onClear}
            className="size-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
            <X className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Per-student plan selector ────────────────────────────────────────────────

const PLAN_ORDER: SupportPlanType[] = ['open_learning', 'family_support', 'focused_learning', 'private_group', 'custom'];

interface StudentConfig {
  planType: SupportPlanType;
  lessonType: LessonType;
  monthlyAmount: number;
}

function defaultConfig(): StudentConfig {
  return { planType: 'family_support', lessonType: 'quran_group', monthlyAmount: 1000 };
}

function StudentPlanRow({
  student,
  config,
  onChange,
}: {
  student: { id: string; fullName: string; age: number; group: string; level: string; totalPoints: number; avatar?: string; isActive: boolean };
  config: StudentConfig;
  onChange: (cfg: StudentConfig) => void;
}) {
  const colors = PLAN_COLORS[config.planType];
  const initials = student.fullName.slice(0, 2).toUpperCase();

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 overflow-hidden">
      {/* Student header */}
      <div className="flex items-center gap-3 px-3 py-2.5 border-b border-emerald-100">
        <div className="size-8 rounded-full overflow-hidden bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold shrink-0">
          {student.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={student.avatar} alt={student.fullName} className="size-full object-cover" />
          ) : initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800">{student.fullName}</p>
          <p className="text-xs text-slate-400">
            Группа {student.group} · {student.age} лет
          </p>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-400 shrink-0">
          <Star className="size-3" />{student.totalPoints}
        </div>
      </div>

      {/* Plan + lesson type */}
      <div className="p-3 space-y-2.5">
        {/* Plan type chips */}
        <div className="flex flex-wrap gap-1.5">
          {PLAN_ORDER.map((pt) => {
            const plan = SUPPORT_PLANS[pt];
            const c = PLAN_COLORS[pt];
            const isActive = config.planType === pt;
            return (
              <button
                key={pt}
                type="button"
                onClick={() => {
                  const amount = getSelectionAmount(pt);
                  onChange({ ...config, planType: pt, monthlyAmount: amount });
                }}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all',
                  isActive
                    ? `${c.badge} border-transparent`
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                )}
              >
                <span>{plan.emoji}</span>
                <span>{plan.name}</span>
              </button>
            );
          })}
        </div>

        {/* Lesson type + amount row */}
        <div className="flex items-center gap-2">
          <select
            value={config.lessonType}
            onChange={(e) => onChange({ ...config, lessonType: e.target.value as LessonType })}
            className="flex-1 h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {(Object.keys(LESSON_TYPE_LABELS) as LessonType[]).map((lt) => (
              <option key={lt} value={lt}>{LESSON_TYPE_LABELS[lt]}</option>
            ))}
          </select>

          {config.planType === 'custom' ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                step="100"
                value={config.monthlyAmount}
                onChange={(e) => onChange({ ...config, monthlyAmount: Number(e.target.value) || 0 })}
                className="w-24 h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <span className="text-xs text-slate-400">сом</span>
            </div>
          ) : (
            <div className={cn('px-2.5 py-1 rounded-lg text-xs font-semibold', colors.badge)}>
              {formatAmount(config.monthlyAmount)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Existing family warning ───────────────────────────────────────────────────

function ExistingFamilyWarning({ familyId }: { familyId: string }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
      <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-800">У этого родителя уже есть запись</p>
        <p className="text-xs text-amber-700 mt-0.5">
          Создание дубликата не разрешено.{' '}
          <Link href={`/support/families/${familyId}`} className="underline font-medium">
            Открыть существующую запись →
          </Link>
        </p>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

interface FormErrors {
  parentId?: string;
  studentIds?: string;
}

export default function NewFamilyPage() {
  const router = useRouter();
  const parents = useParents();
  const allStudents = useStudents();
  const createFamily = useAppStore((s) => s.createFamily);

  const [parentId, setParentId] = useState<string | undefined>();
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentConfigs, setStudentConfigs] = useState<Map<string, StudentConfig>>(new Map());
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [hasAttempted, setHasAttempted] = useState(false);

  const parentInputRef = useRef<HTMLInputElement | null>(null);

  const selectedParent = useMemo(
    () => parents.find((p) => p.id === parentId),
    [parents, parentId]
  );

  const existingFamily = useFamilyByParentId(parentId ?? '');

  // Students belonging to the selected parent
  const parentStudents = useMemo(
    () => (parentId ? allStudents.filter((s) => s.parentId === parentId) : []),
    [allStudents, parentId]
  );

  // When parent changes, reset student selection to all children of that parent
  useEffect(() => {
    const ids = parentStudents.map((s) => s.id);
    setSelectedStudentIds(ids);
    setStudentConfigs((prev) => {
      const next = new Map(prev);
      ids.forEach((id) => { if (!next.has(id)) next.set(id, defaultConfig()); });
      return next;
    });
  }, [parentId]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleStudent(id: string) {
    setSelectedStudentIds((prev) => {
      if (prev.includes(id)) return prev.filter((s) => s !== id);
      setStudentConfigs((c) => {
        if (c.has(id)) return c;
        return new Map(c).set(id, defaultConfig());
      });
      return [...prev, id];
    });
    if (hasAttempted) setErrors((e) => ({ ...e, studentIds: undefined }));
  }

  function updateConfig(studentId: string, cfg: StudentConfig) {
    setStudentConfigs((prev) => new Map(prev).set(studentId, cfg));
  }

  // Build lessonSelections from current state
  const lessonSelections: LessonSelection[] = useMemo(() => {
    return selectedStudentIds.map((sid) => {
      const cfg = studentConfigs.get(sid) ?? defaultConfig();
      return {
        id: generateId(),
        studentId: sid,
        lessonType: cfg.lessonType,
        planType: cfg.planType,
        monthlyAmount: cfg.planType === 'custom' ? cfg.monthlyAmount : getSelectionAmount(cfg.planType),
        isActive: true,
      };
    });
  }, [selectedStudentIds, studentConfigs]);

  const totalAmount = useMemo(() => calculateMixedAmount(lessonSelections), [lessonSelections]);
  const dominantPlan = useMemo(() => derivePlanType(lessonSelections), [lessonSelections]);

  function validate(): boolean {
    const errs: FormErrors = {};
    if (!parentId) errs.parentId = 'Выберите родителя';
    if (selectedStudentIds.length === 0) errs.studentIds = 'Выберите хотя бы одного ребёнка';
    setErrors(errs);
    if (errs.parentId) { parentInputRef.current?.focus(); return false; }
    return Object.keys(errs).length === 0;
  }

  function handleSubmit() {
    setHasAttempted(true);
    if (!validate() || !parentId || submitting || existingFamily) return;
    setSubmitting(true);
    const id = createFamily({
      parentId,
      studentIds: selectedStudentIds,
      lessonSelections,
      supportPlanType: dominantPlan,
      notes: notes.trim() || undefined,
    });
    router.push(`/support/families/${id}`);
  }

  return (
    <div className="p-6 max-w-2xl mx-auto pb-28">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/support"
          className="size-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shrink-0">
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Добавить семью</h1>
          <p className="text-sm text-slate-500">Выберите родителя, детей и формат обучения для каждого</p>
        </div>
      </div>

      {/* Validation banner */}
      {hasAttempted && Object.keys(errors).length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 mb-5 rounded-xl bg-red-50 border border-red-200">
          <AlertTriangle className="size-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">
            Заполните обязательные поля:{' '}
            <span className="font-medium">
              {[
                errors.parentId && 'Родитель',
                errors.studentIds && 'Дети',
              ].filter(Boolean).join(', ')}
            </span>
          </p>
        </div>
      )}

      <div className="space-y-5">
        {/* ── Block 1: Parent ────────────────────────────────────────────────── */}
        <Section title="Родитель *" description="Источник контактных данных семьи">
          {parents.length === 0 ? (
            <div className="flex flex-col items-center py-6 gap-3 text-center">
              <div className="size-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                <UserRound className="size-6 text-slate-400" />
              </div>
              <div>
                <p className="font-medium text-slate-700">Родители не добавлены</p>
                <p className="text-sm text-slate-500 mt-0.5">Сначала создайте родителя в разделе Родители</p>
              </div>
              <Link href="/parents/new"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700">
                + Создать родителя
              </Link>
            </div>
          ) : (
            <>
              <ParentCombobox
                parentId={parentId}
                onChange={(id) => {
                  setParentId(id);
                  if (hasAttempted) setErrors((e) => ({ ...e, parentId: undefined }));
                }}
                parents={parents}
                allStudents={allStudents}
                error={errors.parentId}
                inputRef={parentInputRef}
              />

              {selectedParent && (
                <ParentCard parent={selectedParent} onClear={() => setParentId(undefined)} />
              )}

              {!selectedParent && (
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs text-slate-400">Нет нужного родителя?</span>
                  <a href="/parents/new" target="_blank" rel="noopener noreferrer"
                    className="text-xs text-emerald-600 hover:underline font-medium">
                    + Создать родителя
                  </a>
                </div>
              )}

              {existingFamily && (
                <div className="mt-4">
                  <ExistingFamilyWarning familyId={existingFamily.id} />
                </div>
              )}
            </>
          )}
        </Section>

        {/* ── Block 2: Children + per-student plan ───────────────────────────── */}
        {parentId && !existingFamily && (
          <Section
            title="Дети и формат обучения"
            description="Настройте план для каждого ребёнка отдельно"
            badge={
              parentStudents.length > 0 ? (
                <span className="text-xs font-medium text-slate-500">
                  {selectedStudentIds.length} / {parentStudents.length}
                </span>
              ) : undefined
            }
          >
            {parentStudents.length === 0 ? (
              <div className="flex flex-col items-center py-6 gap-3 text-center">
                <div className="size-10 rounded-xl bg-slate-100 flex items-center justify-center">
                  <Users className="size-5 text-slate-400" />
                </div>
                <div>
                  <p className="font-medium text-slate-700">У этого родителя пока нет учеников</p>
                  <p className="text-sm text-slate-500 mt-0.5">Добавьте ученика и привяжите к этому родителю</p>
                </div>
                <Link href="/students/new"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">
                  Добавить ученика
                </Link>
              </div>
            ) : (
              <>
                {/* Select all / clear */}
                <div className="flex items-center gap-2 mb-3">
                  <button type="button"
                    onClick={() => {
                      const ids = parentStudents.map((s) => s.id);
                      setSelectedStudentIds(ids);
                      setStudentConfigs((prev) => {
                        const next = new Map(prev);
                        ids.forEach((id) => { if (!next.has(id)) next.set(id, defaultConfig()); });
                        return next;
                      });
                    }}
                    className="text-xs font-medium text-emerald-600 hover:underline">
                    Выбрать всех
                  </button>
                  <span className="text-slate-300">·</span>
                  <button type="button"
                    onClick={() => setSelectedStudentIds([])}
                    className="text-xs font-medium text-slate-500 hover:underline">
                    Снять выбор
                  </button>
                </div>

                <div className="space-y-3">
                  {parentStudents.map((s) => {
                    const isSelected = selectedStudentIds.includes(s.id);
                    const initials = s.fullName.slice(0, 2).toUpperCase();
                    return (
                      <div key={s.id}>
                        {/* Checkbox row */}
                        <label className={cn(
                          'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all select-none',
                          isSelected
                            ? 'border-emerald-300 bg-emerald-50 rounded-b-none border-b-0'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        )}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleStudent(s.id)}
                            className="accent-emerald-600 size-4 shrink-0"
                          />
                          <div className="size-8 rounded-full overflow-hidden bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold shrink-0">
                            {s.avatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={s.avatar} alt={s.fullName} className="size-full object-cover" />
                            ) : initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800">{s.fullName}</p>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                              <span>Группа {s.group}</span>
                              <span>·</span>
                              <span>{s.age} лет</span>
                              <span>·</span>
                              <span>{STUDENT_LEVEL_LABELS[s.level as keyof typeof STUDENT_LEVEL_LABELS]}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
                            <Star className="size-3" />{s.totalPoints}
                            {!s.isActive && (
                              <span className="ml-1 px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-400 text-[10px]">неактивен</span>
                            )}
                          </div>
                        </label>

                        {/* Plan config (expands when selected) */}
                        {isSelected && (
                          <StudentPlanRow
                            student={s}
                            config={studentConfigs.get(s.id) ?? defaultConfig()}
                            onChange={(cfg) => updateConfig(s.id, cfg)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                {errors.studentIds && (
                  <p className="text-xs text-red-500 mt-2">{errors.studentIds}</p>
                )}
              </>
            )}
          </Section>
        )}

        {/* ── Block 3: Cost summary ─────────────────────────────────────────── */}
        {selectedStudentIds.length > 0 && !existingFamily && (
          <div className={cn('rounded-2xl p-5 border', PLAN_COLORS[dominantPlan].border, PLAN_COLORS[dominantPlan].light)}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-slate-700">Итого в месяц</p>
                <p className="text-xs text-slate-500 mt-0.5">{selectedStudentIds.length}{' '}
                  {selectedStudentIds.length === 1 ? 'ребёнок' : selectedStudentIds.length < 5 ? 'ребёнка' : 'детей'}
                </p>
              </div>
              <div className="text-right">
                <p className={cn('text-2xl font-bold', PLAN_COLORS[dominantPlan].text)}>
                  {formatAmount(totalAmount)}
                </p>
                <p className="text-xs text-slate-400">в месяц</p>
              </div>
            </div>

            {/* Per-student breakdown */}
            <div className="space-y-1.5 mt-3 pt-3 border-t border-slate-200/60">
              {lessonSelections.map((sel) => {
                const student = allStudents.find((s) => s.id === sel.studentId);
                const c = PLAN_COLORS[sel.planType];
                return (
                  <div key={sel.studentId} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-slate-600">
                      <span className={cn('px-1.5 py-0.5 rounded-md font-medium', c.badge)}>
                        {SUPPORT_PLANS[sel.planType].emoji}
                      </span>
                      <span className="truncate">{student?.fullName ?? sel.studentId}</span>
                      <span className="text-slate-400">{LESSON_TYPE_LABELS[sel.lessonType]}</span>
                    </div>
                    <span className={cn('font-semibold shrink-0', c.text)}>
                      {formatAmount(sel.monthlyAmount)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Block 4: Notes ────────────────────────────────────────────────── */}
        {!existingFamily && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-800 mb-3">Заметки</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Дополнительная информация о поддержке этой семьи..."
              rows={3}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none placeholder:text-slate-400"
            />
          </div>
        )}
      </div>

      {/* ── Sticky bottom bar ──────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-10 bg-white/95 backdrop-blur-sm border-t border-slate-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            {selectedStudentIds.length > 0 && totalAmount > 0 && !existingFamily && (
              <span>
                {selectedStudentIds.length}{' '}
                {selectedStudentIds.length === 1 ? 'ребёнок' : 'детей'}{' '}
                · {formatAmount(totalAmount)}/мес
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/support"
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              Отмена
            </Link>
            {existingFamily ? (
              <Link
                href={`/support/families/${existingFamily.id}`}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors"
              >
                <Users className="size-4" />
                Открыть запись
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-40 transition-colors"
              >
                <Users className="size-4" />
                Создать семью
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
