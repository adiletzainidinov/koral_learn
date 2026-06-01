'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Users, Check, AlertTriangle, MessageCircle, Phone, Send,
  AtSign, MapPin, UserRound, X, Search, Star,
} from 'lucide-react';
import { useAppStore, useParents, useStudents } from '@/store/app-store';
import {
  SUPPORT_PLANS, PLAN_COLORS, calculateExpectedPayment, formatAmount,
} from '@/entities/support/model/helpers';
import type { SupportPlanType } from '@/entities/support/model/types';
import type { Parent } from '@/entities/parent/model/types';
import { formatWhatsappLink, formatTelegramLink, formatInstagramLink } from '@/entities/parent/model/helpers';
import { STUDENT_LEVEL_LABELS } from '@/entities/student/model/types';
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
  const [planType, setPlanType] = useState<SupportPlanType>('family_support');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [hasAttempted, setHasAttempted] = useState(false);

  const parentInputRef = useRef<HTMLInputElement | null>(null);

  const selectedParent = useMemo(
    () => parents.find((p) => p.id === parentId),
    [parents, parentId]
  );

  // Students belonging to the selected parent
  const parentStudents = useMemo(
    () => (parentId ? allStudents.filter((s) => s.parentId === parentId) : []),
    [allStudents, parentId]
  );

  // When parent changes, reset student selection to all children of that parent
  useEffect(() => {
    setSelectedStudentIds(parentStudents.map((s) => s.id));
  }, [parentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const expectedAmount = calculateExpectedPayment(planType, selectedStudentIds.length);
  const isPrivateGroup = planType === 'private_group';
  const warnPrivateGroup = isPrivateGroup && selectedStudentIds.length > 5;

  function validate(): boolean {
    const errs: FormErrors = {};
    if (!parentId) errs.parentId = 'Выберите родителя';
    if (selectedStudentIds.length === 0) errs.studentIds = 'Выберите хотя бы одного ребёнка';
    setErrors(errs);
    if (errs.parentId) { parentInputRef.current?.focus(); return false; }
    return Object.keys(errs).length === 0;
  }

  function toggleStudent(id: string) {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
    if (hasAttempted) setErrors((e) => ({ ...e, studentIds: undefined }));
  }

  function handleSubmit() {
    setHasAttempted(true);
    if (!validate() || !parentId || submitting) return;
    setSubmitting(true);
    const id = createFamily({
      parentId,
      studentIds: selectedStudentIds,
      supportPlanType: planType,
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
          <p className="text-sm text-slate-500">Выберите родителя и детей для учёта поддержки</p>
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
        <Section
          title="Родитель *"
          description="Источник контактных данных семьи"
        >
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
            </>
          )}
        </Section>

        {/* ── Block 2: Children ──────────────────────────────────────────────── */}
        {parentId && (
          <Section
            title="Дети родителя"
            description="Выберите учеников, входящих в эту запись поддержки"
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
                    onClick={() => setSelectedStudentIds(parentStudents.map((s) => s.id))}
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

                <div className="space-y-2">
                  {parentStudents.map((s) => {
                    const isSelected = selectedStudentIds.includes(s.id);
                    const initials = s.fullName.slice(0, 2).toUpperCase();
                    return (
                      <label key={s.id}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all select-none',
                          isSelected
                            ? 'border-emerald-300 bg-emerald-50'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        )}
                      >
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
                            <span>{STUDENT_LEVEL_LABELS[s.level]}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
                          <Star className="size-3" />{s.totalPoints}
                          {!s.isActive && (
                            <span className="ml-1 px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-400 text-[10px]">неактивен</span>
                          )}
                        </div>
                      </label>
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

        {/* ── Block 3: Support plan ──────────────────────────────────────────── */}
        <Section title="Формат обучения" description="Выберите тип поддержки для этой семьи">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(Object.keys(SUPPORT_PLANS) as SupportPlanType[]).map((type) => {
              const plan = SUPPORT_PLANS[type];
              const colors = PLAN_COLORS[type];
              const isActive = planType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setPlanType(type)}
                  className={cn(
                    'text-left p-4 rounded-2xl border-2 transition-all',
                    isActive ? `${colors.border} ${colors.light}` : 'border-transparent bg-slate-50 hover:border-slate-200'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span>{plan.emoji}</span>
                      <span className="font-semibold text-sm text-slate-800">{plan.name}</span>
                    </div>
                    {isActive && <Check className={cn('size-4', colors.text)} />}
                  </div>
                  <p className="text-xs text-slate-500 mb-1.5">{plan.educationLogic}</p>
                  {type !== 'open_learning' && plan.monthlyBasePrice && (
                    <p className={cn('text-xs font-semibold', colors.text)}>
                      от {formatAmount(plan.monthlyBasePrice)}/мес
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </Section>

        {/* ── Block 4: Cost calculation ──────────────────────────────────────── */}
        {selectedStudentIds.length > 0 && (
          <div className={cn('rounded-2xl p-5 border', PLAN_COLORS[planType].border, PLAN_COLORS[planType].light)}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-slate-700">Расчёт суммы</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {SUPPORT_PLANS[planType].emoji} {SUPPORT_PLANS[planType].name}
                  {' · '}
                  {selectedStudentIds.length}{' '}
                  {selectedStudentIds.length === 1 ? 'ребёнок' : selectedStudentIds.length < 5 ? 'ребёнка' : 'детей'}
                </p>
              </div>
              <div className="text-right">
                <p className={cn('text-2xl font-bold', PLAN_COLORS[planType].text)}>
                  {formatAmount(expectedAmount)}
                </p>
                <p className="text-xs text-slate-400">в месяц</p>
              </div>
            </div>
            <p className={cn('text-xs px-3 py-2 rounded-lg', PLAN_COLORS[planType].light, PLAN_COLORS[planType].text)}>
              {SUPPORT_PLANS[planType].educationLogic}
            </p>
            {warnPrivateGroup && (
              <div className="flex items-center gap-2 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertTriangle className="size-4 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-700">
                  Для индивидуальной группы рекомендуется до 5 учеников.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Block 5: Notes ────────────────────────────────────────────────── */}
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
      </div>

      {/* ── Sticky bottom bar ──────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-10 bg-white/95 backdrop-blur-sm border-t border-slate-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            {selectedStudentIds.length > 0 && planType !== 'open_learning' && (
              <span>
                {selectedStudentIds.length}{' '}
                {selectedStudentIds.length === 1 ? 'ребёнок' : 'детей'}{' '}
                · {formatAmount(expectedAmount)}/мес
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/support"
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              Отмена
            </Link>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-40 transition-colors"
            >
              <Users className="size-4" />
              Создать семью
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
