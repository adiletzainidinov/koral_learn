'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Users, Wallet, CheckCircle2, Clock, AlertCircle,
  Plus, Trash2, Phone, Edit2, X, Check, Copy, ChevronRight,
  Star, MoreVertical, MessageCircle, UserRound, BookOpen,
} from 'lucide-react';
import {
  useAppStore, useFamilyById, useStudents, useFamilyPaymentsByFamilyId,
  usePaymentHistoryByFamilyId, useFamilyParent, useParents,
} from '@/store/app-store';
import { formatWhatsappLink } from '@/entities/parent/model/helpers';
import {
  SUPPORT_PLANS, PLAN_COLORS, STATUS_COLORS, PAYMENT_STATUS_LABELS, PAYMENT_METHOD_LABELS,
  calculateFamilyExpectedAmount, getSelectionAmount,
  formatAmount, getCurrentMonth, formatMonth,
  getReminderMessage, getThankYouMessage,
} from '@/entities/support/model/helpers';
import type { SupportPlanType, PaymentMethod, LessonSelection, LessonType } from '@/entities/support/model/types';
import { generateId } from '@/shared/lib/ids';
import { cn } from '@/shared/lib/cn';

function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => setH(true), []);
  return h;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Accept Payment Modal ─────────────────────────────────────────────────────

function AcceptPaymentModal({
  familyId, month, expectedAmount, paidAmount, onClose,
}: {
  familyId: string;
  month: string;
  expectedAmount: number;
  paidAmount: number;
  onClose: () => void;
}) {
  const markPaid = useAppStore((s) => s.markFamilyPaymentPaid);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [comment, setComment] = useState('');

  const remaining = Math.max(0, expectedAmount - paidAmount);
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
            <p className="text-sm text-slate-500">{formatMonth(month)}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="size-5" /></button>
        </div>

        {expectedAmount > 0 && (
          <div className="bg-slate-50 rounded-xl p-3 mb-4 flex gap-4 text-sm">
            <div><p className="text-xs text-slate-400">Ожидается</p><p className="font-semibold">{formatAmount(expectedAmount)}</p></div>
            <div><p className="text-xs text-slate-400">Оплачено</p><p className="font-semibold text-emerald-600">{formatAmount(paidAmount)}</p></div>
            {remaining > 0 && <div><p className="text-xs text-slate-400">Остаток</p><p className="font-semibold text-amber-600">{formatAmount(remaining)}</p></div>}
          </div>
        )}

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
              Половина
            </button>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Сумма (сом)</label>
          <input type="number" min="0" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 font-medium" />
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Способ оплаты</label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((m) => (
              <button key={m} onClick={() => setMethod(m)}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                  method === m ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                )}>
                {PAYMENT_METHOD_LABELS[m]}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Комментарий</label>
          <input type="text" placeholder="Примечание..." value={comment} onChange={(e) => setComment(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Отмена</button>
          <button onClick={handleSubmit} disabled={numAmount <= 0}
            className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-40 flex items-center justify-center gap-1.5">
            <Check className="size-4" /> Принять {numAmount > 0 ? formatAmount(numAmount) : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Family Modal ────────────────────────────────────────────────────────

function EditFamilyModal({ familyId, onClose }: { familyId: string; onClose: () => void }) {
  const family = useFamilyById(familyId);
  const parents = useParents();
  const updateFamily = useAppStore((s) => s.updateFamily);

  const [notes, setNotes] = useState(family?.notes ?? '');

  if (!family) return null;

  function handleSave() {
    updateFamily(familyId, { notes: notes.trim() || undefined });
    onClose();
  }

  const parent = parents.find((p) => p.id === family.parentId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-900">Редактировать семью</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="size-5" /></button>
        </div>
        <div className="space-y-4">
          {parent && (
            <div className="px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
              <UserRound className="size-4 text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{parent.fullName}</p>
                <p className="text-xs text-slate-500">{parent.whatsapp}</p>
              </div>
              <Link href={`/parents/${parent.id}`}
                className="ml-auto text-xs text-emerald-600 hover:underline font-medium shrink-0">
                Открыть
              </Link>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Заметки</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              placeholder="Дополнительная информация о поддержке..."
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none placeholder:text-slate-400" />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Отмена</button>
          <button onClick={handleSave}
            className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700">
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Copy Button ──────────────────────────────────────────────────────────────

function CopyBtn({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className={cn('flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors',
        copied ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
      )}>
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? 'Скопировано' : label}
    </button>
  );
}

// ─── Add Student Modal ────────────────────────────────────────────────────────

function AddStudentModal({ familyId, currentStudentIds, onClose }: { familyId: string; currentStudentIds: string[]; onClose: () => void }) {
  const students = useStudents();
  const families = useAppStore((s) => s.families);
  const assignStudent = useAppStore((s) => s.assignStudentToFamily);

  const available = students.filter((s) => {
    const inThisFamily = currentStudentIds.includes(s.id);
    if (inThisFamily) return false;
    return true;
  });

  function handleAdd(studentId: string) {
    assignStudent(familyId, studentId);
    onClose();
  }

  const otherFamily = (studentId: string) => families.find((f) => f.id !== familyId && f.studentIds.includes(studentId));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Добавить ученика</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="size-5" /></button>
        </div>
        {available.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">Все ученики уже добавлены</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {available.map((s) => {
              const of = otherFamily(s.id);
              return (
                <button key={s.id} onClick={() => handleAdd(s.id)}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-left transition-colors">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{s.fullName}</p>
                    {of && <p className="text-xs text-amber-600 mt-0.5">Будет перенесён из «{of.name}»</p>}
                  </div>
                  <ChevronRight className="size-4 text-slate-400" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Lessons Tab ─────────────────────────────────────────────────────────────

const PLAN_ORDER_DETAIL: SupportPlanType[] = ['open_learning', 'family_support', 'focused_learning', 'private_group', 'custom'];

function LessonsTab({
  family,
  familyStudents,
  onSave,
}: {
  family: ReturnType<typeof useFamilyById>;
  familyStudents: ReturnType<typeof useStudents>;
  onSave: (selections: LessonSelection[]) => void;
}) {
  if (!family) return null;

  const initSelections = (): Map<string, { lessonType: LessonType; planType: SupportPlanType; monthlyAmount: number }> => {
    const m = new Map<string, { lessonType: LessonType; planType: SupportPlanType; monthlyAmount: number }>();
    for (const s of familyStudents) {
      const existing = family.lessonSelections?.find((ls) => ls.studentId === s.id);
      m.set(s.id, existing
        ? { lessonType: existing.lessonType, planType: existing.planType, monthlyAmount: existing.monthlyAmount }
        : { lessonType: 'quran_group', planType: family.supportPlanType, monthlyAmount: getSelectionAmount(family.supportPlanType) }
      );
    }
    return m;
  };

  const [configs, setConfigs] = useState<Map<string, { lessonType: LessonType; planType: SupportPlanType; monthlyAmount: number }>>(initSelections);
  const [saved, setSaved] = useState(false);

  function updateConfig(studentId: string, patch: Partial<{ lessonType: LessonType; planType: SupportPlanType; monthlyAmount: number }>) {
    setConfigs((prev) => {
      const next = new Map(prev);
      const old = next.get(studentId) ?? { lessonType: 'quran_group' as LessonType, planType: 'family_support' as SupportPlanType, monthlyAmount: 1000 };
      const updated = { ...old, ...patch };
      if (patch.planType && patch.planType !== 'custom') {
        updated.monthlyAmount = getSelectionAmount(patch.planType);
      }
      next.set(studentId, updated);
      return next;
    });
    setSaved(false);
  }

  function handleSave() {
    const selections: LessonSelection[] = familyStudents.map((s) => {
      const cfg = configs.get(s.id) ?? { lessonType: 'quran_group' as LessonType, planType: 'family_support' as SupportPlanType, monthlyAmount: 1000 };
      return {
        id: family?.lessonSelections?.find((ls) => ls.studentId === s.id)?.id ?? generateId(),
        studentId: s.id,
        lessonType: cfg.lessonType,
        planType: cfg.planType,
        monthlyAmount: cfg.planType === 'custom' ? cfg.monthlyAmount : getSelectionAmount(cfg.planType),
        isActive: true,
      };
    });
    onSave(selections);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (familyStudents.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-50 rounded-2xl">
        <BookOpen className="size-8 text-slate-300 mx-auto mb-2" />
        <p className="text-slate-500 text-sm">Нет учеников — добавьте их во вкладке «Дети»</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {familyStudents.map((s) => {
        const cfg = configs.get(s.id) ?? { lessonType: 'quran_group' as LessonType, planType: 'family_support' as SupportPlanType, monthlyAmount: 1000 };
        const c = PLAN_COLORS[cfg.planType];
        const initials = s.fullName.slice(0, 2).toUpperCase();
        return (
          <div key={s.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {/* Student row */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
              <div className="size-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-bold shrink-0">
                {s.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.avatar} alt={s.fullName} className="size-full object-cover rounded-full" />
                ) : initials}
              </div>
              <div className="flex-1 min-w-0">
                <Link href={`/students/${s.id}`} className="text-sm font-medium text-slate-800 hover:text-emerald-700 hover:underline">
                  {s.fullName}
                </Link>
                <p className="text-xs text-slate-400">Группа {s.group} · {s.age} лет</p>
              </div>
              <div className={cn('px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0', c.badge)}>
                {formatAmount(cfg.planType === 'custom' ? cfg.monthlyAmount : getSelectionAmount(cfg.planType))}
              </div>
            </div>
            {/* Config */}
            <div className="p-3 space-y-2">
              {/* Plan buttons */}
              <div className="flex flex-wrap gap-1.5">
                {PLAN_ORDER_DETAIL.map((pt) => {
                  const plan = SUPPORT_PLANS[pt];
                  const pc = PLAN_COLORS[pt];
                  const isActive = cfg.planType === pt;
                  return (
                    <button key={pt} type="button"
                      onClick={() => updateConfig(s.id, { planType: pt })}
                      className={cn(
                        'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all',
                        isActive ? `${pc.badge} border-transparent` : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'
                      )}>
                      <span>{plan.emoji}</span><span>{plan.name}</span>
                    </button>
                  );
                })}
              </div>
              {/* Custom amount for Особый формат */}
              {cfg.planType === 'custom' && (
                <div className="flex items-center gap-1">
                  <input
                    type="number" min="0" step="100"
                    value={cfg.monthlyAmount}
                    onChange={(e) => updateConfig(s.id, { monthlyAmount: Number(e.target.value) || 0 })}
                    className="w-24 h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <span className="text-xs text-slate-400">сом/мес</span>
                </div>
              )}
            </div>
          </div>
        );
      })}

      <button
        onClick={handleSave}
        className={cn(
          'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors',
          saved
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-emerald-600 text-white hover:bg-emerald-700'
        )}>
        {saved ? <><Check className="size-4" />Сохранено</> : <>Сохранить настройки</>}
      </button>
    </div>
  );
}

// ─── Main Widget ──────────────────────────────────────────────────────────────

export function FamilyDetail({ familyId }: { familyId: string }) {
  const hydrated = useHydrated();
  const router = useRouter();
  const family = useFamilyById(familyId);
  const parent = useFamilyParent(familyId);
  const students = useStudents();
  const payments = useFamilyPaymentsByFamilyId(familyId);
  const history = usePaymentHistoryByFamilyId(familyId);
  const { deleteFamily, removeStudentFromFamily, deleteFamilyPayment, updateFamilyLessonSelections } = useAppStore();

  const [tab, setTab] = useState<'children' | 'lessons' | 'payments' | 'history'>('children');
  const [acceptPaymentMonth, setAcceptPaymentMonth] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  if (!hydrated) return (
    <div className="p-6 max-w-4xl mx-auto animate-pulse space-y-4">
      <div className="h-8 w-48 bg-slate-100 rounded-xl" />
      <div className="h-32 bg-slate-100 rounded-2xl" />
    </div>
  );

  if (!family) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="size-14 rounded-2xl bg-slate-100 flex items-center justify-center">
          <Users className="size-6 text-slate-400" />
        </div>
        <p className="font-semibold text-slate-700">Семья не найдена</p>
        <Link href="/support" className="text-sm text-emerald-600 hover:underline">← Все семьи</Link>
      </div>
    );
  }

  const plan = SUPPORT_PLANS[family.supportPlanType];
  const planColors = PLAN_COLORS[family.supportPlanType];
  const familyStudents = students.filter((s) => family.studentIds.includes(s.id));
  const currentMonth = getCurrentMonth();
  const currentPayment = payments.find((p) => p.month === currentMonth);
  const expectedAmount = currentPayment?.expectedAmount ?? calculateFamilyExpectedAmount(family);
  const paidAmount = currentPayment?.paidAmount ?? 0;
  const remaining = Math.max(0, expectedAmount - paidAmount);
  const currentStatus = currentPayment?.status ?? (expectedAmount === 0 ? 'paid' : 'unpaid');
  const statusColors = STATUS_COLORS[currentStatus];

  const acceptingPayment = acceptPaymentMonth
    ? payments.find((p) => p.month === acceptPaymentMonth)
    : null;
  const acceptingExpected = acceptingPayment?.expectedAmount ?? expectedAmount;
  const acceptingPaid = acceptingPayment?.paidAmount ?? 0;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Link href="/support" className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50">
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900">{family.name}</h1>
              <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full', planColors.badge)}>
                {plan.emoji} {plan.name}
              </span>
              <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full', statusColors.badge)}>
                {PAYMENT_STATUS_LABELS[currentStatus]}
              </span>
            </div>
            {(parent || family.parentName) && (
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="text-sm text-slate-600">
                  {parent ? parent.fullName : family.parentName}
                </span>
                {(parent?.whatsapp || family.parentPhone) && (
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Phone className="size-3" />
                    {parent?.whatsapp ?? family.parentPhone}
                  </div>
                )}
                {parent && (
                  <div className="flex items-center gap-2">
                    <a href={formatWhatsappLink(parent.whatsapp)} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition-colors">
                      <MessageCircle className="size-3" />WA
                    </a>
                    <Link href={`/parents/${parent.id}`}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium hover:bg-slate-200 transition-colors">
                      <UserRound className="size-3" />Открыть
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {expectedAmount > 0 && currentStatus !== 'paid' && currentStatus !== 'overpaid' && (
            <button onClick={() => setAcceptPaymentMonth(currentMonth)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700">
              <Wallet className="size-4" /> Принять оплату
            </button>
          )}
          <div className="relative">
            <button onClick={() => setShowDropdown((v) => !v)}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50">
              <MoreVertical className="size-4" />
            </button>
            {showDropdown && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl border border-slate-200 shadow-lg z-20 py-1" onClick={() => setShowDropdown(false)}>
                <button onClick={() => setShowEdit(true)}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 text-left">
                  <Edit2 className="size-4" /> Редактировать
                </button>
                <div className="h-px bg-slate-100 my-1" />
                <button onClick={() => setShowDelete(true)}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 text-left">
                  <Trash2 className="size-4" /> Удалить семью
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Учеников', value: familyStudents.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Ожидается', value: formatAmount(expectedAmount), icon: AlertCircle, color: 'text-slate-500', bg: 'bg-slate-100' },
          { label: 'Оплачено', value: formatAmount(paidAmount), icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Остаток', value: remaining > 0 ? formatAmount(remaining) : '—', icon: Clock, color: remaining > 0 ? 'text-amber-600' : 'text-slate-400', bg: remaining > 0 ? 'bg-amber-50' : 'bg-slate-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
            <div className={cn('size-9 rounded-xl flex items-center justify-center', bg)}>
              <Icon className={cn('size-4', color)} />
            </div>
            <div>
              <p className="text-xs text-slate-400">{label}</p>
              <p className="font-bold text-slate-900 text-sm">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Copy messages */}
      {expectedAmount > 0 && (
        <div className="flex gap-2 mb-5 flex-wrap">
          {(currentStatus === 'unpaid' || currentStatus === 'partial') && remaining > 0 && (
            <CopyBtn text={getReminderMessage(family.name, remaining, currentMonth)} label="Скопировать напоминание" />
          )}
          {(currentStatus === 'paid' || currentStatus === 'overpaid') && (
            <CopyBtn text={getThankYouMessage(family.name, currentMonth)} label="Скопировать благодарность" />
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0.5 bg-slate-100 rounded-xl p-1 mb-5 w-fit">
        {([
          { key: 'children', label: `Дети (${familyStudents.length})` },
          { key: 'lessons', label: 'Уроки' },
          { key: 'payments', label: `Оплаты (${payments.length})` },
          { key: 'history', label: `История (${history.length})` },
        ] as const).map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              tab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}>
            {label}
          </button>
        ))}
      </div>

      {/* Children tab */}
      {tab === 'children' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-slate-800">Ученики семьи</h2>
            <button onClick={() => setShowAddStudent(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">
              <Plus className="size-4" /> Добавить
            </button>
          </div>
          {familyStudents.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-2xl">
              <p className="text-slate-500 text-sm">Нет учеников</p>
              <button onClick={() => setShowAddStudent(true)} className="mt-3 text-sm text-emerald-600 hover:underline">Добавить ученика</button>
            </div>
          ) : (
            familyStudents.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200">
                <div>
                  <Link href={`/students/${s.id}`} className="font-medium text-slate-900 hover:text-emerald-700 hover:underline">{s.fullName}</Link>
                  <div className="flex gap-2 mt-0.5">
                    <span className="text-xs text-slate-400">Группа {s.group}</span>
                    <span className="text-xs text-slate-300">·</span>
                    <span className="text-xs text-slate-400">{s.level}</span>
                    <span className="text-xs text-slate-300">·</span>
                    <span className="text-xs text-slate-400 flex items-center gap-0.5"><Star className="size-2.5" />{s.totalPoints}</span>
                  </div>
                </div>
                <button onClick={() => removeStudentFromFamily(familyId, s.id)}
                  title="Убрать из семьи"
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                  <X className="size-4" />
                </button>
              </div>
            ))
          )}

        </div>
      )}

      {/* Lessons tab */}
      {tab === 'lessons' && (
        <LessonsTab
          family={family}
          familyStudents={familyStudents}
          onSave={(selections) => updateFamilyLessonSelections(familyId, selections)}
        />
      )}

      {/* Payments tab */}
      {tab === 'payments' && (
        <div className="space-y-3">
          {payments.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-2xl">
              <p className="text-slate-500 text-sm">Нет начислений</p>
            </div>
          ) : (
            payments.map((p) => {
              const sc = STATUS_COLORS[p.status];
              const rem = Math.max(0, p.expectedAmount - p.paidAmount);
              return (
                <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="font-semibold text-slate-800">{formatMonth(p.month)}</p>
                      {p.paymentMethod && <p className="text-xs text-slate-400 mt-0.5">{PAYMENT_METHOD_LABELS[p.paymentMethod]}{p.comment ? ` · ${p.comment}` : ''}</p>}
                    </div>
                    <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full shrink-0', sc.badge)}>
                      {PAYMENT_STATUS_LABELS[p.status]}
                    </span>
                  </div>
                  <div className="flex gap-4 text-sm mb-3">
                    {p.expectedAmount > 0 && <span className="text-slate-500">Начислено: <span className="font-medium text-slate-800">{formatAmount(p.expectedAmount)}</span></span>}
                    <span className="text-slate-500">Оплачено: <span className="font-semibold text-emerald-700">{formatAmount(p.paidAmount)}</span></span>
                    {rem > 0 && <span className="text-slate-500">Остаток: <span className="font-semibold text-amber-600">{formatAmount(rem)}</span></span>}
                  </div>
                  <div className="flex gap-2">
                    {(p.status === 'unpaid' || p.status === 'partial') && (
                      <button onClick={() => setAcceptPaymentMonth(p.month)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700">
                        <Wallet className="size-3.5" /> Принять оплату
                      </button>
                    )}
                    <button onClick={() => deleteFamilyPayment(p.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-400 hover:bg-red-50 hover:border-red-200 hover:text-red-500">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* History tab */}
      {tab === 'history' && (
        <div className="space-y-2">
          {history.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-2xl">
              <p className="text-slate-500 text-sm">История пуста</p>
            </div>
          ) : (
            history.map((h) => {
              const actionLabels: Record<string, string> = {
                created: 'Начислено',
                updated: 'Обновлено',
                paid: 'Оплачено',
                partial_paid: 'Частично оплачено',
                refund: 'Возврат',
              };
              const actionColors: Record<string, string> = {
                created: 'text-blue-600',
                updated: 'text-slate-600',
                paid: 'text-emerald-600',
                partial_paid: 'text-amber-600',
                refund: 'text-red-500',
              };
              return (
                <div key={h.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={cn('text-sm font-medium', actionColors[h.action] ?? 'text-slate-700')}>
                        {actionLabels[h.action] ?? h.action}
                      </span>
                      {h.amount > 0 && <span className="font-bold text-slate-800 text-sm">{formatAmount(h.amount)}</span>}
                    </div>
                    {h.comment && <p className="text-xs text-slate-400 mt-0.5">{h.comment}</p>}
                  </div>
                  <p className="text-xs text-slate-400 shrink-0">{fmtDate(h.createdAt)}</p>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Delete confirm */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowDelete(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="size-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="size-5 text-red-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Удалить семью?</h2>
                <p className="text-sm text-slate-500">Это действие нельзя отменить</p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 mb-4">
              <p className="font-semibold text-slate-800">{family.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {familyStudents.length} {familyStudents.length === 1 ? 'ученик' : 'учеников'} · {payments.length} платежей
              </p>
            </div>
            <p className="text-sm text-slate-500 mb-5">Семья будет удалена, но ученики останутся в системе. История оплат будет удалена.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDelete(false)} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Отмена</button>
              <button onClick={() => { deleteFamily(familyId); router.push('/support'); }}
                className="flex-1 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 flex items-center justify-center gap-1.5">
                <Trash2 className="size-4" /> Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {acceptPaymentMonth && (
        <AcceptPaymentModal
          familyId={familyId}
          month={acceptPaymentMonth}
          expectedAmount={acceptingExpected}
          paidAmount={acceptingPaid}
          onClose={() => setAcceptPaymentMonth(null)}
        />
      )}
      {showEdit && <EditFamilyModal familyId={familyId} onClose={() => setShowEdit(false)} />}
      {showAddStudent && <AddStudentModal familyId={familyId} currentStudentIds={family.studentIds} onClose={() => setShowAddStudent(false)} />}
    </div>
  );
}
