'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Plus, Search, Users, CheckCircle2, Clock, AlertCircle,
  ChevronRight, Copy, Phone, Star, HeartHandshake, X, Wallet,
  CalendarDays, Check,
} from 'lucide-react';
import {
  useAppStore, useFamilies, useStudents, useFamilyPayments, useParents,
} from '@/store/app-store';
import type { Parent } from '@/entities/parent/model/types';
import {
  SUPPORT_PLANS, PLAN_COLORS, STATUS_COLORS, PAYMENT_STATUS_LABELS, PAYMENT_METHOD_LABELS,
  calculateExpectedPayment, formatAmount, getCurrentMonth, formatMonth,
  getReminderMessage, getThankYouMessage,
} from '@/entities/support/model/helpers';
import type { SupportPlanType, PaymentStatus, PaymentMethod } from '@/entities/support/model/types';
import { cn } from '@/shared/lib/cn';

function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => setH(true), []);
  return h;
}

// ─── Accept Payment Modal ─────────────────────────────────────────────────────

function AcceptPaymentModal({
  familyId, month, onClose,
}: { familyId: string; month: string; onClose: () => void }) {
  const families = useFamilies();
  const familyPayments = useFamilyPayments();
  const students = useStudents();
  const markPaid = useAppStore((s) => s.markFamilyPaymentPaid);

  const family = families.find((f) => f.id === familyId);
  const payment = familyPayments.find((p) => p.familyId === familyId && p.month === month);

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [comment, setComment] = useState('');

  if (!family) return null;

  const expectedAmount = payment?.expectedAmount ?? calculateExpectedPayment(family.supportPlanType, family.studentIds.length);
  const alreadyPaid = payment?.paidAmount ?? 0;
  const remaining = Math.max(0, expectedAmount - alreadyPaid);
  const numAmount = Number(amount);

  function handleSubmit() {
    if (numAmount <= 0) return;
    markPaid(familyId, month, numAmount, method, comment || undefined);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Принять оплату</h2>
            <p className="text-sm text-slate-500">{family.name} · {formatMonth(month)}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="size-5" />
          </button>
        </div>

        {/* Info */}
        {expectedAmount > 0 && (
          <div className="bg-slate-50 rounded-xl p-3 mb-5 flex gap-4 text-sm">
            <div><p className="text-slate-400 text-xs">Ожидается</p><p className="font-semibold text-slate-800">{formatAmount(expectedAmount)}</p></div>
            <div><p className="text-slate-400 text-xs">Оплачено</p><p className="font-semibold text-emerald-600">{formatAmount(alreadyPaid)}</p></div>
            {remaining > 0 && <div><p className="text-slate-400 text-xs">Остаток</p><p className="font-semibold text-amber-600">{formatAmount(remaining)}</p></div>}
          </div>
        )}

        {/* Quick buttons */}
        {expectedAmount > 0 && (
          <div className="flex gap-2 mb-4">
            {remaining > 0 && (
              <button onClick={() => setAmount(String(remaining))}
                className="flex-1 py-2 px-3 rounded-xl border border-emerald-200 text-sm font-medium text-emerald-700 hover:bg-emerald-50">
                Полная сумма ({formatAmount(remaining)})
              </button>
            )}
            <button onClick={() => setAmount(String(Math.ceil(expectedAmount / 2)))}
              className="flex-1 py-2 px-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Половина ({formatAmount(Math.ceil(expectedAmount / 2))})
            </button>
          </div>
        )}

        {/* Amount */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Сумма (сом)</label>
          <input
            type="number" min="0" placeholder="0"
            value={amount} onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 font-medium text-slate-900"
          />
        </div>

        {/* Method */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Способ оплаты</label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((m) => (
              <button key={m} onClick={() => setMethod(m)}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                  method === m
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                )}>
                {PAYMENT_METHOD_LABELS[m]}
              </button>
            ))}
          </div>
        </div>

        {/* Comment */}
        <div className="mb-5">
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Комментарий (необязательно)</label>
          <input type="text" placeholder="Примечание..." value={comment} onChange={(e) => setComment(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Отмена
          </button>
          <button onClick={handleSubmit} disabled={numAmount <= 0}
            className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-40 flex items-center justify-center gap-1.5">
            <Check className="size-4" /> Принять {numAmount > 0 ? formatAmount(numAmount) : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Plan Card ────────────────────────────────────────────────────────────────

function PlanCard({ planType, familyCount }: { planType: SupportPlanType; familyCount: number }) {
  const plan = SUPPORT_PLANS[planType];
  const colors = PLAN_COLORS[planType];
  return (
    <div className={cn('bg-white rounded-2xl border p-5', colors.border)}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-2xl mb-1">{plan.emoji}</div>
          <h3 className="font-bold text-slate-900 text-sm">{plan.name}</h3>
          {plan.monthlyBasePrice && (
            <p className={cn('text-xs font-semibold mt-0.5', colors.text)}>
              от {formatAmount(plan.monthlyBasePrice)}/мес
            </p>
          )}
        </div>
        <span className={cn('text-xs font-medium px-2 py-1 rounded-full', colors.badge)}>
          {familyCount} {familyCount === 1 ? 'семья' : familyCount < 5 ? 'семьи' : 'семей'}
        </span>
      </div>
      <p className="text-xs text-slate-500 mb-3">{plan.description}</p>
      <div className="space-y-1">
        {plan.features.map((f) => (
          <div key={f} className="flex items-center gap-1.5 text-xs text-slate-600">
            <CheckCircle2 className={cn('size-3 shrink-0', colors.text)} />
            {f}
          </div>
        ))}
      </div>
      <p className={cn('mt-3 text-[11px] px-2 py-1.5 rounded-lg', colors.light, colors.text)}>{plan.educationLogic}</p>
    </div>
  );
}

// ─── Copy Message Button ──────────────────────────────────────────────────────

function CopyBtn({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button onClick={handleCopy}
      className={cn('flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors',
        copied ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
      )}>
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? 'Скопировано' : label}
    </button>
  );
}

// ─── Family Card ──────────────────────────────────────────────────────────────

function FamilyCard({
  family, parent, payment, studentNames, month, onAcceptPayment,
}: {
  family: ReturnType<typeof useFamilies>[number];
  parent?: Parent;
  payment: ReturnType<typeof useFamilyPayments>[number] | undefined;
  studentNames: string[];
  month: string;
  onAcceptPayment: (familyId: string) => void;
}) {
  const plan = SUPPORT_PLANS[family.supportPlanType];
  const planColors = PLAN_COLORS[family.supportPlanType];
  const expectedAmount = payment?.expectedAmount ?? calculateExpectedPayment(family.supportPlanType, family.studentIds.length);
  const paidAmount = payment?.paidAmount ?? 0;
  const remaining = Math.max(0, expectedAmount - paidAmount);
  const status = payment?.status ?? (expectedAmount === 0 ? 'paid' : 'unpaid');
  const statusColors = STATUS_COLORS[status];

  const displayName = parent ? parent.fullName : (family.parentName ?? family.name);
  const displayContact = parent ? parent.whatsapp : family.parentPhone;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-bold text-slate-900 truncate">{family.name}</h3>
              <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full shrink-0', planColors.badge)}>
                {plan.emoji} {plan.name}
              </span>
            </div>
            <p className="text-sm text-slate-600">{displayName}</p>
            {displayContact && (
              <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                <Phone className="size-3" />
                {displayContact}
              </div>
            )}
          </div>
          <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full shrink-0', statusColors.badge)}>
            {PAYMENT_STATUS_LABELS[status]}
          </span>
        </div>

        {/* Students */}
        <div className="flex items-center gap-1.5 mb-3">
          <Users className="size-3.5 text-slate-400 shrink-0" />
          <div className="flex gap-1 flex-wrap">
            {studentNames.map((n) => (
              <span key={n} className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md">{n.split(' ')[0]}</span>
            ))}
            {studentNames.length === 0 && <span className="text-xs text-slate-400">Нет учеников</span>}
          </div>
        </div>

        {/* Amounts */}
        {expectedAmount > 0 && (
          <div className="flex gap-3 text-sm mb-4">
            <div className="flex-1 text-center py-2 rounded-xl bg-slate-50">
              <p className="text-[10px] text-slate-400 mb-0.5">Ожидается</p>
              <p className="font-bold text-slate-800">{formatAmount(expectedAmount)}</p>
            </div>
            <div className="flex-1 text-center py-2 rounded-xl bg-emerald-50">
              <p className="text-[10px] text-slate-400 mb-0.5">Оплачено</p>
              <p className="font-bold text-emerald-700">{formatAmount(paidAmount)}</p>
            </div>
            {remaining > 0 && (
              <div className="flex-1 text-center py-2 rounded-xl bg-amber-50">
                <p className="text-[10px] text-slate-400 mb-0.5">Остаток</p>
                <p className="font-bold text-amber-700">{formatAmount(remaining)}</p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          <Link href={`/support/families/${family.id}`}
            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50">
            Открыть <ChevronRight className="size-3" />
          </Link>
          {expectedAmount > 0 && status !== 'paid' && status !== 'overpaid' && (
            <button onClick={() => onAcceptPayment(family.id)}
              className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700">
              <Wallet className="size-3.5" /> Принять оплату
            </button>
          )}
          {status === 'paid' && expectedAmount > 0 && (
            <CopyBtn text={getThankYouMessage(family.name, month)} label="Благодарность" />
          )}
          {(status === 'unpaid' || status === 'partial') && remaining > 0 && (
            <CopyBtn text={getReminderMessage(family.name, remaining, month)} label="Напоминание" />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Widget ──────────────────────────────────────────────────────────────

export function SupportDashboard() {
  const hydrated = useHydrated();
  const families = useFamilies();
  const students = useStudents();
  const parents = useParents();
  const familyPayments = useFamilyPayments();
  const createMonthlyPayments = useAppStore((s) => s.createMonthlyPayments);

  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [statusFilter, setStatusFilter] = useState<'all' | PaymentStatus>('all');
  const [planFilter, setPlanFilter] = useState<'all' | SupportPlanType>('all');
  const [acceptPaymentFamilyId, setAcceptPaymentFamilyId] = useState<string | null>(null);
  const [showPlans, setShowPlans] = useState(false);

  const monthPayments = familyPayments.filter((p) => p.month === selectedMonth);
  const hasMonthPayments = families.every((f) => monthPayments.some((p) => p.familyId === f.id));

  // Summary stats
  const totalFamilies = families.length;
  const paidCount = monthPayments.filter((p) => p.status === 'paid' || p.status === 'overpaid').length;
  const partialCount = monthPayments.filter((p) => p.status === 'partial').length;
  const unpaidCount = families.filter((f) => {
    const p = monthPayments.find((mp) => mp.familyId === f.id);
    return !p ? f.supportPlanType !== 'open_learning' : p.status === 'unpaid';
  }).length;
  const totalExpected = monthPayments.reduce((s, p) => s + p.expectedAmount, 0);
  const totalPaid = monthPayments.reduce((s, p) => s + p.paidAmount, 0);
  const openLearningCount = families.filter((f) => f.supportPlanType === 'open_learning').length;

  // Filter families
  const filtered = families
    .filter((f) => {
      if (search) {
        const q = search.toLowerCase();
        const parent = parents.find((p) => p.id === f.parentId);
        const studentNamesMatch = students.filter((s) => f.studentIds.includes(s.id)).some((s) => s.fullName.toLowerCase().includes(q));
        const parentMatch = parent
          ? parent.fullName.toLowerCase().includes(q) || parent.whatsapp.includes(q) || (parent.phone ?? '').includes(q)
          : false;
        if (
          !f.name.toLowerCase().includes(q) &&
          !(f.parentName ?? '').toLowerCase().includes(q) &&
          !(f.parentPhone ?? '').includes(q) &&
          !parentMatch &&
          !studentNamesMatch
        ) return false;
      }
      if (planFilter !== 'all' && f.supportPlanType !== planFilter) return false;
      if (statusFilter !== 'all') {
        const p = monthPayments.find((mp) => mp.familyId === f.id);
        const status = p?.status ?? (calculateExpectedPayment(f.supportPlanType, f.studentIds.length) === 0 ? 'paid' : 'unpaid');
        if (status !== statusFilter) return false;
      }
      return true;
    });

  const planCounts = families.reduce((acc, f) => {
    acc[f.supportPlanType] = (acc[f.supportPlanType] ?? 0) + 1;
    return acc;
  }, {} as Record<SupportPlanType, number>);

  if (!hydrated) return (
    <div className="p-6 max-w-7xl mx-auto animate-pulse space-y-4">
      <div className="h-8 w-48 bg-slate-100 rounded-xl" />
      <div className="grid grid-cols-3 gap-4">{Array(6).fill(0).map((_, i) => <div key={i} className="h-20 bg-slate-100 rounded-2xl" />)}</div>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Поддержка</h1>
          <p className="text-sm text-slate-500 mt-0.5">Учёт взносов, семей и форматов обучения</p>
        </div>
        <Link href="/support/families/new"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700">
          <Plus className="size-4" /> Добавить семью
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: 'Семей', value: totalFamilies, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Оплачено', value: paidCount, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Частично', value: partialCount, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Не оплачено', value: unpaidCount, icon: AlertCircle, color: 'text-slate-500', bg: 'bg-slate-100' },
          { label: 'Собрано', value: formatAmount(totalPaid), icon: Wallet, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Открытый формат', value: openLearningCount, icon: HeartHandshake, color: 'text-slate-500', bg: 'bg-slate-100' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-2">
            <div className={cn('size-8 rounded-lg flex items-center justify-center', bg)}>
              <Icon className={cn('size-4', color)} />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900 leading-none">{value}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Month selector + Create payments */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
          <CalendarDays className="size-4 text-slate-400" />
          <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-sm font-medium text-slate-700 focus:outline-none bg-transparent" />
        </div>
        {!hasMonthPayments && families.length > 0 && (
          <button onClick={() => createMonthlyPayments(selectedMonth)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800">
            <Plus className="size-4" /> Создать начисления за {formatMonth(selectedMonth).toLowerCase()}
          </button>
        )}
        {hasMonthPayments && totalExpected > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm">
            <span className="text-slate-500">Ожидается:</span>
            <span className="font-bold text-slate-800">{formatAmount(totalExpected)}</span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-500">Собрано:</span>
            <span className="font-bold text-emerald-700">{formatAmount(totalPaid)}</span>
          </div>
        )}
        <button onClick={() => setShowPlans((v) => !v)}
          className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">
          {showPlans ? 'Скрыть форматы' : 'Форматы обучения'}
        </button>
      </div>

      {/* Plan cards */}
      {showPlans && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {(Object.keys(SUPPORT_PLANS) as SupportPlanType[]).map((type) => (
            <PlanCard key={type} planType={type} familyCount={planCounts[type] ?? 0} />
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input type="text" placeholder="Семья, родитель, ученик..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
        </div>
        <div className="flex rounded-xl border border-slate-200 overflow-hidden text-xs font-medium">
          {(['all', 'paid', 'partial', 'unpaid'] as const).map((v) => (
            <button key={v} onClick={() => setStatusFilter(v)}
              className={cn('px-3 py-2 transition-colors', statusFilter === v ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-50')}>
              {v === 'all' ? 'Все' : PAYMENT_STATUS_LABELS[v as PaymentStatus]}
            </button>
          ))}
        </div>
        <div className="flex rounded-xl border border-slate-200 overflow-hidden text-xs font-medium">
          {(['all', ...Object.keys(SUPPORT_PLANS)] as const).map((v) => (
            <button key={v} onClick={() => setPlanFilter(v as 'all' | SupportPlanType)}
              className={cn('px-3 py-2 transition-colors whitespace-nowrap', planFilter === v ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-50')}>
              {v === 'all' ? 'Все планы' : SUPPORT_PLANS[v as SupportPlanType].emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Family cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="size-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <HeartHandshake className="size-8 text-slate-400" />
          </div>
          <h3 className="font-semibold text-slate-700 mb-1">{families.length === 0 ? 'Семей пока нет' : 'Ничего не найдено'}</h3>
          <p className="text-sm text-slate-400">
            {families.length === 0 ? 'Добавьте первую семью, чтобы начать учёт' : 'Попробуйте изменить фильтры'}
          </p>
          {families.length === 0 && (
            <Link href="/support/families/new"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700">
              <Plus className="size-4" /> Добавить семью
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((family) => {
            const payment = monthPayments.find((p) => p.familyId === family.id);
            const familyStudents = students.filter((s) => family.studentIds.includes(s.id));
            const parent = parents.find((p) => p.id === family.parentId);
            return (
              <FamilyCard
                key={family.id}
                family={family}
                parent={parent}
                payment={payment}
                studentNames={familyStudents.map((s) => s.fullName)}
                month={selectedMonth}
                onAcceptPayment={setAcceptPaymentFamilyId}
              />
            );
          })}
        </div>
      )}

      {/* Accept payment modal */}
      {acceptPaymentFamilyId && (
        <AcceptPaymentModal
          familyId={acceptPaymentFamilyId}
          month={selectedMonth}
          onClose={() => setAcceptPaymentFamilyId(null)}
        />
      )}
    </div>
  );
}
