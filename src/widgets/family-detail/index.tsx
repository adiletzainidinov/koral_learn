'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Users, Wallet, CheckCircle2, Clock, AlertCircle,
  Trash2, Phone, Edit2, X, Check, Copy,
  MoreVertical, MessageCircle, UserRound, BookOpen, Award, Gift,
  PiggyBank, ChevronDown,
} from 'lucide-react';
import {
  useAppStore, useFamilyById, useStudents, useFamilyPaymentsByFamilyId,
  usePaymentHistoryByFamilyId, useFamilyParent, useParents,
  useSupportPaymentsByFamilyId,
} from '@/store/app-store';
import { formatWhatsappLink } from '@/entities/parent/model/helpers';
import {
  SUPPORT_PLANS, PLAN_COLORS, STATUS_COLORS, PAYMENT_STATUS_LABELS, PAYMENT_METHOD_LABELS,
  calculateFamilyExpectedAmount, getSelectionAmount,
  formatAmount, getCurrentMonth, formatMonth,
  getReminderMessage, getThankYouMessage,
  getStudentMonthPaid, distributeAmongStudents,
  calculateAvailableAdvance, calculatePaidForMonth, calculateGiftTotal,
  calculateUsedAdvanceFromPayment,
} from '@/entities/support/model/helpers';
import type {
  SupportPlanType, PaymentMethod, LessonSelection, LessonType,
  SupportPayment, CreateSupportPaymentInput, OverpaymentType, ApplyAdvanceInput,
} from '@/entities/support/model/types';
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

function getMonthOptions(currentMonth: string) {
  const [y, m] = currentMonth.split('-').map(Number);
  const options: { value: string; label: string }[] = [];
  for (let i = -2; i <= 1; i++) {
    let mo = m + i;
    let yr = y;
    if (mo < 1) { mo += 12; yr--; }
    if (mo > 12) { mo -= 12; yr++; }
    const val = `${yr}-${String(mo).padStart(2, '0')}`;
    options.push({ value: val, label: formatMonth(val) });
  }
  return options;
}

// ─── Edit Family Modal ────────────────────────────────────────────────────────

function EditFamilyModal({ familyId, onClose }: { familyId: string; onClose: () => void }) {
  const family = useFamilyById(familyId);
  const parents = useParents();
  const updateFamily = useAppStore((s) => s.updateFamily);
  const [notes, setNotes] = useState(family?.notes ?? '');
  if (!family) return null;
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
              <Link href={`/parents/${parent.id}`} className="ml-auto text-xs text-emerald-600 hover:underline font-medium shrink-0">Открыть</Link>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Заметки</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              placeholder="Дополнительная информация..."
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none placeholder:text-slate-400" />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Отмена</button>
          <button onClick={() => { updateFamily(familyId, { notes: notes.trim() || undefined }); onClose(); }}
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

// ─── Payment Form Modal ───────────────────────────────────────────────────────

const OVERPAYMENT_LABELS: Record<OverpaymentType, { label: string; desc: string; icon: React.ReactNode }> = {
  advance: {
    label: 'Аванс на следующий месяц',
    desc: 'Переплата зачтётся в счёт следующего платежа',
    icon: <PiggyBank className="size-4 text-blue-500" />,
  },
  gift: {
    label: 'Хадия / пожертвование',
    desc: 'Лишняя сумма принимается как дополнительный вклад',
    icon: <Gift className="size-4 text-purple-500" />,
  },
};

interface PaymentFormModalProps {
  family: ReturnType<typeof useFamilyById>;
  familyStudents: ReturnType<typeof useStudents>;
  allSupportPayments: SupportPayment[];
  currentMonth: string;
  preselectedStudentId?: string;
  editPayment?: SupportPayment;
  onClose: () => void;
  onCreate: (input: CreateSupportPaymentInput) => void;
  onUpdate: (id: string, patch: Partial<SupportPayment>) => void;
}

function PaymentFormModal({
  family, familyStudents, allSupportPayments,
  currentMonth, preselectedStudentId, editPayment,
  onClose, onCreate, onUpdate,
}: PaymentFormModalProps) {
  const [month, setMonth] = useState(editPayment?.month ?? currentMonth);
  const [amountStr, setAmountStr] = useState(editPayment ? String(editPayment.amount) : '');
  const [method, setMethod] = useState<PaymentMethod>(editPayment?.method ?? 'cash');
  const [note, setNote] = useState(editPayment?.note ?? '');
  const [targetStudentId, setTargetStudentId] = useState<string | undefined>(
    editPayment?.studentId ?? preselectedStudentId
  );
  const [overpaymentType, setOverpaymentType] = useState<OverpaymentType | ''>(
    editPayment?.overpaymentType ?? ''
  );
  const [errors, setErrors] = useState<{ amount?: string; overpayment?: string }>({});

  const monthOptions = useMemo(() => getMonthOptions(currentMonth), [currentMonth]);
  const isStudentTarget = !!targetStudentId;

  const monthPayments = useMemo(
    () => allSupportPayments.filter((p) => p.familyId === family?.id && p.month === month && p.id !== editPayment?.id),
    [allSupportPayments, family?.id, month, editPayment]
  );

  const numAmount = Number(amountStr) || 0;

  const { expected, alreadyPaid } = useMemo(() => {
    if (!family) return { expected: 0, alreadyPaid: 0 };
    if (isStudentTarget) {
      const sel = family.lessonSelections?.find((ls) => ls.studentId === targetStudentId);
      return {
        expected: sel?.monthlyAmount ?? 0,
        alreadyPaid: getStudentMonthPaid(targetStudentId!, monthPayments),
      };
    }
    return {
      expected: calculateFamilyExpectedAmount(family),
      alreadyPaid: monthPayments.reduce((s, p) => s + p.appliedAmount, 0),
    };
  }, [isStudentTarget, targetStudentId, family, monthPayments]);

  const remaining = Math.max(0, expected - alreadyPaid);
  const appliedAmount = Math.min(numAmount, remaining);
  const overpaidAmount = Math.max(0, numAmount - remaining);
  const isOverpaid = overpaidAmount > 0;

  const distribution = useMemo(() => {
    if (!family || isStudentTarget || appliedAmount <= 0) return [];
    return distributeAmongStudents(
      appliedAmount,
      familyStudents.map((s) => ({
        id: s.id,
        expectedAmount: family.lessonSelections?.find((ls) => ls.studentId === s.id)?.monthlyAmount ?? 0,
        alreadyPaid: getStudentMonthPaid(s.id, monthPayments),
      }))
    );
  }, [isStudentTarget, appliedAmount, familyStudents, family, monthPayments]);

  // Minimum required overpaid amount when editing a payment that created advance
  const minRequiredOverpaid = useMemo(() => {
    if (!editPayment || editPayment.overpaymentType !== 'advance') return 0;
    return calculateUsedAdvanceFromPayment(editPayment.id, allSupportPayments);
  }, [editPayment, allSupportPayments]);
  const canChangeOverpaymentType = minRequiredOverpaid === 0;

  if (!family) return null;

  function validate() {
    const errs: typeof errors = {};
    if (numAmount <= 0) errs.amount = 'Введите сумму';
    if (isOverpaid && !overpaymentType) errs.overpayment = 'Выберите, что делать с переплатой';
    if (editPayment?.overpaymentType === 'advance' && overpaidAmount < minRequiredOverpaid) {
      errs.amount = `Нельзя уменьшить аванс: уже применено ${formatAmount(minRequiredOverpaid)} сом`;
    }
    if (!canChangeOverpaymentType && overpaymentType === 'gift' && editPayment?.overpaymentType === 'advance') {
      errs.overpayment = `Нельзя сменить тип: уже применено ${formatAmount(minRequiredOverpaid)} сом аванса`;
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    const input: CreateSupportPaymentInput = {
      familyId: family!.id,
      month,
      studentId: targetStudentId,
      amount: numAmount,
      appliedAmount,
      overpaidAmount,
      overpaymentType: isOverpaid ? (overpaymentType as OverpaymentType) : undefined,
      distribution: !isStudentTarget && distribution.length > 0 ? distribution : undefined,
      method,
      note: note.trim() || undefined,
    };
    if (editPayment) {
      onUpdate(editPayment.id, input);
    } else {
      onCreate(input);
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full sm:rounded-2xl sm:max-w-lg shadow-xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {editPayment ? 'Редактировать оплату' : 'Внести оплату'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{family.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="size-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {/* Month */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Месяц</label>
            <div className="relative">
              <select value={month} onChange={(e) => setMonth(e.target.value)}
                className="w-full h-10 rounded-xl border border-slate-200 px-3 pr-8 text-sm text-slate-800 appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                {monthOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-3 size-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Za kogo */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">За кого</label>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setTargetStudentId(undefined)}
                className={cn('px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors',
                  !isStudentTarget ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                )}>
                Вся семья
              </button>
              {familyStudents.map((s) => (
                <button key={s.id}
                  onClick={() => setTargetStudentId(s.id)}
                  className={cn('px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors',
                    targetStudentId === s.id ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  )}>
                  {s.fullName.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Summary chip */}
          {expected > 0 && (
            <div className="bg-slate-50 rounded-xl p-3 flex gap-4 text-xs">
              <div><p className="text-slate-400">Ожидается</p><p className="font-semibold text-slate-800 mt-0.5">{formatAmount(expected)}</p></div>
              <div><p className="text-slate-400">Уже оплачено</p><p className="font-semibold text-emerald-600 mt-0.5">{formatAmount(alreadyPaid)}</p></div>
              {remaining > 0 && <div><p className="text-slate-400">Остаток</p><p className="font-semibold text-amber-600 mt-0.5">{formatAmount(remaining)}</p></div>}
              {remaining === 0 && <div><p className="text-slate-400">Статус</p><p className="font-semibold text-emerald-600 mt-0.5">Оплачено ✓</p></div>}
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Сумма (сом)</label>
            {remaining > 0 && (
              <div className="flex gap-2 mb-2">
                <button onClick={() => setAmountStr(String(remaining))}
                  className="flex-1 py-1.5 px-3 rounded-xl border border-emerald-200 text-xs font-medium text-emerald-700 hover:bg-emerald-50">
                  Полный остаток ({formatAmount(remaining)})
                </button>
                <button onClick={() => setAmountStr(String(Math.ceil(remaining / 2)))}
                  className="flex-1 py-1.5 px-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50">
                  Половина
                </button>
              </div>
            )}
            <input
              type="number" min="0" placeholder="0" value={amountStr}
              onChange={(e) => { setAmountStr(e.target.value); setErrors((p) => ({ ...p, amount: undefined })); }}
              className={cn('w-full px-3 py-2.5 border rounded-xl text-sm font-medium focus:outline-none focus:ring-2',
                errors.amount ? 'border-red-300 focus:ring-red-400' : 'border-slate-200 focus:ring-emerald-400'
              )}
            />
            {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
          </div>

          {/* Distribution preview (family payments) */}
          {!isStudentTarget && numAmount > 0 && distribution.length > 0 && (
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-slate-500 mb-2">Распределение по детям</p>
              <div className="space-y-1">
                {familyStudents.map((s) => {
                  const d = distribution.find((x) => x.studentId === s.id);
                  const expected = family.lessonSelections?.find((ls) => ls.studentId === s.id)?.monthlyAmount ?? 0;
                  const covered = d?.amount ?? 0;
                  const isPaid = covered >= expected && expected > 0;
                  return (
                    <div key={s.id} className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">{s.fullName.split(' ')[0]}</span>
                      <span className={cn('font-medium', isPaid ? 'text-emerald-600' : covered > 0 ? 'text-amber-600' : 'text-slate-400')}>
                        {covered > 0 ? formatAmount(covered) : '—'}{isPaid ? ' ✓' : covered > 0 ? ` / ${formatAmount(expected)}` : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Advance constraint notice */}
          {editPayment?.overpaymentType === 'advance' && minRequiredOverpaid > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-blue-800">Ограничение по авансу</p>
              <p className="text-xs text-blue-700 mt-0.5">
                Уже применено {formatAmount(minRequiredOverpaid)} сом. Нельзя уменьшить аванс ниже этой суммы.
              </p>
            </div>
          )}

          {/* Overpayment */}
          {isOverpaid && (
            <div className="border border-amber-200 bg-amber-50 rounded-xl p-3 space-y-2">
              <p className="text-xs font-semibold text-amber-800">
                Переплата: {formatAmount(overpaidAmount)}
              </p>
              <p className="text-xs text-amber-700">Что сделать с излишком?</p>
              {errors.overpayment && <p className="text-xs text-red-500">{errors.overpayment}</p>}
              <div className="space-y-1.5">
                {(Object.entries(OVERPAYMENT_LABELS) as [OverpaymentType, typeof OVERPAYMENT_LABELS[OverpaymentType]][]).map(([key, meta]) => {
                  const isLocked = key === 'gift' && !canChangeOverpaymentType && editPayment?.overpaymentType === 'advance';
                  return (
                    <button
                      key={key}
                      disabled={isLocked}
                      onClick={() => { if (!isLocked) { setOverpaymentType(key); setErrors((p) => ({ ...p, overpayment: undefined })); } }}
                      className={cn(
                        'w-full flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-colors',
                        isLocked ? 'opacity-40 cursor-not-allowed border-slate-200 bg-slate-50' :
                        overpaymentType === key
                          ? 'border-emerald-400 bg-white shadow-sm'
                          : 'border-amber-200 bg-amber-50/50 hover:bg-white'
                      )}
                    >
                      <span className="mt-0.5 shrink-0">{meta.icon}</span>
                      <div>
                        <p className="text-xs font-semibold text-slate-800">{meta.label}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{isLocked ? 'Недоступно: аванс уже частично применён' : meta.desc}</p>
                      </div>
                      {overpaymentType === key && !isLocked && <Check className="size-4 text-emerald-500 ml-auto shrink-0 mt-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Method */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Способ оплаты</label>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((m) => (
                <button key={m} onClick={() => setMethod(m)}
                  className={cn('px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors',
                    method === m ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  )}>
                  {PAYMENT_METHOD_LABELS[m]}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Заметка</label>
            <input type="text" placeholder="Примечание..." value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 placeholder:text-slate-400" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-slate-100 shrink-0">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Отмена
          </button>
          <button onClick={handleSubmit}
            className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 flex items-center justify-center gap-1.5">
            <Check className="size-4" />
            {editPayment ? 'Сохранить' : numAmount > 0 ? `Принять ${formatAmount(numAmount)}` : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
}

function getPageMonthOptions(currentMonth: string) {
  const [y, m] = currentMonth.split('-').map(Number);
  const options: { value: string; label: string }[] = [];
  for (let i = -4; i <= 2; i++) {
    let mo = m + i;
    let yr = y;
    if (mo < 1) { mo += 12; yr--; }
    if (mo > 12) { mo -= 12; yr++; }
    const val = `${yr}-${String(mo).padStart(2, '0')}`;
    options.push({ value: val, label: formatMonth(val) });
  }
  return options;
}

// ─── Apply / Edit Advance Modal ───────────────────────────────────────────────

function ApplyAdvanceModal({
  availableAdvance,
  family,
  familyStudents,
  allSupportPayments,
  initialMonth,
  editRecord,
  onCancel,
  onConfirm,
}: {
  availableAdvance: number;
  family: NonNullable<ReturnType<typeof useFamilyById>>;
  familyStudents: ReturnType<typeof useStudents>;
  allSupportPayments: SupportPayment[];
  initialMonth: string;
  editRecord?: SupportPayment;
  onCancel: () => void;
  onConfirm: (input: ApplyAdvanceInput) => void;
}) {
  const isEdit = !!editRecord;
  // Temporarily return edited record's amount to the pool so user can re-allocate it
  const editableAvailableAdvance = isEdit
    ? availableAdvance + (editRecord.appliedAmount ?? 0)
    : availableAdvance;

  const currentMonth = getCurrentMonth();
  const monthOptions = useMemo(() => getPageMonthOptions(currentMonth), [currentMonth]);

  const initialTargetMode = useMemo((): 'family' | 'students' => {
    if (!editRecord?.allocations || editRecord.allocations.length === 0) return 'family';
    return editRecord.allocations.length < familyStudents.length ? 'students' : 'family';
  }, [editRecord, familyStudents]);

  const initialSelectedIds = useMemo((): Set<string> => {
    if (editRecord?.allocations && editRecord.allocations.length > 0) {
      return new Set(editRecord.allocations.map((a) => a.studentId));
    }
    return new Set(familyStudents.map((s) => s.id));
  }, [editRecord, familyStudents]);

  const [month, setMonth] = useState(editRecord?.month ?? initialMonth);
  const [targetMode, setTargetMode] = useState<'family' | 'students'>(initialTargetMode);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(initialSelectedIds);
  const [amountStr, setAmountStr] = useState(isEdit ? String(editRecord.appliedAmount) : '');
  const [noteStr, setNoteStr] = useState(() => {
    const s = editRecord?.note ?? '';
    return s.startsWith('Применён аванс к ') ? '' : s;
  });
  const [error, setError] = useState<string | null>(null);

  // Exclude the record being edited so paid amounts don't double-count it
  const monthPayments = useMemo(
    () => allSupportPayments.filter((p) => p.month === month && p.id !== editRecord?.id),
    [allSupportPayments, month, editRecord]
  );

  const studentInfoMap = useMemo(() => {
    const map = new Map<string, { expected: number; paid: number; remaining: number }>();
    for (const s of familyStudents) {
      const sel = family.lessonSelections?.find((ls) => ls.studentId === s.id);
      const expected = sel?.monthlyAmount ?? 0;
      const paid = getStudentMonthPaid(s.id, monthPayments);
      map.set(s.id, { expected, paid, remaining: Math.max(0, expected - paid) });
    }
    return map;
  }, [familyStudents, family.lessonSelections, monthPayments]);

  const numAmount = Number(amountStr) || 0;

  const targetStudents = useMemo(
    () => targetMode === 'family'
      ? familyStudents
      : familyStudents.filter((s) => selectedStudentIds.has(s.id)),
    [targetMode, familyStudents, selectedStudentIds]
  );

  const totalTargetRemaining = useMemo(
    () => targetStudents.reduce((s, st) => s + (studentInfoMap.get(st.id)?.remaining ?? 0), 0),
    [targetStudents, studentInfoMap]
  );

  const allocations = useMemo(
    () => numAmount <= 0 ? [] : distributeAmongStudents(
      numAmount,
      targetStudents.map((s) => {
        const info = studentInfoMap.get(s.id)!;
        return { id: s.id, expectedAmount: info.expected, alreadyPaid: info.paid };
      })
    ),
    [numAmount, targetStudents, studentInfoMap]
  );

  function toggleStudent(id: string) {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function handleConfirm() {
    if (targetMode === 'students' && selectedStudentIds.size === 0) {
      setError('Выберите хотя бы одного ученика');
      return;
    }
    if (numAmount <= 0) { setError('Введите сумму'); return; }
    if (numAmount > editableAvailableAdvance) {
      setError(`Максимум: ${formatAmount(editableAvailableAdvance)}`);
      return;
    }
    if (allocations.length === 0) {
      setError('Нет долга для покрытия в выбранном месяце');
      return;
    }
    const finalNote = noteStr.trim() || `Применён аванс к ${formatMonth(month)}`;
    onConfirm({ familyId: family.id, month, amount: numAmount, allocations, note: finalNote });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white w-full sm:rounded-2xl sm:max-w-md shadow-xl flex flex-col max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {isEdit ? 'Редактировать применение аванса' : 'Применить аванс'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEdit
                ? `Доступно для редактирования: ${formatAmount(editableAvailableAdvance)}`
                : `Доступно: ${formatAmount(availableAdvance)}`}
            </p>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="size-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {/* Month */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Месяц</label>
            <div className="relative">
              <select value={month} onChange={(e) => { setMonth(e.target.value); setError(null); }}
                className="w-full h-10 rounded-xl border border-slate-200 px-3 pr-8 text-sm text-slate-800 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                {monthOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}{o.value === currentMonth ? ' (текущий)' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-3 size-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Target */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">За кого</label>
            <div className="flex gap-1.5 mb-3">
              <button
                onClick={() => setTargetMode('family')}
                className={cn('px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors',
                  targetMode === 'family' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                )}>
                Вся семья
              </button>
              <button
                onClick={() => setTargetMode('students')}
                className={cn('px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors',
                  targetMode === 'students' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                )}>
                Конкретные ученики
              </button>
            </div>
            <div className="space-y-1.5">
              {familyStudents.map((s) => {
                const info = studentInfoMap.get(s.id) ?? { expected: 0, paid: 0, remaining: 0 };
                const isChecked = targetMode === 'family' || selectedStudentIds.has(s.id);
                const isDisabled = targetMode === 'family';
                return (
                  <label key={s.id}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-xl border transition-colors',
                      isDisabled ? 'border-slate-100 bg-slate-50/50' : 'cursor-pointer',
                      !isDisabled && isChecked ? 'border-blue-200 bg-blue-50/40' : !isDisabled ? 'border-slate-200 bg-white hover:bg-slate-50' : ''
                    )}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isDisabled}
                      onChange={() => !isDisabled && toggleStudent(s.id)}
                      className="size-4 rounded accent-blue-600"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">{s.fullName.split(' ')[0]}</p>
                      {info.expected > 0 && (
                        <p className="text-xs text-slate-400">
                          {info.remaining > 0 ? `Остаток: ${formatAmount(info.remaining)}` : 'Оплачено ✓'}
                        </p>
                      )}
                    </div>
                    {info.remaining > 0 && (
                      <span className="text-xs font-medium text-amber-600 shrink-0">{formatAmount(info.remaining)}</span>
                    )}
                    {info.remaining === 0 && info.expected > 0 && (
                      <span className="text-xs text-emerald-600 shrink-0">✓</span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Сумма (сом)</label>
            {totalTargetRemaining > 0 && (
              <button
                onClick={() => { setAmountStr(String(Math.min(editableAvailableAdvance, totalTargetRemaining))); setError(null); }}
                className="w-full mb-2 py-1.5 px-3 rounded-xl border border-blue-200 text-xs font-medium text-blue-700 hover:bg-blue-50">
                Максимум ({formatAmount(Math.min(editableAvailableAdvance, totalTargetRemaining))})
              </button>
            )}
            <input
              type="number" min="0" max={editableAvailableAdvance} placeholder="0"
              value={amountStr}
              onChange={(e) => { setAmountStr(e.target.value); setError(null); }}
              className={cn(
                'w-full px-3 py-2.5 border rounded-xl text-sm font-medium focus:outline-none focus:ring-2',
                error ? 'border-red-300 focus:ring-red-400' : 'border-slate-200 focus:ring-blue-400'
              )}
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
            <p className="text-xs text-slate-400 mt-1">
              {isEdit
                ? `Доступно для редактирования: ${formatAmount(editableAvailableAdvance)}`
                : `Доступный аванс: ${formatAmount(availableAdvance)}`}
            </p>
          </div>

          {/* Allocation preview */}
          {numAmount > 0 && allocations.length > 0 && (
            <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
              <p className="text-xs font-semibold text-blue-700 mb-2">
                {isEdit ? 'После сохранения будет применено' : 'Распределение по ученикам'}
              </p>
              <div className="space-y-1">
                {familyStudents.map((s) => {
                  const alloc = allocations.find((a) => a.studentId === s.id);
                  if (!alloc) return null;
                  const info = studentInfoMap.get(s.id)!;
                  const willBePaid = alloc.amount >= info.remaining && info.remaining > 0;
                  return (
                    <div key={s.id} className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">{s.fullName.split(' ')[0]}</span>
                      <span className={cn('font-medium', willBePaid ? 'text-emerald-600' : 'text-blue-600')}>
                        {formatAmount(alloc.amount)}{willBePaid ? ' ✓' : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
              {isEdit && (
                <div className="mt-2 pt-2 border-t border-blue-100 text-xs flex justify-between text-slate-500">
                  <span>Доступный аванс станет:</span>
                  <span className="font-medium text-slate-700">{formatAmount(editableAvailableAdvance - numAmount)}</span>
                </div>
              )}
            </div>
          )}

          {/* No debt warning */}
          {numAmount > 0 && allocations.length === 0 && (
            <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
              <p className="text-xs text-amber-700">
                За {formatMonth(month)} нет долга. Выберите другой месяц или уменьшите сумму.
              </p>
            </div>
          )}

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Заметка</label>
            <input
              type="text"
              placeholder={`Применён аванс к ${formatMonth(month)}`}
              value={noteStr}
              onChange={(e) => setNoteStr(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-slate-300"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-slate-100 shrink-0">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Отмена
          </button>
          <button onClick={handleConfirm}
            className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-1.5">
            <PiggyBank className="size-4" />
            {isEdit ? 'Сохранить изменения' : numAmount > 0 ? `Применить ${formatAmount(numAmount)}` : 'Применить'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Plan Change Confirm Modal ────────────────────────────────────────────────

interface PendingPlanChange {
  studentId: string;
  studentName: string;
  oldPlan: SupportPlanType;
  newPlan: SupportPlanType;
  oldAmount: number;
  initialCustomAmount: number;
}

function PlanChangeModal({
  pending, onCancel, onConfirm,
}: {
  pending: PendingPlanChange;
  onCancel: () => void;
  onConfirm: (planType: SupportPlanType, customAmount: number) => void;
}) {
  const [customAmountStr, setCustomAmountStr] = useState(String(pending.initialCustomAmount || 0));
  const isCustom = pending.newPlan === 'custom';
  const isSamePlan = pending.oldPlan === pending.newPlan;
  const newAmount = isCustom ? (Number(customAmountStr) || 0) : getSelectionAmount(pending.newPlan);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900">
            {isSamePlan ? 'Изменить сумму?' : 'Изменить формат обучения?'}
          </h2>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="size-4" />
          </button>
        </div>

        <p className="text-sm text-slate-600 mb-4 leading-relaxed">
          {isSamePlan ? (
            <>Укажите новую сумму для <span className="font-medium">{pending.studentName}</span>.</>
          ) : (
            <>
              Вы хотите изменить формат обучения для <span className="font-medium">{pending.studentName}</span>{' '}
              с <span className="font-medium">«{SUPPORT_PLANS[pending.oldPlan].name}»</span>{' '}
              на <span className="font-medium">«{SUPPORT_PLANS[pending.newPlan].name}»</span>.
              {!isCustom && (
                <> Сумма изменится с <span className="font-medium">{formatAmount(pending.oldAmount)}</span>{' '}
                на <span className="font-medium">{formatAmount(newAmount)}</span>.</>
              )}
            </>
          )}
        </p>

        {isCustom && (
          <div className="mb-5">
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Сумма в месяц (сом)</label>
            <input
              type="number" min="0" step="100" autoFocus
              value={customAmountStr}
              onChange={(e) => setCustomAmountStr(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            {!isSamePlan && pending.oldAmount > 0 && (
              <p className="text-xs text-slate-400 mt-1">Текущая сумма: {formatAmount(pending.oldAmount)}</p>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Отмена
          </button>
          <button
            onClick={() => onConfirm(pending.newPlan, Number(customAmountStr) || 0)}
            className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 flex items-center justify-center gap-1.5">
            <Check className="size-4" />
            {isSamePlan ? 'Применить' : 'Подтвердить'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Badge Confirm Modal ──────────────────────────────────────────────────────

interface PendingBadgeAction {
  studentId: string;
  studentName: string;
  action: 'give' | 'revoke';
}

function BadgeConfirmModal({
  pending, onCancel, onConfirm,
}: {
  pending: PendingBadgeAction;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isGive = pending.action === 'give';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900">
            {isGive ? 'Выдать бейджик?' : 'Отменить выдачу бейджика?'}
          </h2>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="size-4" />
          </button>
        </div>
        <p className="text-sm text-slate-600 mb-5 leading-relaxed">
          {isGive
            ? <>Отметить, что <span className="font-medium">{pending.studentName}</span> получил бейджик за оплату?</>
            : <>Вы уверены, что хотите убрать отметку о выдаче бейджика для <span className="font-medium">{pending.studentName}</span>?</>
          }
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Отмена
          </button>
          <button onClick={onConfirm}
            className={cn(
              'flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-1.5',
              isGive ? 'bg-amber-500 hover:bg-amber-600' : 'bg-red-500 hover:bg-red-600'
            )}>
            {isGive ? '🏅 Выдать бейджик' : 'Убрать отметку'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Lessons Tab ─────────────────────────────────────────────────────────────

const PLAN_ORDER_DETAIL: SupportPlanType[] = ['open_learning', 'family_support', 'focused_learning', 'private_group', 'custom'];

function LessonsTab({
  family,
  familyStudents,
  monthPayments,
  selectedMonth,
  onSave,
  onToggleBadge,
}: {
  family: ReturnType<typeof useFamilyById>;
  familyStudents: ReturnType<typeof useStudents>;
  monthPayments: SupportPayment[];
  selectedMonth: string;
  onSave: (selections: LessonSelection[]) => void;
  onToggleBadge: (studentId: string) => void;
}) {
  const [configs, setConfigs] = useState<Map<string, { lessonType: LessonType; planType: SupportPlanType; monthlyAmount: number }>>(() => {
    const m = new Map<string, { lessonType: LessonType; planType: SupportPlanType; monthlyAmount: number }>();
    for (const s of familyStudents) {
      const existing = family?.lessonSelections?.find((ls) => ls.studentId === s.id);
      m.set(s.id, existing
        ? { lessonType: existing.lessonType, planType: existing.planType, monthlyAmount: existing.monthlyAmount }
        : { lessonType: 'quran_group', planType: family?.supportPlanType ?? 'family_support', monthlyAmount: getSelectionAmount(family?.supportPlanType ?? 'family_support') }
      );
    }
    return m;
  });
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [pendingPlan, setPendingPlan] = useState<PendingPlanChange | null>(null);
  const [pendingBadge, setPendingBadge] = useState<PendingBadgeAction | null>(null);

  useEffect(() => {
    if (!lastSaved) return;
    const t = setTimeout(() => setLastSaved(null), 2000);
    return () => clearTimeout(t);
  }, [lastSaved]);

  if (!family) return null;

  function buildSelections(map: typeof configs): LessonSelection[] {
    return familyStudents.map((s) => {
      const cfg = map.get(s.id) ?? { lessonType: 'quran_group' as LessonType, planType: 'family_support' as SupportPlanType, monthlyAmount: 1000 };
      const existing = family?.lessonSelections?.find((ls) => ls.studentId === s.id);
      return {
        id: existing?.id ?? generateId(),
        studentId: s.id,
        lessonType: cfg.lessonType,
        planType: cfg.planType,
        monthlyAmount: cfg.planType === 'custom' ? cfg.monthlyAmount : getSelectionAmount(cfg.planType),
        isActive: true,
        badgeGiven: existing?.badgeGiven,
        badgeGivenAt: existing?.badgeGivenAt,
      };
    });
  }

  function commitConfig(studentId: string, patch: Partial<{ lessonType: LessonType; planType: SupportPlanType; monthlyAmount: number }>) {
    const next = new Map(configs);
    const old = next.get(studentId) ?? { lessonType: 'quran_group' as LessonType, planType: 'family_support' as SupportPlanType, monthlyAmount: 1000 };
    const updated = { ...old, ...patch };
    if (patch.planType && patch.planType !== 'custom') updated.monthlyAmount = getSelectionAmount(patch.planType);
    next.set(studentId, updated);
    setConfigs(next);
    onSave(buildSelections(next));
    setLastSaved(Date.now());
  }

  function handlePlanButtonClick(studentId: string, studentName: string, newPlan: SupportPlanType) {
    const cfg = configs.get(studentId) ?? { lessonType: 'quran_group' as LessonType, planType: 'family_support' as SupportPlanType, monthlyAmount: 1000 };
    if (newPlan !== 'custom' && newPlan === cfg.planType) return;
    const oldAmount = cfg.planType === 'custom' ? cfg.monthlyAmount : getSelectionAmount(cfg.planType);
    setPendingPlan({ studentId, studentName, oldPlan: cfg.planType, newPlan, oldAmount, initialCustomAmount: cfg.monthlyAmount });
  }

  function handlePlanConfirm(planType: SupportPlanType, customAmount: number) {
    if (!pendingPlan) return;
    commitConfig(pendingPlan.studentId, {
      planType,
      monthlyAmount: planType === 'custom' ? customAmount : getSelectionAmount(planType),
    });
    setPendingPlan(null);
  }

  function handleBadgeConfirm() {
    if (!pendingBadge) return;
    onToggleBadge(pendingBadge.studentId);
    setPendingBadge(null);
  }

  if (familyStudents.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-50 rounded-2xl">
        <BookOpen className="size-8 text-slate-300 mx-auto mb-2" />
        <p className="text-slate-500 text-sm">Нет учеников в этой семье</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <span className={cn(
          'text-xs transition-opacity duration-500',
          lastSaved ? 'text-emerald-500 opacity-100' : 'text-slate-400 opacity-50'
        )}>
          {lastSaved ? '✓ Сохранено' : 'Изменения сохраняются автоматически после подтверждения'}
        </span>
      </div>

      {familyStudents.map((s) => {
        const cfg = configs.get(s.id) ?? { lessonType: 'quran_group' as LessonType, planType: 'family_support' as SupportPlanType, monthlyAmount: 1000 };
        const c = PLAN_COLORS[cfg.planType];
        const initials = s.fullName.slice(0, 2).toUpperCase();
        const sel = family.lessonSelections?.find((ls) => ls.studentId === s.id);
        const studentExpected = sel?.monthlyAmount ?? cfg.monthlyAmount;
        const studentPaid = getStudentMonthPaid(s.id, monthPayments);
        const isPaid = studentExpected > 0 && studentPaid >= studentExpected;
        const studentAdvance = monthPayments
          .filter((p) => p.kind === 'advance_usage')
          .flatMap((p) => p.allocations ?? [])
          .filter((a) => a.studentId === s.id)
          .reduce((sum, a) => sum + a.amount, 0);
        const isPartial = studentPaid > 0 && studentPaid < studentExpected;
        const badgeGiven = sel?.badgeGiven ?? false;

        const statusLabel = studentExpected === 0 ? 'Открытый доступ'
          : isPaid ? 'Оплачено'
          : isPartial ? 'Частично'
          : 'Не оплачено';
        const statusClass = studentExpected === 0 ? 'bg-slate-100 text-slate-500'
          : isPaid ? 'bg-emerald-100 text-emerald-700'
          : isPartial ? 'bg-amber-100 text-amber-700'
          : 'bg-slate-100 text-slate-600';

        return (
          <div key={s.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {/* Student header */}
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

            {/* Plan selector */}
            <div className="px-3 pt-3 pb-2">
              <div className="flex flex-wrap gap-1.5">
                {PLAN_ORDER_DETAIL.map((pt) => {
                  const plan = SUPPORT_PLANS[pt];
                  const pc = PLAN_COLORS[pt];
                  const isActive = cfg.planType === pt;
                  return (
                    <button key={pt} type="button"
                      onClick={() => handlePlanButtonClick(s.id, s.fullName, pt)}
                      className={cn(
                        'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all',
                        isActive ? `${pc.badge} border-transparent` : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'
                      )}>
                      <span>{plan.emoji}</span><span>{plan.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Payment status — read-only, no payment button */}
            {studentExpected > 0 && (
              <div className="flex items-center gap-2 px-3 py-2.5 border-t border-slate-100 bg-slate-50/60 flex-wrap">
                <span className="text-xs text-slate-400">{formatMonth(selectedMonth)}:</span>
                <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', statusClass)}>
                  {statusLabel}
                </span>
                {isPartial && (
                  <span className="text-xs text-slate-400">
                    {formatAmount(studentPaid)} / {formatAmount(studentExpected)}
                  </span>
                )}
                {isPaid && (
                  <span className="text-xs text-emerald-600 font-medium">{formatAmount(studentPaid)}</span>
                )}
                {studentAdvance > 0 && (
                  <span className="flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                    <PiggyBank className="size-3" />Аванс: {formatAmount(studentAdvance)}
                  </span>
                )}
              </div>
            )}

            {/* Badge — only when paid */}
            {isPaid && (
              <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100">
                <span className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Award className="size-3.5 text-amber-400" /> Бейджик
                </span>
                {badgeGiven ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Check className="size-3" /> Выдан
                    </span>
                    <button
                      onClick={() => setPendingBadge({ studentId: s.id, studentName: s.fullName, action: 'revoke' })}
                      title="Отменить"
                      className="size-5 flex items-center justify-center rounded-full text-slate-400 hover:text-red-400 hover:bg-red-50 transition-colors text-xs">
                      ×
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setPendingBadge({ studentId: s.id, studentName: s.fullName, action: 'give' })}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-xs font-medium hover:bg-amber-100 transition-colors">
                    🏅 Дать бейджик
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {pendingPlan && (
        <PlanChangeModal
          pending={pendingPlan}
          onCancel={() => setPendingPlan(null)}
          onConfirm={handlePlanConfirm}
        />
      )}
      {pendingBadge && (
        <BadgeConfirmModal
          pending={pendingBadge}
          onCancel={() => setPendingBadge(null)}
          onConfirm={handleBadgeConfirm}
        />
      )}
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
  const legacyPayments = useFamilyPaymentsByFamilyId(familyId);
  const supportPayments = useSupportPaymentsByFamilyId(familyId);
  const history = usePaymentHistoryByFamilyId(familyId);
  const {
    deleteFamily, deleteFamilyPayment, updateFamilyLessonSelections, toggleStudentBadge,
    createSupportPayment, updateSupportPayment, deleteSupportPayment, applyAdvanceToMonth,
  } = useAppStore();

  const [tab, setTab] = useState<'lessons' | 'payments' | 'history'>('lessons');
  const [showDelete, setShowDelete] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth);
  const [showApplyAdvance, setShowApplyAdvance] = useState(false);
  const [editAdvanceUsage, setEditAdvanceUsage] = useState<SupportPayment | null>(null);
  // Payment modal state: null = closed, 'family' = family payment, string = studentId
  const [openPaymentFor, setOpenPaymentFor] = useState<null | 'family' | string>(null);
  const [editPayment, setEditPayment] = useState<SupportPayment | null>(null);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);

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

  const familyStudents = students.filter((s) => family.studentIds.includes(s.id));
  const currentMonth = getCurrentMonth();
  const pageMonthOptions = getPageMonthOptions(currentMonth);

  const selectedMonthPayments = supportPayments.filter((p) => p.month === selectedMonth);
  const expectedAmount = calculateFamilyExpectedAmount(family);
  const paidAmount = calculatePaidForMonth(supportPayments, selectedMonth);
  const availableAdvance = calculateAvailableAdvance(supportPayments);
  const giftTotal = calculateGiftTotal(supportPayments);
  const remaining = Math.max(0, expectedAmount - paidAmount);
  const currentStatus = expectedAmount === 0 ? 'paid' : paidAmount <= 0 ? 'unpaid' : paidAmount >= expectedAmount ? 'paid' : 'partial';

  function openPaymentModal(target: 'family' | string) {
    setEditPayment(null);
    setOpenPaymentFor(target);
  }

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
            </div>
            {(parent || family.parentName) && (
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="text-sm text-slate-600">{parent ? parent.fullName : family.parentName}</span>
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
          <button
            onClick={() => openPaymentModal('family')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700">
            <Wallet className="size-4" /> Внести оплату
          </button>
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

      {/* Month selector */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-medium text-slate-500 shrink-0">Расчётный месяц:</span>
        <div className="relative">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-8 rounded-xl border border-slate-200 bg-white px-3 pr-7 text-sm font-medium text-slate-800 appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer">
            {pageMonthOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}{o.value === currentMonth ? ' (текущий)' : ''}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-2 size-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Учеников', value: familyStudents.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: `Ожидается`, value: formatAmount(expectedAmount), icon: AlertCircle, color: 'text-slate-500', bg: 'bg-slate-100' },
          { label: `Оплачено`, value: formatAmount(paidAmount), icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
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

      {/* Available advance notice */}
      {availableAdvance > 0 && (
        <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 flex items-start gap-3">
          <PiggyBank className="size-4 text-blue-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-blue-800">Доступный аванс: {formatAmount(availableAdvance)}</p>
            {remaining > 0 ? (
              <p className="text-xs text-blue-600 mt-0.5">Можно применить к {formatMonth(selectedMonth)}.</p>
            ) : (
              <p className="text-xs text-blue-600 mt-0.5">Этот месяц уже закрыт. Выберите следующий месяц для применения аванса.</p>
            )}
          </div>
          {remaining > 0 && (
            <button
              onClick={() => setShowApplyAdvance(true)}
              className="shrink-0 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors">
              Применить
            </button>
          )}
        </div>
      )}

      {/* Gift chip */}
      {giftTotal > 0 && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 mb-4 w-fit">
          <Gift className="size-3.5 text-purple-500" />
          <span className="text-xs font-medium text-purple-700">Хадия: {formatAmount(giftTotal)}</span>
        </div>
      )}

      {/* Copy messages */}
      {expectedAmount > 0 && (
        <div className="flex gap-2 mb-5 flex-wrap">
          {(currentStatus === 'unpaid' || currentStatus === 'partial') && remaining > 0 && (
            <CopyBtn text={getReminderMessage(family.name, remaining, selectedMonth)} label="Скопировать напоминание" />
          )}
          {currentStatus === 'paid' && (
            <CopyBtn text={getThankYouMessage(family.name, selectedMonth)} label="Скопировать благодарность" />
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0.5 bg-slate-100 rounded-xl p-1 mb-5 w-fit">
        {([
          { key: 'lessons', label: 'Уроки' },
          { key: 'payments', label: `Оплаты (${supportPayments.length + legacyPayments.length})` },
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

      {/* Lessons tab */}
      {tab === 'lessons' && (
        <LessonsTab
          family={family}
          familyStudents={familyStudents}
          monthPayments={selectedMonthPayments}
          selectedMonth={selectedMonth}
          onSave={(selections) => updateFamilyLessonSelections(familyId, selections)}
          onToggleBadge={(studentId) => toggleStudentBadge(familyId, studentId)}
        />
      )}

      {/* Payments tab */}
      {tab === 'payments' && (
        <div className="space-y-3">
          {/* New SupportPayments */}
          {supportPayments.length > 0 && supportPayments.map((p) => {
            const isAdvanceUsage = p.kind === 'advance_usage';
            const isStudentPay = !!p.studentId;
            const student = isStudentPay ? students.find((s) => s.id === p.studentId) : null;
            return (
              <div key={p.id} className={cn(
                'bg-white rounded-2xl border p-4',
                isAdvanceUsage ? 'border-blue-200 bg-blue-50/30' : 'border-slate-200'
              )}>
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div className="flex-1 min-w-0">
                    {/* Month badge + amount */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn(
                        'text-xs font-semibold px-2 py-0.5 rounded-full',
                        isAdvanceUsage ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                      )}>
                        {formatMonth(p.month)}
                      </span>
                      <span className="font-semibold text-slate-800">{formatAmount(p.amount)}</span>
                      {p.method && <span className="text-xs text-slate-400">{PAYMENT_METHOD_LABELS[p.method]}</span>}
                    </div>
                    {/* Type / details row */}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {isAdvanceUsage ? (
                        <span className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                          <PiggyBank className="size-3" />Применение аванса
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">
                          {isStudentPay ? (student?.fullName ?? 'Ученик') : 'Вся семья'}
                        </span>
                      )}
                      {!isAdvanceUsage && p.appliedAmount !== p.amount && (
                        <span className="text-xs text-emerald-600">Зачислено: {formatAmount(p.appliedAmount)}</span>
                      )}
                      {p.overpaidAmount > 0 && p.overpaymentType === 'advance' && (() => {
                        const usedFromThis = calculateUsedAdvanceFromPayment(p.id, supportPayments);
                        const freeFromThis = p.overpaidAmount - usedFromThis;
                        return (
                          <>
                            <span className="flex items-center gap-1 text-xs text-blue-600">
                              <PiggyBank className="size-3" />Аванс: {formatAmount(p.overpaidAmount)}
                            </span>
                            {usedFromThis > 0 && (
                              <span className="text-xs text-slate-400">Применено: {formatAmount(usedFromThis)}</span>
                            )}
                            {freeFromThis > 0 && (
                              <span className="text-xs text-emerald-600">Свободно: {formatAmount(freeFromThis)}</span>
                            )}
                            {freeFromThis === 0 && usedFromThis > 0 && (
                              <span className="text-xs text-slate-400">Израсходован</span>
                            )}
                          </>
                        );
                      })()}
                      {p.overpaidAmount > 0 && p.overpaymentType === 'gift' && (
                        <span className="flex items-center gap-1 text-xs text-purple-600">
                          <Gift className="size-3" />→ Хадия {formatAmount(p.overpaidAmount)}
                        </span>
                      )}
                    </div>
                    {p.note && !isAdvanceUsage && <p className="text-xs text-slate-400 mt-1">{p.note}</p>}
                    <p className="text-[10px] text-slate-400 mt-1">{fmtDate(p.paidAt)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isAdvanceUsage ? (
                      <button onClick={() => setEditAdvanceUsage(p)}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        title="Редактировать применение аванса">
                        <Edit2 className="size-3.5" />
                      </button>
                    ) : (
                      <button onClick={() => { setEditPayment(p); setOpenPaymentFor('edit'); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
                        <Edit2 className="size-3.5" />
                      </button>
                    )}
                    <button onClick={() => setDeletingPaymentId(p.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
                {/* Distribution breakdown (regular family payments) */}
                {!isStudentPay && !isAdvanceUsage && p.distribution && p.distribution.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-x-4 gap-y-1">
                    {p.distribution.map((d) => {
                      const st = students.find((s) => s.id === d.studentId);
                      return (
                        <span key={d.studentId} className="text-[10px] text-slate-400">
                          {st?.fullName.split(' ')[0] ?? '?'}: {formatAmount(d.amount)}
                        </span>
                      );
                    })}
                  </div>
                )}
                {/* Allocations breakdown (advance_usage) */}
                {isAdvanceUsage && p.allocations && p.allocations.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-blue-100 flex flex-wrap gap-x-4 gap-y-1">
                    {p.allocations.map((a) => {
                      const st = students.find((s) => s.id === a.studentId);
                      return (
                        <span key={a.studentId} className="text-[10px] text-blue-500">
                          {st?.fullName.split(' ')[0] ?? '?'}: {formatAmount(a.amount)}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Legacy FamilyPayments */}
          {legacyPayments.length > 0 && (
            <>
              {supportPayments.length > 0 && (
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide pt-2">Прежние записи</p>
              )}
              {legacyPayments.map((p) => {
                const sc = STATUS_COLORS[p.status];
                const rem = Math.max(0, p.expectedAmount - p.paidAmount);
                return (
                  <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-4 opacity-80">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <p className="font-semibold text-slate-800">{formatMonth(p.month)}</p>
                        {p.paymentMethod && <p className="text-xs text-slate-400 mt-0.5">{PAYMENT_METHOD_LABELS[p.paymentMethod]}{p.comment ? ` · ${p.comment}` : ''}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full', sc.badge)}>
                          {PAYMENT_STATUS_LABELS[p.status]}
                        </span>
                        <button onClick={() => deleteFamilyPayment(p.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-4 text-sm">
                      {p.expectedAmount > 0 && <span className="text-slate-500">Начислено: <span className="font-medium text-slate-800">{formatAmount(p.expectedAmount)}</span></span>}
                      <span className="text-slate-500">Оплачено: <span className="font-semibold text-emerald-700">{formatAmount(p.paidAmount)}</span></span>
                      {rem > 0 && <span className="text-slate-500">Остаток: <span className="font-semibold text-amber-600">{formatAmount(rem)}</span></span>}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {supportPayments.length === 0 && legacyPayments.length === 0 && (
            <div className="text-center py-10 bg-slate-50 rounded-2xl">
              <Wallet className="size-8 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">Оплат ещё не было</p>
              <button onClick={() => openPaymentModal('family')}
                className="mt-3 text-sm text-emerald-600 hover:underline">
                Внести первую оплату
              </button>
            </div>
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
                created: 'Начислено', updated: 'Обновлено', paid: 'Оплачено',
                partial_paid: 'Частично оплачено', refund: 'Возврат',
              };
              const actionColors: Record<string, string> = {
                created: 'text-blue-600', updated: 'text-slate-600', paid: 'text-emerald-600',
                partial_paid: 'text-amber-600', refund: 'text-red-500',
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

      {/* Delete family confirm */}
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
                {familyStudents.length} учеников · {supportPayments.length + legacyPayments.length} оплат
              </p>
            </div>
            <p className="text-sm text-slate-500 mb-5">Ученики останутся в системе. История оплат будет удалена.</p>
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

      {/* Delete payment confirm */}
      {deletingPaymentId && (() => {
        const deletingPayment = supportPayments.find((x) => x.id === deletingPaymentId);
        const isAdvanceUsageDel = deletingPayment?.kind === 'advance_usage';
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDeletingPaymentId(null)}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className={cn('size-10 rounded-xl flex items-center justify-center shrink-0',
                  isAdvanceUsageDel ? 'bg-blue-100' : 'bg-red-100'
                )}>
                  {isAdvanceUsageDel
                    ? <PiggyBank className="size-5 text-blue-500" />
                    : <Trash2 className="size-5 text-red-500" />}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {isAdvanceUsageDel ? 'Отменить применение аванса?' : 'Удалить оплату?'}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {isAdvanceUsageDel ? 'Аванс вернётся на баланс' : 'После удаления суммы будут пересчитаны'}
                  </p>
                </div>
              </div>
              {deletingPayment && (
                <div className="bg-slate-50 rounded-xl p-3 mb-4">
                  <p className="font-semibold text-slate-800">{formatAmount(deletingPayment.amount)}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{formatMonth(deletingPayment.month)} · {fmtDate(deletingPayment.paidAt)}</p>
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setDeletingPaymentId(null)} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Отмена</button>
                <button onClick={() => { deleteSupportPayment(deletingPaymentId); setDeletingPaymentId(null); }}
                  className={cn('flex-1 px-4 py-2 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-1.5',
                    isAdvanceUsageDel ? 'bg-blue-500 hover:bg-blue-600' : 'bg-red-500 hover:bg-red-600'
                  )}>
                  {isAdvanceUsageDel ? <PiggyBank className="size-4" /> : <Trash2 className="size-4" />}
                  {isAdvanceUsageDel ? 'Отменить' : 'Удалить'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modals */}
      {showEdit && <EditFamilyModal familyId={familyId} onClose={() => setShowEdit(false)} />}

      {showApplyAdvance && (
        <ApplyAdvanceModal
          availableAdvance={availableAdvance}
          family={family}
          familyStudents={familyStudents}
          allSupportPayments={supportPayments}
          initialMonth={selectedMonth}
          onCancel={() => setShowApplyAdvance(false)}
          onConfirm={(input) => { applyAdvanceToMonth(input); setShowApplyAdvance(false); }}
        />
      )}

      {editAdvanceUsage && (
        <ApplyAdvanceModal
          availableAdvance={availableAdvance}
          family={family}
          familyStudents={familyStudents}
          allSupportPayments={supportPayments}
          initialMonth={editAdvanceUsage.month}
          editRecord={editAdvanceUsage}
          onCancel={() => setEditAdvanceUsage(null)}
          onConfirm={(input) => {
            updateSupportPayment(editAdvanceUsage.id, {
              month: input.month,
              amount: input.amount,
              appliedAmount: input.amount,
              overpaidAmount: 0,
              kind: 'advance_usage' as const,
              allocations: input.allocations,
              note: input.note,
            });
            setEditAdvanceUsage(null);
          }}
        />
      )}

      {/* Payment form modal */}
      {(openPaymentFor !== null || editPayment !== null) && (
        <PaymentFormModal
          family={family}
          familyStudents={familyStudents}
          allSupportPayments={supportPayments}
          currentMonth={selectedMonth}
          preselectedStudentId={openPaymentFor !== null && openPaymentFor !== 'family' && openPaymentFor !== 'edit' ? openPaymentFor : undefined}
          editPayment={editPayment ?? undefined}
          onClose={() => { setOpenPaymentFor(null); setEditPayment(null); }}
          onCreate={(input) => createSupportPayment(input)}
          onUpdate={(id, patch) => updateSupportPayment(id, patch)}
        />
      )}
    </div>
  );
}
