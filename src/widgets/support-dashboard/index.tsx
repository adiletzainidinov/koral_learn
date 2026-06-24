'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Plus, Search, AlertTriangle, ChevronLeft, ChevronRight,
  Check, SlidersHorizontal, X, Copy,
} from 'lucide-react';
import { useAppStore, useFamilies, useStudents, useParents } from '@/store/app-store';
import {
  SUPPORT_PLANS, PLAN_COLORS,
  calculateFamilyExpectedAmount,
  calculatePaidForMonth,
  calculateAvailableAdvance,
  calculateGiftTotal,
  getReminderMessage,
  formatAmount, formatMonth, getCurrentMonth,
} from '@/entities/support/model/helpers';
import type { SupportPlanType } from '@/entities/support/model/types';
import { cn } from '@/shared/lib/cn';
import type { SupportFamilyRow, ListPaymentStatus, SortKey, SortDir, DebtRange } from './types';
import { SupportSummary } from './support-summary';
import { SupportTable } from './support-table';
import { SupportPaymentModal } from './support-payment-modal';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => { setH(true); }, []);
  return h;
}

type PlanFilter = 'all' | SupportPlanType | 'mixed';
type StatusFilter = 'all' | ListPaymentStatus;

const STATUS_PRIORITY: Record<ListPaymentStatus, number> = {
  unpaid: 0, partial: 1, paid: 2, overpaid: 3, no_charge: 4,
};

// ─── Main Widget ──────────────────────────────────────────────────────────────

export function SupportDashboard() {
  const hydrated = useHydrated();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // ── URL state ──
  const month = searchParams.get('month') ?? getCurrentMonth();
  const qFromUrl = searchParams.get('q') ?? '';
  const statusFilter = (searchParams.get('status') ?? 'all') as StatusFilter;
  const planFilter = (searchParams.get('plan') ?? 'all') as PlanFilter;
  const sortKey = (searchParams.get('col') ?? 'status') as SortKey;
  const sortDir = (searchParams.get('dir') ?? 'asc') as SortDir;
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const pageSize = Number(searchParams.get('per') ?? '20');
  const debtRange = (searchParams.get('debt') ?? 'any') as DebtRange;
  const extraStr = searchParams.get('extra') ?? '';

  // ── Local state ──
  const [searchInput, setSearchInput] = useState(qFromUrl);
  const [paymentFamilyId, setPaymentFamilyId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showExtraFilters, setShowExtraFilters] = useState(false);
  const [copiedBulk, setCopiedBulk] = useState(false);

  // Sync search input when URL q changes externally (back/forward nav)
  useEffect(() => { setSearchInput(qFromUrl); }, [qFromUrl]);

  // Debounce search → URL (300ms)
  useEffect(() => {
    const t = setTimeout(() => {
      updateParams({ q: searchInput || null, page: null });
    }, 300);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  function updateParams(updates: Record<string, string | null>) {
    const next = new URLSearchParams(Array.from(searchParams.entries()));
    for (const [key, val] of Object.entries(updates)) {
      if (val === null || val === '') next.delete(key);
      else next.set(key, val);
    }
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  function setMonth(m: string) { updateParams({ month: m, page: null }); }
  function setStatusFilter(s: StatusFilter | 'all') { updateParams({ status: s === 'all' ? null : s, page: null }); }
  function setPlanFilter(p: PlanFilter) { updateParams({ plan: p === 'all' ? null : p, page: null }); }
  function setDebtRange(d: DebtRange) { updateParams({ debt: d === 'any' ? null : d, page: null }); }
  function setPage(p: number) { updateParams({ page: p === 1 ? null : String(p) }); }
  function setPageSize(ps: number) { updateParams({ per: ps === 20 ? null : String(ps), page: null }); }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      updateParams({ dir: sortDir === 'asc' ? 'desc' : 'asc' });
    } else {
      updateParams({ col: key, dir: 'asc' });
    }
  }

  function toggleExtra(filter: string) {
    const parts = extraStr.split(',').filter(Boolean);
    const idx = parts.indexOf(filter);
    if (idx >= 0) parts.splice(idx, 1);
    else parts.push(filter);
    updateParams({ extra: parts.join(',') || null, page: null });
  }

  function hasExtra(filter: string) {
    return extraStr.split(',').includes(filter);
  }

  function resetFilters() {
    updateParams({
      q: null, status: null, plan: null, col: null, dir: null,
      page: null, debt: null, extra: null,
    });
    setSearchInput('');
  }

  // ── Zustand data ──
  const families = useFamilies();
  const students = useStudents();
  const parents = useParents();
  const allSupportPayments = useAppStore((s) => s.supportPayments);
  const deduplicateSupportAccounts = useAppStore((s) => s.deduplicateSupportAccounts);

  const duplicateParentCount = useMemo(() => {
    const seen = new Set<string>();
    let dups = 0;
    families.forEach((f) => {
      if (!f.parentId) return;
      if (seen.has(f.parentId)) dups++;
      seen.add(f.parentId);
    });
    return dups;
  }, [families]);

  // ── Build view model ──
  const allRows = useMemo<SupportFamilyRow[]>(() => {
    return families.map((family) => {
      const familyPayments = allSupportPayments.filter((p) => p.familyId === family.id);
      const parent = parents.find((p) => p.id === family.parentId) ?? null;
      const familyStudents = students.filter((s) => family.studentIds.includes(s.id));
      const studentById = Object.fromEntries(familyStudents.map((s) => [s.id, s]));

      const expectedAmount = calculateFamilyExpectedAmount(family);
      const paidAmount = calculatePaidForMonth(familyPayments, month);
      const remainingAmount = Math.max(0, expectedAmount - paidAmount);
      const availableAdvance = calculateAvailableAdvance(familyPayments);
      const giftAmount = calculateGiftTotal(familyPayments);

      const paymentStatus: ListPaymentStatus =
        expectedAmount === 0 ? 'no_charge' :
        paidAmount > expectedAmount ? 'overpaid' :
        paidAmount >= expectedAmount ? 'paid' :
        paidAmount > 0 ? 'partial' :
        'unpaid';

      const plans: SupportPlanType[] =
        family.lessonSelections && family.lessonSelections.length > 0
          ? [...new Set(family.lessonSelections.filter((s) => s.isActive).map((s) => s.planType))]
          : [family.supportPlanType];

      const planTooltip =
        family.lessonSelections && family.lessonSelections.length > 0
          ? family.lessonSelections
              .filter((s) => s.isActive)
              .map((s) => `${studentById[s.studentId]?.fullName?.split(' ')[0] ?? '?'} — ${SUPPORT_PLANS[s.planType].name}`)
              .join('\n')
          : SUPPORT_PLANS[family.supportPlanType].name;

      return {
        familyId: family.id,
        familyName: family.name,
        parent,
        studentCount: family.studentIds.length,
        studentNames: familyStudents.map((s) => s.fullName),
        plans,
        hasMixedPlans: plans.length > 1,
        planTooltip,
        expectedAmount,
        paidAmount,
        remainingAmount,
        availableAdvance,
        giftAmount,
        paymentStatus,
        family,
      };
    });
  }, [families, allSupportPayments, parents, students, month]);

  // ── Filter ──
  const filteredRows = useMemo<SupportFamilyRow[]>(() => {
    let rows = allRows;

    if (qFromUrl) {
      const q = qFromUrl.toLowerCase().trim();
      const qPhone = q.replace(/[+\s\-()]/g, '');
      rows = rows.filter((row) => {
        if (row.familyName.toLowerCase().includes(q)) return true;
        if (row.parent?.fullName.toLowerCase().includes(q)) return true;
        const wa = (row.parent?.whatsapp ?? '').replace(/[+\s\-()]/g, '');
        if (qPhone && wa.includes(qPhone)) return true;
        const ph = (row.parent?.phone ?? '').replace(/[+\s\-()]/g, '');
        if (qPhone && ph.includes(qPhone)) return true;
        if (row.studentNames.some((n) => n.toLowerCase().includes(q))) return true;
        if (row.plans.some((p) => SUPPORT_PLANS[p].name.toLowerCase().includes(q))) return true;
        return false;
      });
    }

    if (statusFilter !== 'all') {
      rows = rows.filter((row) => row.paymentStatus === statusFilter);
    }

    if (planFilter !== 'all') {
      if (planFilter === 'mixed') {
        rows = rows.filter((row) => row.hasMixedPlans);
      } else {
        rows = rows.filter((row) => row.plans.includes(planFilter as SupportPlanType));
      }
    }

    if (hasExtra('hasDebt')) rows = rows.filter((row) => row.remainingAmount > 0);
    if (hasExtra('hasAdvance')) rows = rows.filter((row) => row.availableAdvance > 0);
    if (hasExtra('hasGift')) rows = rows.filter((row) => row.giftAmount > 0);
    if (hasExtra('noCharge')) rows = rows.filter((row) => row.expectedAmount === 0);

    if (debtRange !== 'any') {
      rows = rows.filter((row) => {
        const r = row.remainingAmount;
        if (debtRange === 'to1000') return r > 0 && r <= 1000;
        if (debtRange === '1000to3000') return r > 1000 && r <= 3000;
        if (debtRange === 'over3000') return r > 3000;
        return true;
      });
    }

    return rows;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRows, qFromUrl, statusFilter, planFilter, extraStr, debtRange]);

  // ── Sort ──
  const sortedRows = useMemo<SupportFamilyRow[]>(() => {
    return [...filteredRows].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      let cmp = 0;
      switch (sortKey) {
        case 'name': cmp = a.familyName.localeCompare(b.familyName, 'ru'); break;
        case 'students': cmp = a.studentCount - b.studentCount; break;
        case 'expected': cmp = a.expectedAmount - b.expectedAmount; break;
        case 'paid': cmp = a.paidAmount - b.paidAmount; break;
        case 'remaining': cmp = a.remainingAmount - b.remainingAmount; break;
        case 'advance': cmp = a.availableAdvance - b.availableAdvance; break;
        case 'status':
        default:
          cmp = STATUS_PRIORITY[a.paymentStatus] - STATUS_PRIORITY[b.paymentStatus];
          if (cmp === 0) cmp = b.remainingAmount - a.remainingAmount;
          return cmp * dir;
      }
      return cmp * dir;
    });
  }, [filteredRows, sortKey, sortDir]);

  // ── Paginate ──
  const totalCount = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const pagedRows = sortedRows.slice(startIdx, startIdx + pageSize);

  // ── Bulk selection ──
  const allPageSelected = pagedRows.length > 0 && pagedRows.every((r) => selectedIds.has(r.familyId));

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pagedRows.forEach((r) => next.delete(r.familyId));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pagedRows.forEach((r) => next.add(r.familyId));
        return next;
      });
    }
  }

  function copySelectedReminders() {
    const msgs = sortedRows
      .filter((r) => selectedIds.has(r.familyId) && r.remainingAmount > 0)
      .map((r) => getReminderMessage(r.parent?.fullName ?? r.familyName, r.remainingAmount, month))
      .join('\n\n---\n\n');
    if (msgs) {
      navigator.clipboard.writeText(msgs).then(() => {
        setCopiedBulk(true);
        setTimeout(() => setCopiedBulk(false), 2000);
      });
    }
  }

  const hasActiveFilters =
    qFromUrl || statusFilter !== 'all' || planFilter !== 'all' ||
    debtRange !== 'any' || extraStr;

  // ── Loading skeleton ──
  if (!hydrated) {
    return (
      <div className="p-4 md:p-6 max-w-[1440px] mx-auto animate-pulse space-y-4">
        <div className="h-8 w-48 bg-slate-100 rounded-xl" />
        <div className="grid grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-16 bg-slate-100 rounded-2xl" />)}
        </div>
        <div className="h-64 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-[1440px] mx-auto">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Поддержка</h1>
          <p className="text-sm text-slate-500 mt-0.5">Учёт взносов, семей и форматов обучения</p>
        </div>
        <Link
          href="/support/families/new"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          <Plus className="size-4" /> Добавить семью
        </Link>
      </div>

      {/* ── Dedup warning ── */}
      {duplicateParentCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 mb-5 rounded-xl bg-amber-50 border border-amber-200">
          <AlertTriangle className="size-4 text-amber-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800">
              Обнаружены дублирующиеся записи ({duplicateParentCount})
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Несколько записей поддержки привязаны к одному родителю.
            </p>
          </div>
          <button
            onClick={deduplicateSupportAccounts}
            className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-medium hover:bg-amber-700 shrink-0"
          >
            Объединить
          </button>
        </div>
      )}

      {/* ── Summary stats ── */}
      <SupportSummary
        allRows={allRows}
        filteredCount={filteredRows.length}
        currentStatusFilter={statusFilter}
        onStatusFilter={setStatusFilter}
      />

      {/* ── Toolbar ── */}
      <div className="space-y-3 mb-4">
        {/* Row 1: month + search */}
        <div className="flex gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shrink-0">
            <span className="text-xs text-slate-500 whitespace-nowrap">Месяц:</span>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="text-sm font-medium text-slate-700 focus:outline-none bg-transparent"
              aria-label="Расчётный месяц"
            />
          </div>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по семье, родителю, телефону или ученику..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <button
            onClick={() => setShowExtraFilters((v) => !v)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-colors',
              showExtraFilters || extraStr || debtRange !== 'any'
                ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            )}
            aria-expanded={showExtraFilters}
          >
            <SlidersHorizontal className="size-4" />
            Фильтры
            {(extraStr || debtRange !== 'any') && (
              <span className="size-2 rounded-full bg-emerald-500" />
            )}
          </button>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 transition-colors"
            >
              <X className="size-3.5" /> Сбросить
            </button>
          )}
        </div>

        {/* Row 2: Status + Plan filters */}
        <div className="flex gap-2 flex-wrap">
          {/* Status filter */}
          <div className="flex rounded-xl border border-slate-200 overflow-hidden text-xs font-medium">
            {(['all', 'unpaid', 'partial', 'paid'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setStatusFilter(v)}
                className={cn(
                  'px-3 py-2 transition-colors',
                  statusFilter === v ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                {v === 'all' ? 'Все' : v === 'unpaid' ? 'Не оплачено' : v === 'partial' ? 'Частично' : 'Оплачено'}
              </button>
            ))}
          </div>

          {/* Plan filter */}
          <div className="flex rounded-xl border border-slate-200 overflow-hidden text-xs font-medium">
            <button
              onClick={() => setPlanFilter('all')}
              className={cn('px-3 py-2 transition-colors', planFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-50')}
            >
              Все планы
            </button>
            {(Object.keys(SUPPORT_PLANS) as SupportPlanType[]).map((v) => (
              <button
                key={v}
                onClick={() => setPlanFilter(v)}
                title={SUPPORT_PLANS[v].name}
                className={cn(
                  'px-3 py-2 transition-colors whitespace-nowrap',
                  planFilter === v ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                {SUPPORT_PLANS[v].emoji}
              </button>
            ))}
            <button
              onClick={() => setPlanFilter('mixed')}
              title="Смешанные форматы"
              className={cn('px-3 py-2 transition-colors text-[10px]', planFilter === 'mixed' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-50')}
            >
              Микс
            </button>
          </div>

          {/* Page size */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-slate-500">По</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-400 bg-white"
              aria-label="Семей на странице"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Expanded extra filters */}
        {showExtraFilters && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              {[
                { key: 'hasDebt', label: 'Есть долг' },
                { key: 'hasAdvance', label: 'Есть аванс' },
                { key: 'hasGift', label: 'Есть хадия' },
                { key: 'noCharge', label: 'Без начисления' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={hasExtra(key)}
                    onChange={() => toggleExtra(key)}
                    className="rounded border-slate-300 accent-emerald-600"
                  />
                  {label}
                </label>
              ))}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Диапазон остатка</p>
              <div className="flex flex-wrap gap-2">
                {([
                  ['any', 'Любой'],
                  ['to1000', 'до 1 000'],
                  ['1000to3000', '1 000 – 3 000'],
                  ['over3000', 'больше 3 000'],
                ] as [DebtRange, string][]).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setDebtRange(val)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                      debtRange === val
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50 bg-white'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Bulk actions bar ── */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 mb-4 rounded-xl bg-slate-900 text-white flex-wrap">
          <span className="text-sm font-medium">Выбрано: {selectedIds.size}</span>
          <button
            onClick={copySelectedReminders}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              copiedBulk ? 'bg-emerald-600' : 'bg-white/20 hover:bg-white/30'
            )}
          >
            {copiedBulk ? <Check className="size-3" /> : <Copy className="size-3" />}
            {copiedBulk ? 'Скопировано!' : 'Копировать напоминания'}
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto flex items-center gap-1 text-xs text-white/70 hover:text-white"
          >
            <X className="size-3" /> Снять выделение
          </button>
        </div>
      )}

      {/* ── Table / Empty state ── */}
      {families.length === 0 ? (
        <EmptyState noFamilies />
      ) : filteredRows.length === 0 ? (
        <EmptyState noFamilies={false} onReset={resetFilters} />
      ) : (
        <>
          {/* Results summary */}
          <p className="text-xs text-slate-500 mb-3">
            Показано {startIdx + 1}–{Math.min(startIdx + pageSize, totalCount)} из {totalCount}{' '}
            {totalCount !== allRows.length && `(всего ${allRows.length})`} семей · {formatMonth(month)}
          </p>

          <SupportTable
            rows={pagedRows}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onSelectAll={toggleSelectAll}
            allPageSelected={allPageSelected}
            month={month}
            onPayment={setPaymentFamilyId}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={toggleSort}
          />

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
              <p className="text-sm text-slate-500">
                Страница {currentPage} из {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Предыдущая страница"
                >
                  <ChevronLeft className="size-4 text-slate-600" />
                </button>
                {buildPageRange(currentPage, totalPages).map((item, idx) =>
                  item === '...' ? (
                    <span key={`ellipsis-${idx}`} className="px-2 text-slate-400 text-sm">…</span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => setPage(Number(item))}
                      className={cn(
                        'min-w-[32px] h-8 rounded-lg text-sm font-medium transition-colors',
                        currentPage === Number(item)
                          ? 'bg-emerald-600 text-white'
                          : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                      )}
                    >
                      {item}
                    </button>
                  )
                )}
                <button
                  onClick={() => setPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Следующая страница"
                >
                  <ChevronRight className="size-4 text-slate-600" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Payment modal ── */}
      {paymentFamilyId && (
        <SupportPaymentModal
          familyId={paymentFamilyId}
          month={month}
          onClose={() => setPaymentFamilyId(null)}
        />
      )}
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ noFamilies, onReset }: { noFamilies: boolean; onReset?: () => void }) {
  return (
    <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
      <div className="size-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
        <span className="text-3xl">{noFamilies ? '🕌' : '🔍'}</span>
      </div>
      <h3 className="font-semibold text-slate-700 mb-1 text-lg">
        {noFamilies ? 'Семей пока нет' : 'Ничего не найдено'}
      </h3>
      <p className="text-sm text-slate-400 mb-4">
        {noFamilies
          ? 'Добавьте родителя и настройте поддержку его детей'
          : 'По заданным условиям семьи не найдены'}
      </p>
      {noFamilies ? (
        <Link
          href="/support/families/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          <Plus className="size-4" /> Добавить семью
        </Link>
      ) : (
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <X className="size-4" /> Сбросить фильтры
        </button>
      )}
    </div>
  );
}

// ── Pagination helper ────────────────────────────────────────────────────────

function buildPageRange(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [];
  const add = (n: number) => { if (!pages.includes(n)) pages.push(n); };
  add(1);
  if (current > 3) pages.push('...');
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) add(i);
  if (current < total - 2) pages.push('...');
  add(total);
  return pages;
}
