'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronUp, ChevronDown, ChevronsUpDown, MoreVertical,
  MessageCircle, Wallet, Copy, Check, ExternalLink, Phone,
} from 'lucide-react';
import {
  SUPPORT_PLANS, PLAN_COLORS, formatAmount, getReminderMessage, getThankYouMessage,
} from '@/entities/support/model/helpers';
import { formatWhatsappLink } from '@/entities/parent/model/helpers';
import { cn } from '@/shared/lib/cn';
import type { SupportFamilyRow, SortKey, SortDir, ListPaymentStatus } from './types';

const STATUS_STYLES: Record<ListPaymentStatus, string> = {
  paid: 'bg-emerald-100 text-emerald-700',
  partial: 'bg-amber-100 text-amber-700',
  unpaid: 'bg-rose-100 text-rose-700',
  overpaid: 'bg-blue-100 text-blue-700',
  no_charge: 'bg-slate-100 text-slate-500',
};

const STATUS_LABELS: Record<ListPaymentStatus, string> = {
  paid: 'Оплачено',
  partial: 'Частично',
  unpaid: 'Не оплачено',
  overpaid: 'Переплата',
  no_charge: 'Нет начисления',
};

interface TableProps {
  rows: SupportFamilyRow[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  allPageSelected: boolean;
  month: string;
  onPayment: (familyId: string) => void;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
}

export function SupportTable(props: TableProps) {
  const { rows, selectedIds, onToggleSelect, onSelectAll, allPageSelected, month, onPayment, sortKey, sortDir, onSort } = props;
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  function closeMenu() { setMenuOpenId(null); }
  function toggleMenu(id: string) {
    setMenuOpenId((prev) => (prev === id ? null : id));
  }

  if (rows.length === 0) return null;

  return (
    <>
      {/* Click-outside overlay for menus */}
      {menuOpenId && (
        <div className="fixed inset-0 z-10" onClick={closeMenu} aria-hidden="true" />
      )}

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="w-10 px-3 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  onChange={onSelectAll}
                  className="rounded border-slate-300 accent-emerald-600"
                  aria-label="Выбрать все на странице"
                />
              </th>
              <SortTh label="Семья" sortKey="name" current={sortKey} dir={sortDir} onSort={onSort} className="min-w-[160px]" />
              <th scope="col" className="px-3 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wide min-w-[170px]">
                Родитель
              </th>
              <SortTh label="Дети" sortKey="students" current={sortKey} dir={sortDir} onSort={onSort} className="min-w-[130px] hidden lg:table-cell" />
              <th scope="col" className="px-3 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wide min-w-[130px] hidden lg:table-cell">
                Форматы
              </th>
              <SortTh label="Ожидается" sortKey="expected" current={sortKey} dir={sortDir} onSort={onSort} className="min-w-[100px] text-right" align="right" />
              <SortTh label="Оплачено" sortKey="paid" current={sortKey} dir={sortDir} onSort={onSort} className="min-w-[100px] text-right hidden lg:table-cell" align="right" />
              <SortTh label="Остаток" sortKey="remaining" current={sortKey} dir={sortDir} onSort={onSort} className="min-w-[100px] text-right" align="right" />
              <SortTh label="Аванс" sortKey="advance" current={sortKey} dir={sortDir} onSort={onSort} className="min-w-[90px] text-right hidden xl:table-cell" align="right" />
              <SortTh label="Статус" sortKey="status" current={sortKey} dir={sortDir} onSort={onSort} className="min-w-[110px]" />
              <th scope="col" className="px-3 py-3 text-right font-semibold text-slate-600 text-xs uppercase tracking-wide min-w-[130px]">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <DesktopRow
                key={row.familyId}
                row={row}
                month={month}
                selected={selectedIds.has(row.familyId)}
                onToggleSelect={onToggleSelect}
                onPayment={onPayment}
                menuOpen={menuOpenId === row.familyId}
                onMenuToggle={toggleMenu}
                onMenuClose={closeMenu}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {rows.map((row) => (
          <MobileCard
            key={row.familyId}
            row={row}
            month={month}
            selected={selectedIds.has(row.familyId)}
            onToggleSelect={onToggleSelect}
            onPayment={onPayment}
          />
        ))}
      </div>
    </>
  );
}

function SortTh({
  label,
  sortKey,
  current,
  dir,
  onSort,
  className,
  align = 'left',
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
  className?: string;
  align?: 'left' | 'right';
}) {
  const active = current === sortKey;
  return (
    <th
      scope="col"
      className={cn(
        'px-3 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide cursor-pointer select-none hover:bg-slate-100 transition-colors',
        align === 'right' ? 'text-right' : 'text-left',
        className
      )}
      onClick={() => onSort(sortKey)}
      aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <span className="flex items-center gap-1 justify-inherit">
        {align === 'right' && (
          <SortIcon active={active} dir={dir} />
        )}
        {label}
        {align === 'left' && (
          <SortIcon active={active} dir={dir} />
        )}
      </span>
    </th>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown className="size-3 text-slate-300" />;
  return dir === 'asc'
    ? <ChevronUp className="size-3 text-emerald-600" />
    : <ChevronDown className="size-3 text-emerald-600" />;
}

function DesktopRow({
  row, month, selected, onToggleSelect, onPayment, menuOpen, onMenuToggle, onMenuClose,
}: {
  row: SupportFamilyRow;
  month: string;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onPayment: (id: string) => void;
  menuOpen: boolean;
  onMenuToggle: (id: string) => void;
  onMenuClose: () => void;
}) {
  const router = useRouter();
  const href = `/support/families/${row.familyId}`;

  function handleRowClick() {
    router.push(href);
  }

  const twoStudents = row.studentNames.slice(0, 2).map((n) => n.split(' ')[0]).join(', ');
  const extraStudents = row.studentCount > 2 ? `+${row.studentCount - 2}` : null;

  return (
    <tr
      className={cn(
        'group cursor-pointer hover:bg-slate-50 transition-colors',
        selected && 'bg-emerald-50/40'
      )}
      onClick={handleRowClick}
    >
      {/* Checkbox */}
      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(row.familyId)}
          className="rounded border-slate-300 accent-emerald-600"
          aria-label={`Выбрать семью ${row.familyName}`}
        />
      </td>

      {/* Семья */}
      <td className="px-3 py-3">
        <Link
          href={href}
          onClick={(e) => e.stopPropagation()}
          className="font-semibold text-slate-900 hover:text-emerald-700 transition-colors leading-snug"
        >
          {row.familyName}
        </Link>
      </td>

      {/* Родитель */}
      <td className="px-3 py-3">
        {row.parent ? (
          <div>
            <p className="text-slate-700 text-sm leading-snug truncate max-w-[160px]">
              {row.parent.fullName}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {row.parent.phone && (
                <span className="text-xs text-slate-400 flex items-center gap-0.5">
                  <Phone className="size-2.5" />
                  {row.parent.phone}
                </span>
              )}
              {row.parent.whatsapp && (
                <a
                  href={formatWhatsappLink(row.parent.whatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-green-600 hover:text-green-700"
                  aria-label={`WhatsApp ${row.parent.fullName}`}
                >
                  <MessageCircle className="size-3.5" />
                </a>
              )}
            </div>
          </div>
        ) : (
          <span className="text-xs text-slate-400">Не указан</span>
        )}
      </td>

      {/* Дети */}
      <td
        className="px-3 py-3 hidden lg:table-cell"
        title={row.studentNames.join('\n')}
      >
        <p className="text-sm text-slate-700">
          {twoStudents}
          {extraStudents && <span className="text-slate-400"> {extraStudents}</span>}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">
          {row.studentCount} {row.studentCount === 1 ? 'ученик' : row.studentCount < 5 ? 'ученика' : 'учеников'}
        </p>
      </td>

      {/* Форматы */}
      <td
        className="px-3 py-3 hidden lg:table-cell"
        title={row.planTooltip}
      >
        {row.hasMixedPlans ? (
          <span className="text-xs text-slate-500 italic">{row.plans.length} формата</span>
        ) : (
          <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', PLAN_COLORS[row.plans[0]].badge)}>
            {SUPPORT_PLANS[row.plans[0]].emoji} {SUPPORT_PLANS[row.plans[0]].name}
          </span>
        )}
      </td>

      {/* Ожидается */}
      <td className="px-3 py-3 text-right">
        {row.expectedAmount > 0 ? (
          <span className="text-sm font-medium text-slate-700">{formatAmount(row.expectedAmount)}</span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )}
      </td>

      {/* Оплачено */}
      <td className="px-3 py-3 text-right hidden lg:table-cell">
        {row.paidAmount > 0 ? (
          <span className="text-sm font-medium text-emerald-700">{formatAmount(row.paidAmount)}</span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )}
      </td>

      {/* Остаток */}
      <td className="px-3 py-3 text-right">
        {row.remainingAmount > 0 ? (
          <span className="text-sm font-semibold text-amber-700">{formatAmount(row.remainingAmount)}</span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )}
      </td>

      {/* Аванс */}
      <td className="px-3 py-3 text-right hidden xl:table-cell">
        {row.availableAdvance > 0 ? (
          <span className="text-sm font-medium text-blue-600">{formatAmount(row.availableAdvance)}</span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )}
      </td>

      {/* Статус */}
      <td className="px-3 py-3">
        <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap', STATUS_STYLES[row.paymentStatus])}>
          {STATUS_LABELS[row.paymentStatus]}
        </span>
      </td>

      {/* Действия */}
      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1 justify-end">
          {row.paymentStatus !== 'paid' && row.paymentStatus !== 'no_charge' && (
            <button
              onClick={() => onPayment(row.familyId)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors whitespace-nowrap"
              aria-label={`Внести оплату за семью ${row.familyName}`}
            >
              <Wallet className="size-3" />
              Оплата
            </button>
          )}
          <div className="relative">
            <button
              onClick={() => onMenuToggle(row.familyId)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
              aria-label={`Действия для семьи ${row.familyName}`}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <MoreVertical className="size-4" />
            </button>
            {menuOpen && (
              <RowMenu row={row} month={month} onPayment={onPayment} onClose={onMenuClose} />
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

function RowMenu({
  row, month, onPayment, onClose,
}: {
  row: SupportFamilyRow;
  month: string;
  onPayment: (id: string) => void;
  onClose: () => void;
}) {
  const [copiedReminder, setCopiedReminder] = useState(false);

  function handleCopyReminder() {
    const msg = getReminderMessage(
      row.parent?.fullName ?? row.familyName,
      row.remainingAmount,
      month
    );
    navigator.clipboard.writeText(msg).then(() => {
      setCopiedReminder(true);
      setTimeout(() => { setCopiedReminder(false); onClose(); }, 1500);
    });
  }

  return (
    <div
      className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1.5 w-52 text-sm"
      role="menu"
    >
      <MenuLink href={`/support/families/${row.familyId}`} onClose={onClose} label="Открыть семью" icon={<ExternalLink className="size-3.5" />} />
      {row.paymentStatus !== 'no_charge' && (
        <MenuBtn onClick={() => { onPayment(row.familyId); onClose(); }} label="Внести оплату" icon={<Wallet className="size-3.5" />} />
      )}
      {row.remainingAmount > 0 && (
        <MenuBtn
          onClick={handleCopyReminder}
          label={copiedReminder ? 'Скопировано!' : 'Скопировать напоминание'}
          icon={copiedReminder ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
        />
      )}
      {row.parent?.whatsapp && (
        <MenuLink
          href={formatWhatsappLink(row.parent.whatsapp)}
          onClose={onClose}
          label="Написать в WhatsApp"
          icon={<MessageCircle className="size-3.5" />}
          external
        />
      )}
      {row.parent && (
        <MenuLink href={`/parents/${row.parent.id}`} onClose={onClose} label="Открыть родителя" icon={<ExternalLink className="size-3.5" />} />
      )}
    </div>
  );
}

function MenuLink({
  href, onClose, label, icon, external,
}: {
  href: string;
  onClose: () => void;
  label: string;
  icon: React.ReactNode;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      onClick={onClose}
      className="flex items-center gap-2.5 px-4 py-2 hover:bg-slate-50 text-slate-700 transition-colors"
      role="menuitem"
    >
      <span className="text-slate-400">{icon}</span>
      {label}
    </a>
  );
}

function MenuBtn({ onClick, label, icon }: { onClick: () => void; label: string; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-slate-50 text-slate-700 transition-colors"
      role="menuitem"
    >
      <span className="text-slate-400">{icon}</span>
      {label}
    </button>
  );
}

function MobileCard({
  row, month, selected, onToggleSelect, onPayment,
}: {
  row: SupportFamilyRow;
  month: string;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onPayment: (id: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  function handleCopyReminder(e: React.MouseEvent) {
    e.stopPropagation();
    const msg = getReminderMessage(
      row.parent?.fullName ?? row.familyName,
      row.remainingAmount,
      month
    );
    navigator.clipboard.writeText(msg).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className={cn('bg-white rounded-2xl border border-slate-200 p-4', selected && 'border-emerald-400 bg-emerald-50/30')}>
      {/* Header row */}
      <div className="flex items-start gap-3 mb-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(row.familyId)}
          className="mt-1 rounded border-slate-300 accent-emerald-600 shrink-0"
          aria-label={`Выбрать ${row.familyName}`}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <Link
              href={`/support/families/${row.familyId}`}
              className="font-semibold text-slate-900 hover:text-emerald-700 transition-colors leading-snug"
            >
              {row.familyName}
            </Link>
            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full shrink-0', STATUS_STYLES[row.paymentStatus])}>
              {STATUS_LABELS[row.paymentStatus]}
            </span>
          </div>
          {row.parent && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-sm text-slate-500 truncate">{row.parent.fullName}</p>
              {row.parent.whatsapp && (
                <a
                  href={formatWhatsappLink(row.parent.whatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-600 shrink-0"
                  aria-label="WhatsApp"
                >
                  <MessageCircle className="size-3.5" />
                </a>
              )}
            </div>
          )}
          <p className="text-xs text-slate-400 mt-0.5">
            {row.studentNames.slice(0, 2).map((n) => n.split(' ')[0]).join(', ')}
            {row.studentCount > 2 && ` +${row.studentCount - 2}`}
            {' · '}{row.studentCount} {row.studentCount === 1 ? 'ученик' : row.studentCount < 5 ? 'ученика' : 'учеников'}
          </p>
        </div>
      </div>

      {/* Amounts */}
      {row.expectedAmount > 0 && (
        <div className="flex gap-2 mb-3">
          <AmountChip label="Ожидается" value={formatAmount(row.expectedAmount)} color="text-slate-700" />
          {row.paidAmount > 0 && (
            <AmountChip label="Оплачено" value={formatAmount(row.paidAmount)} color="text-emerald-700" />
          )}
          {row.remainingAmount > 0 && (
            <AmountChip label="Остаток" value={formatAmount(row.remainingAmount)} color="text-amber-700" />
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {row.paymentStatus !== 'paid' && row.paymentStatus !== 'no_charge' && (
          <button
            onClick={(e) => { e.stopPropagation(); onPayment(row.familyId); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors"
          >
            <Wallet className="size-3.5" /> Оплата
          </button>
        )}
        {row.remainingAmount > 0 && (
          <button
            onClick={handleCopyReminder}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-colors',
              copied
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            )}
          >
            {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
            {copied ? 'Скопировано' : 'Напоминание'}
          </button>
        )}
        <Link
          href={`/support/families/${row.familyId}`}
          className="ml-auto flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 transition-colors"
        >
          Открыть
          <ExternalLink className="size-3" />
        </Link>
      </div>
    </div>
  );
}

function AmountChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex-1 text-center px-2 py-1.5 bg-slate-50 rounded-lg">
      <p className="text-[10px] text-slate-400">{label}</p>
      <p className={cn('text-xs font-semibold', color)}>{value}</p>
    </div>
  );
}
