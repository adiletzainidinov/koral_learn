'use client';

import { Users, Wallet, TrendingDown, TrendingUp, CheckCircle2, Clock, AlertCircle, PiggyBank } from 'lucide-react';
import { formatAmount } from '@/entities/support/model/helpers';
import { cn } from '@/shared/lib/cn';
import type { SupportFamilyRow, ListPaymentStatus } from './types';

interface Props {
  allRows: SupportFamilyRow[];
  filteredCount: number;
  currentStatusFilter: string;
  onStatusFilter: (status: ListPaymentStatus | 'all') => void;
}

export function SupportSummary({ allRows, filteredCount, currentStatusFilter, onStatusFilter }: Props) {
  const totalFamilies = allRows.length;
  const totalExpected = allRows.reduce((s, r) => s + r.expectedAmount, 0);
  const totalPaid = allRows.reduce((s, r) => s + r.paidAmount, 0);
  const totalRemaining = allRows.reduce((s, r) => s + r.remainingAmount, 0);
  const totalAdvance = allRows.reduce((s, r) => s + r.availableAdvance, 0);
  const paidCount = allRows.filter((r) => r.paymentStatus === 'paid' || r.paymentStatus === 'overpaid').length;
  const partialCount = allRows.filter((r) => r.paymentStatus === 'partial').length;
  const unpaidCount = allRows.filter((r) => r.paymentStatus === 'unpaid').length;

  return (
    <div className="space-y-3 mb-5">
      {/* Main stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Семей"
          value={totalFamilies}
          sub={filteredCount !== totalFamilies ? `показано ${filteredCount}` : undefined}
          icon={<Users className="size-4" />}
          bg="bg-blue-50"
          color="text-blue-600"
        />
        <StatCard
          label="Ожидается"
          value={formatAmount(totalExpected)}
          icon={<TrendingDown className="size-4" />}
          bg="bg-slate-100"
          color="text-slate-600"
        />
        <StatCard
          label="Собрано"
          value={formatAmount(totalPaid)}
          icon={<Wallet className="size-4" />}
          bg="bg-emerald-50"
          color="text-emerald-600"
        />
        <StatCard
          label="Остаток"
          value={formatAmount(totalRemaining)}
          icon={<TrendingUp className="size-4" />}
          bg="bg-amber-50"
          color="text-amber-600"
        />
      </div>

      {/* Clickable status chips row */}
      <div className="flex flex-wrap gap-2">
        <StatusChip
          label="Оплачено"
          count={paidCount}
          status="paid"
          activeFilter={currentStatusFilter}
          dotColor="bg-emerald-500"
          onClick={onStatusFilter}
        />
        <StatusChip
          label="Частично"
          count={partialCount}
          status="partial"
          activeFilter={currentStatusFilter}
          dotColor="bg-amber-500"
          onClick={onStatusFilter}
        />
        <StatusChip
          label="Не оплачено"
          count={unpaidCount}
          status="unpaid"
          activeFilter={currentStatusFilter}
          dotColor="bg-rose-500"
          onClick={onStatusFilter}
        />
        {totalAdvance > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-xs font-medium text-blue-700">
            <PiggyBank className="size-3" />
            Аванс: {formatAmount(totalAdvance)}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
  bg,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  bg: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
      <div className={cn('size-9 rounded-xl flex items-center justify-center shrink-0', bg)}>
        <span className={color}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-slate-400 truncate">{label}</p>
        <p className="font-bold text-slate-900 text-base leading-tight truncate">{value}</p>
        {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

function StatusChip({
  label,
  count,
  status,
  activeFilter,
  dotColor,
  onClick,
}: {
  label: string;
  count: number;
  status: ListPaymentStatus | 'all';
  activeFilter: string;
  dotColor: string;
  onClick: (s: ListPaymentStatus | 'all') => void;
}) {
  const active = activeFilter === status;
  return (
    <button
      onClick={() => onClick(active ? 'all' : status)}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors',
        active
          ? 'bg-slate-900 border-slate-900 text-white'
          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
      )}
      aria-pressed={active}
    >
      <span className={cn('size-2 rounded-full shrink-0', active ? 'bg-white' : dotColor)} />
      {label}: {count}
    </button>
  );
}
