'use client';

import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { useAppStore, useFamilies } from '@/store/app-store';
import type { PaymentMethod } from '@/entities/support/model/types';
import {
  calculateFamilyExpectedAmount,
  calculatePaidForMonth,
  formatAmount,
  formatMonth,
  PAYMENT_METHOD_LABELS,
} from '@/entities/support/model/helpers';
import { cn } from '@/shared/lib/cn';

interface Props {
  familyId: string;
  month: string;
  onClose: () => void;
}

export function SupportPaymentModal({ familyId, month, onClose }: Props) {
  const families = useFamilies();
  const allSupportPayments = useAppStore((s) => s.supportPayments);
  const createSupportPayment = useAppStore((s) => s.createSupportPayment);

  const family = families.find((f) => f.id === familyId);
  const familyPayments = allSupportPayments.filter((p) => p.familyId === familyId);

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [comment, setComment] = useState('');

  if (!family) return null;

  const expectedAmount = calculateFamilyExpectedAmount(family);
  const paidAmount = calculatePaidForMonth(familyPayments, month);
  const remaining = Math.max(0, expectedAmount - paidAmount);
  const numAmount = Number(amount) || 0;

  function handleSubmit() {
    if (numAmount <= 0) return;
    createSupportPayment({
      familyId,
      month,
      amount: numAmount,
      appliedAmount: numAmount,
      overpaidAmount: 0,
      method,
      note: comment || undefined,
    });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Принять оплату</h2>
            <p className="text-sm text-slate-500">
              {family.name} · {formatMonth(month)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
            aria-label="Закрыть"
          >
            <X className="size-5" />
          </button>
        </div>

        {expectedAmount > 0 && (
          <div className="bg-slate-50 rounded-xl p-3 mb-4 flex gap-4 text-sm">
            <div>
              <p className="text-slate-400 text-xs">Ожидается</p>
              <p className="font-semibold text-slate-800">{formatAmount(expectedAmount)}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Оплачено</p>
              <p className="font-semibold text-emerald-600">{formatAmount(paidAmount)}</p>
            </div>
            {remaining > 0 && (
              <div>
                <p className="text-slate-400 text-xs">Остаток</p>
                <p className="font-semibold text-amber-600">{formatAmount(remaining)}</p>
              </div>
            )}
          </div>
        )}

        {remaining > 0 && (
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setAmount(String(remaining))}
              className="flex-1 py-2 px-3 rounded-xl border border-emerald-200 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
            >
              Полный остаток ({formatAmount(remaining)})
            </button>
            <button
              onClick={() => setAmount(String(Math.ceil(remaining / 2)))}
              className="flex-1 py-2 px-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Половина
            </button>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-600 mb-1.5">
            Сумма (сом)
          </label>
          <input
            type="number"
            min="0"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 font-medium text-slate-900"
            autoFocus
          />
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-600 mb-1.5">
            Способ оплаты
          </label>
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

        <div className="mb-5">
          <label className="block text-xs font-medium text-slate-600 mb-1.5">
            Комментарий
          </label>
          <input
            type="text"
            placeholder="Примечание..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
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

        <p className="text-[11px] text-slate-400 text-center mt-3">
          Для авансов и детального учёта —{' '}
          <a
            href={`/support/families/${familyId}`}
            className="text-emerald-600 hover:underline"
          >
            открыть карточку семьи
          </a>
        </p>
      </div>
    </div>
  );
}
