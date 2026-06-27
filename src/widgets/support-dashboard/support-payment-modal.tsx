'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { X, Check, PiggyBank, Gift, ChevronRight, Copy } from 'lucide-react';
import {
  useAppStore, useFamilies, useFamilyContacts, useMonthlyCharge,
} from '@/store/app-store';
import type { PaymentMethod, OverpaymentType } from '@/entities/support/model/types';
import {
  calculatePaidForMonth, getStudentMonthPaid,
  formatAmount, formatMonth,
  PAYMENT_METHOD_LABELS,
  prepareSupportPayment,
  getExpectedForMonth,
  getStudentExpectedForMonth,
  getThankYouMessage,
  distributeAmongStudents,
} from '@/entities/support/model/helpers';
import { cn } from '@/shared/lib/cn';

interface Props {
  familyId: string;
  month: string;
  onClose: () => void;
}

const PAID_BY_OTHER = '__other__';
const PAID_BY_NONE = '';

// ─── Success state ────────────────────────────────────────────────────────────

interface SuccessInfo {
  appliedAmount: number;
  overpaidAmount: number;
  overpaymentType?: OverpaymentType;
  payerName?: string;
  month: string;
}

function SuccessPanel({
  info,
  familyId,
  familyName,
  onClose,
}: {
  info: SuccessInfo;
  familyId: string;
  familyName: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function copyThankYou() {
    const msg = getThankYouMessage(info.payerName ?? familyName, info.month);
    navigator.clipboard.writeText(msg).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="p-6">
      <div className="flex flex-col items-center mb-5 text-center">
        <div className="size-14 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
          <Check className="size-7 text-emerald-600" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Оплата сохранена</h2>
        <p className="text-sm text-slate-500 mt-0.5">{familyName} · {formatMonth(info.month)}</p>
      </div>

      <div className="bg-slate-50 rounded-xl p-4 mb-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">За {formatMonth(info.month)}</span>
          <span className="font-semibold text-emerald-700">{formatAmount(info.appliedAmount)}</span>
        </div>
        {info.overpaidAmount > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-500">
              {info.overpaymentType === 'advance' ? 'Аванс' : 'Хадия'}
            </span>
            <span className="font-semibold text-blue-600">{formatAmount(info.overpaidAmount)}</span>
          </div>
        )}
        {info.payerName && (
          <div className="flex justify-between">
            <span className="text-slate-500">Плательщик</span>
            <span className="font-medium text-slate-700">{info.payerName}</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <button
          onClick={copyThankYou}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-colors',
            copied
              ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
          )}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? 'Скопировано!' : 'Скопировать благодарность'}
        </button>
        <a
          href={`/support/families/${familyId}`}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Открыть карточку семьи <ChevronRight className="size-4" />
        </a>
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          Закрыть
        </button>
      </div>
    </div>
  );
}

// ─── Confirm close dialog ─────────────────────────────────────────────────────

function ConfirmCloseDialog({ onContinue, onDiscard }: { onContinue: () => void; onDiscard: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 className="text-base font-bold text-slate-900 mb-2">Отменить внесение оплаты?</h3>
        <p className="text-sm text-slate-500 mb-5">Введённые данные не будут сохранены.</p>
        <div className="flex gap-3">
          <button
            onClick={onContinue}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Продолжить заполнение
          </button>
          <button
            onClick={onDiscard}
            className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-medium hover:bg-rose-700"
          >
            Отменить оплату
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function SupportPaymentModal({ familyId, month, onClose }: Props) {
  const families = useFamilies();
  const allSupportPayments = useAppStore((s) => s.supportPayments);
  const createSupportPayment = useAppStore((s) => s.createSupportPayment);
  const ensureMonthlyCharge = useAppStore((s) => s.ensureMonthlyCharge);
  const familyContacts = useFamilyContacts(familyId);
  const allStudents = useAppStore((s) => s.students);

  const family = families.find((f) => f.id === familyId);

  // Ensure monthly charge snapshot exists
  const monthlyCharge = useMonthlyCharge(familyId, month);
  useEffect(() => {
    if (family && !monthlyCharge) {
      ensureMonthlyCharge(familyId, month);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId, month, family?.id]);

  const familyStudents = useMemo(
    () => allStudents.filter((s) => family?.studentIds.includes(s.id)),
    [allStudents, family]
  );

  const familyPayments = useMemo(
    () => allSupportPayments.filter((p) => p.familyId === familyId && p.month === month),
    [allSupportPayments, familyId, month]
  );

  // ── Form state ──
  const [amountStr, setAmountStr] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [comment, setComment] = useState('');
  const [paidBy, setPaidBy] = useState<string>(() => {
    if (!family) return PAID_BY_NONE;
    return family.billingContactId ?? family.primaryContactId ?? PAID_BY_NONE;
  });
  const [paidByOtherName, setPaidByOtherName] = useState('');
  const [overpaymentType, setOverpaymentType] = useState<OverpaymentType | ''>('');
  const [targetMode, setTargetMode] = useState<'all' | 'selected'>('all');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [successInfo, setSuccessInfo] = useState<SuccessInfo | null>(null);
  const [errors, setErrors] = useState<{ amount?: string; overpayment?: string }>({});

  const isDirty = amountStr !== '' || comment !== '' || paidByOtherName !== '';

  // ── Calculations ──
  const numAmount = Number(amountStr) || 0;
  const expectedAmount = family ? getExpectedForMonth(family, monthlyCharge) : 0;
  const alreadyPaidAmount = calculatePaidForMonth(familyPayments, month);
  const remainingAmount = Math.max(0, expectedAmount - alreadyPaidAmount);

  const activeStudents = useMemo(() => familyStudents.filter((s) => {
    const sel = family?.lessonSelections?.find((ls) => ls.studentId === s.id && ls.isActive);
    return !!sel;
  }), [familyStudents, family]);

  const targetStudents = useMemo(() => {
    if (targetMode === 'all') return activeStudents;
    return activeStudents.filter((s) => selectedStudentIds.includes(s.id));
  }, [targetMode, activeStudents, selectedStudentIds]);

  const studentsWithDebt = useMemo(() =>
    targetStudents.map((s) => ({
      id: s.id,
      name: s.fullName.split(' ')[0],
      expectedAmount: getStudentExpectedForMonth(s.id, family!, monthlyCharge),
      alreadyPaid: getStudentMonthPaid(s.id, familyPayments),
    })).filter((s) => s.expectedAmount > 0),
  [targetStudents, family, monthlyCharge, familyPayments]);

  const prepared = useMemo(() => {
    if (!family || numAmount <= 0) return null;
    const targetExpected = studentsWithDebt.reduce((s, st) => s + st.expectedAmount, 0) || expectedAmount;
    const targetPaid = studentsWithDebt.reduce((s, st) => s + st.alreadyPaid, 0) || alreadyPaidAmount;
    return prepareSupportPayment(
      numAmount,
      targetExpected,
      targetPaid,
      studentsWithDebt.map((s) => ({ id: s.id, expectedAmount: s.expectedAmount, alreadyPaid: s.alreadyPaid }))
    );
  }, [numAmount, family, studentsWithDebt, expectedAmount, alreadyPaidAmount]);

  const appliedAmount = prepared?.appliedAmount ?? 0;
  const overpaidAmount = prepared?.overpaidAmount ?? 0;
  const distribution = prepared?.distribution ?? [];
  const isOverpaid = overpaidAmount > 0;

  // Escape key protection
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (successInfo) { onClose(); return; }
        if (isDirty) setShowConfirmClose(true);
        else onClose();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isDirty, onClose, successInfo]);

  const handleCloseRequest = useCallback(() => {
    if (successInfo) { onClose(); return; }
    if (isDirty) setShowConfirmClose(true);
    else onClose();
  }, [isDirty, onClose, successInfo]);

  if (!family) return null;

  function validate() {
    const errs: typeof errors = {};
    if (numAmount <= 0) errs.amount = 'Введите сумму';
    if (isOverpaid && !overpaymentType) errs.overpayment = 'Выберите, что делать с переплатой';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;

    let paidByContactId: string | undefined;
    let paidByNameSnapshot: string | undefined;
    let payerDisplayName: string | undefined;

    if (paidBy === PAID_BY_OTHER) {
      paidByNameSnapshot = paidByOtherName.trim() || undefined;
      payerDisplayName = paidByNameSnapshot;
    } else if (paidBy && paidBy !== PAID_BY_NONE) {
      paidByContactId = paidBy;
      payerDisplayName = familyContacts.find((c) => c.id === paidBy)?.fullName;
    }

    const finalDistribution = distribution.length > 0
      ? distribution
      : studentsWithDebt.length > 0
        ? distributeAmongStudents(
            appliedAmount,
            studentsWithDebt.map((s) => ({ id: s.id, expectedAmount: s.expectedAmount, alreadyPaid: s.alreadyPaid }))
          )
        : undefined;

    createSupportPayment({
      familyId,
      month,
      amount: numAmount,
      appliedAmount,
      overpaidAmount,
      overpaymentType: isOverpaid ? (overpaymentType as OverpaymentType) : undefined,
      distribution: finalDistribution,
      method,
      note: comment.trim() || undefined,
      paidByContactId,
      paidByNameSnapshot,
    });

    setSuccessInfo({
      appliedAmount,
      overpaidAmount,
      overpaymentType: isOverpaid ? (overpaymentType as OverpaymentType) : undefined,
      payerName: payerDisplayName,
      month,
    });
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        onClick={(e) => { if (e.target === e.currentTarget) handleCloseRequest(); }}
      >
        <div
          className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {successInfo ? 'Оплата принята' : 'Принять оплату'}
              </h2>
              <p className="text-sm text-slate-500">
                {family.name} · {formatMonth(month)}
              </p>
            </div>
            <button
              onClick={handleCloseRequest}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
              aria-label="Закрыть"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Success state */}
          {successInfo ? (
            <div className="overflow-y-auto flex-1">
              <SuccessPanel
                info={successInfo}
                familyId={familyId}
                familyName={family.name}
                onClose={onClose}
              />
            </div>
          ) : (
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">

              {/* Expected / Paid / Remaining summary */}
              {expectedAmount > 0 && (
                <div className="bg-slate-50 rounded-xl p-3 flex gap-4 text-sm">
                  <div>
                    <p className="text-slate-400 text-xs">Ожидается</p>
                    <p className="font-semibold text-slate-800">{formatAmount(expectedAmount)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Оплачено</p>
                    <p className="font-semibold text-emerald-600">{formatAmount(alreadyPaidAmount)}</p>
                  </div>
                  {remainingAmount > 0 ? (
                    <div>
                      <p className="text-slate-400 text-xs">Остаток</p>
                      <p className="font-semibold text-amber-600">{formatAmount(remainingAmount)}</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-slate-400 text-xs">Статус</p>
                      <p className="font-semibold text-emerald-600 text-xs mt-0.5">Оплачено ✓</p>
                    </div>
                  )}
                </div>
              )}

              {/* Student target selector */}
              {activeStudents.length > 1 && (
                <div>
                  <p className="text-xs font-medium text-slate-600 mb-1.5">Кому зачислить?</p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setTargetMode('all')}
                      className={cn(
                        'px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors',
                        targetMode === 'all'
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      )}
                    >
                      Всей семье
                    </button>
                    <button
                      onClick={() => setTargetMode('selected')}
                      className={cn(
                        'px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors',
                        targetMode === 'selected'
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      )}
                    >
                      Выбрать учеников
                    </button>
                  </div>
                  {targetMode === 'selected' && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {activeStudents.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => setSelectedStudentIds((prev) =>
                            prev.includes(s.id)
                              ? prev.filter((id) => id !== s.id)
                              : [...prev, s.id]
                          )}
                          className={cn(
                            'px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors',
                            selectedStudentIds.includes(s.id)
                              ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          )}
                        >
                          {s.fullName.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Amount input */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Полученная сумма (сом)
                </label>
                {remainingAmount > 0 && (
                  <div className="flex gap-2 mb-2">
                    <button
                      onClick={() => { setAmountStr(String(remainingAmount)); setErrors((p) => ({ ...p, amount: undefined })); }}
                      className="flex-1 py-1.5 px-2 rounded-xl border border-emerald-200 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                    >
                      Весь остаток ({formatAmount(remainingAmount)})
                    </button>
                    <button
                      onClick={() => { setAmountStr(String(Math.ceil(remainingAmount / 2))); setErrors((p) => ({ ...p, amount: undefined })); }}
                      className="flex-1 py-1.5 px-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      Половина
                    </button>
                    <button
                      onClick={() => { setAmountStr('1000'); setErrors((p) => ({ ...p, amount: undefined })); }}
                      className="py-1.5 px-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      1 000
                    </button>
                  </div>
                )}
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={amountStr}
                  onChange={(e) => { setAmountStr(e.target.value); setErrors((p) => ({ ...p, amount: undefined })); }}
                  className={cn(
                    'w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 font-medium text-slate-900',
                    errors.amount ? 'border-red-300 focus:ring-red-400' : 'border-slate-200 focus:ring-emerald-400'
                  )}
                  autoFocus
                />
                {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
              </div>

              {/* Distribution preview */}
              {numAmount > 0 && studentsWithDebt.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs font-semibold text-slate-500 mb-2">Распределение оплаты</p>
                  <div className="space-y-1.5">
                    {studentsWithDebt.map((s) => {
                      const d = distribution.find((x) => x.studentId === s.id);
                      const give = d?.amount ?? 0;
                      const debt = Math.max(0, s.expectedAmount - s.alreadyPaid);
                      const fullyPaid = give >= debt && debt > 0;
                      return (
                        <div key={s.id} className="flex items-center justify-between text-xs">
                          <span className="text-slate-700 font-medium">{s.name}</span>
                          <span className={cn('font-semibold', fullyPaid ? 'text-emerald-600' : 'text-amber-600')}>
                            {give > 0 ? formatAmount(give) : '—'}
                            {fullyPaid && ' ✓'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Overpayment section */}
              {isOverpaid && (
                <div className={cn(
                  'rounded-xl border p-3',
                  errors.overpayment ? 'border-red-300 bg-red-50' : 'border-amber-200 bg-amber-50'
                )}>
                  <p className="text-xs font-semibold text-slate-700 mb-1">
                    Переплата: {formatAmount(overpaidAmount)}
                  </p>
                  <p className="text-xs text-slate-500 mb-2">
                    К месяцу зачтётся {formatAmount(appliedAmount)} — остальное нужно распределить:
                  </p>
                  <div className="space-y-1.5">
                    {(
                      [
                        { type: 'advance' as const, icon: <PiggyBank className="size-3.5 text-blue-500" />, label: 'Аванс на следующий месяц', desc: 'Переплата зачтётся в будущем' },
                        { type: 'gift' as const, icon: <Gift className="size-3.5 text-purple-500" />, label: 'Хадия / пожертвование', desc: 'Дополнительный вклад в обучение' },
                      ] as const
                    ).map(({ type, icon, label, desc }) => (
                      <button
                        key={type}
                        onClick={() => { setOverpaymentType(type); setErrors((p) => ({ ...p, overpayment: undefined })); }}
                        className={cn(
                          'w-full flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-colors',
                          overpaymentType === type
                            ? 'border-emerald-400 bg-white'
                            : 'border-transparent bg-white/70 hover:bg-white'
                        )}
                      >
                        <div className={cn(
                          'size-4 rounded-full border-2 shrink-0 flex items-center justify-center',
                          overpaymentType === type ? 'border-emerald-500' : 'border-slate-300'
                        )}>
                          {overpaymentType === type && <div className="size-2 rounded-full bg-emerald-500" />}
                        </div>
                        {icon}
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-700">{label}</p>
                          <p className="text-[10px] text-slate-400">{desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  {errors.overpayment && (
                    <p className="text-xs text-red-500 mt-1.5">{errors.overpayment}</p>
                  )}
                </div>
              )}

              {/* Payer */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Кто внёс оплату?</label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPaidBy(PAID_BY_NONE)}
                    className={cn(
                      'px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors',
                      paidBy === PAID_BY_NONE
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    Не указано
                  </button>
                  {familyContacts.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setPaidBy(c.id)}
                      className={cn(
                        'px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors',
                        paidBy === c.id
                          ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      )}
                    >
                      {c.fullName.split(' ')[0]}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPaidBy(PAID_BY_OTHER)}
                    className={cn(
                      'px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors',
                      paidBy === PAID_BY_OTHER
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    Другой
                  </button>
                </div>
                {paidBy === PAID_BY_OTHER && (
                  <input
                    type="text"
                    placeholder="Имя плательщика"
                    value={paidByOtherName}
                    onChange={(e) => setPaidByOtherName(e.target.value)}
                    className="w-full mt-2 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                )}
              </div>

              {/* Payment method */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Способ оплаты</label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMethod(m)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                        method === m
                          ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      )}
                    >
                      {PAYMENT_METHOD_LABELS[m]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Комментарий</label>
                <input
                  type="text"
                  placeholder="Примечание..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              {/* Preview summary before submit */}
              {numAmount > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs">
                  <p className="font-semibold text-emerald-800 mb-1.5">Итог:</p>
                  <p className="text-emerald-700">
                    {formatAmount(appliedAmount)} будет зачислено за {formatMonth(month)}
                  </p>
                  {overpaidAmount > 0 && overpaymentType && (
                    <p className="text-blue-600 mt-0.5">
                      {formatAmount(overpaidAmount)} будет сохранено как{' '}
                      {overpaymentType === 'advance' ? 'аванс' : 'хадия'}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Footer actions */}
          {!successInfo && (
            <div className="flex gap-3 px-6 py-4 border-t border-slate-100 shrink-0">
              <button
                onClick={handleCloseRequest}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Отмена
              </button>
              <button
                onClick={handleSubmit}
                disabled={numAmount <= 0}
                className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-40 flex items-center justify-center gap-1.5"
              >
                <Check className="size-4" />
                {numAmount > 0 ? `Принять ${formatAmount(numAmount)}` : 'Принять'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Confirm close overlay */}
      {showConfirmClose && (
        <ConfirmCloseDialog
          onContinue={() => setShowConfirmClose(false)}
          onDiscard={() => { setShowConfirmClose(false); onClose(); }}
        />
      )}
    </>
  );
}
