'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Pencil, Trash2, Phone, MessageCircle, Send, AtSign, MapPin,
  UserRound, Users, FileText, HeartHandshake, ChevronRight, Plus,
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { SectionCard } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';
import { Modal } from '@/shared/ui/modal';
import {
  useAppStore, useParentById, useStudentsByParentId, useFamilyByParentId, useFamilyPaymentsByFamilyId,
} from '@/store/app-store';
import {
  SUPPORT_PLANS, PLAN_COLORS, STATUS_COLORS, PAYMENT_STATUS_LABELS,
  calculateFamilyExpectedAmount, formatAmount, getCurrentMonth, formatMonth,
} from '@/entities/support/model/helpers';
import {
  PREFERRED_CONTACT_LABELS, normalizeParentRelation,
} from '@/entities/parent/model/types';
import {
  formatWhatsappLink, formatTelegramLink, formatInstagramLink,
} from '@/entities/parent/model/helpers';
import { cn } from '@/shared/lib/cn';

type Tab = 'children' | 'contacts' | 'notes' | 'support';

interface Props {
  parentId: string;
}

export function ParentDetail({ parentId }: Props) {
  const router = useRouter();
  const parent = useParentById(parentId);
  const children = useStudentsByParentId(parentId);
  const deleteParent = useAppStore((s) => s.deleteParent);

  const [tab, setTab] = useState<Tab>('children');
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!parent) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <UserRound className="size-8 text-slate-300" />
        <p className="text-lg font-semibold text-slate-700">Родитель не найден</p>
        <Button variant="outline" onClick={() => router.push('/parents')}>
          <ArrowLeft className="size-4" />Назад к списку
        </Button>
      </div>
    );
  }

  const initials = parent.fullName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  function handleDelete() {
    deleteParent(parentId);
    router.push('/parents');
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'children', label: `Дети (${children.length})` },
    { id: 'support', label: 'Поддержка' },
    { id: 'contacts', label: 'Контакты' },
    { id: 'notes', label: 'Заметки' },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="sticky top-14 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-200 -mx-6 xl:-mx-8 px-6 xl:px-8 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/parents')}
              className="size-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors shrink-0"
            >
              <ArrowLeft className="size-4" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{parent.fullName}</h1>
              <p className="text-sm text-slate-500">
                {parent.relation ? normalizeParentRelation(parent.relation) : 'Родитель'}
                {children.length > 0 && ` · ${children.length} ${children.length === 1 ? 'ученик' : 'ученика'}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/parents/${parentId}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="size-3.5" />Редактировать
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Profile card */}
      <div className="flex items-center gap-5 px-6 py-5 bg-white rounded-2xl border border-slate-200">
        <div className="size-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xl font-bold shrink-0">
          {initials || <UserRound className="size-7 text-emerald-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-slate-900">{parent.fullName}</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {parent.relation && (
              <Badge variant="emerald">{normalizeParentRelation(parent.relation)}</Badge>
            )}
            {parent.preferredContact && (
              <Badge variant="slate">
                Предпочитает: {PREFERRED_CONTACT_LABELS[parent.preferredContact]}
              </Badge>
            )}
          </div>
        </div>
        <a
          href={formatWhatsappLink(parent.whatsapp)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-50 text-green-700 hover:bg-green-100 transition-colors text-sm font-medium shrink-0"
        >
          <MessageCircle className="size-4" />
          WhatsApp
        </a>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              tab === t.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'children' && (
        <ChildrenTab children={children} />
      )}
      {tab === 'support' && (
        <SupportTab parentId={parentId} />
      )}
      {tab === 'contacts' && (
        <ContactsTab parent={parent} />
      )}
      {tab === 'notes' && (
        <NotesTab parent={parent} />
      )}

      {/* Delete confirm */}
      <Modal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        size="sm"
        title="Удалить родителя?"
        description={`«${parent.fullName}» будет удалён. Это действие нельзя отменить.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Отмена</Button>
            <Button variant="danger" onClick={handleDelete}>Удалить</Button>
          </>
        }
      >
        {children.length > 0 ? (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            У родителя {children.length}{' '}
            {children.length === 1 ? 'ученик' : 'ученика'} — у них будет снята привязка.
          </p>
        ) : (
          <p className="text-sm text-slate-500">Привязанных учеников нет — удаление безопасно.</p>
        )}
      </Modal>
    </div>
  );
}

function ChildrenTab({ children }: { children: ReturnType<typeof useStudentsByParentId> }) {
  if (children.length === 0) {
    return (
      <EmptyState
        icon={<Users className="size-5" />}
        title="Учеников не привязано"
        description="Привяжите ученика через форму редактирования ученика"
      />
    );
  }

  return (
    <SectionCard title="Дети" description="Ученики, привязанные к этому родителю">
      <div className="flex flex-col gap-2">
        {children.map((student) => {
          const initials = student.fullName.slice(0, 2).toUpperCase();
          return (
            <Link
              key={student.id}
              href={`/students/${student.id}`}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
            >
              <div className="size-9 rounded-full overflow-hidden bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold shrink-0">
                {student.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={student.avatar} alt={student.fullName} className="size-full object-cover" />
                ) : initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 group-hover:text-emerald-700 transition-colors">
                  {student.fullName}
                </p>
                <p className="text-xs text-slate-400">
                  {student.age} лет · Группа {student.group} · {student.totalPoints} баллов
                </p>
              </div>
              <ArrowLeft className="size-3.5 text-slate-300 group-hover:text-emerald-500 rotate-180 transition-colors" />
            </Link>
          );
        })}
      </div>
    </SectionCard>
  );
}

function ContactsTab({ parent }: { parent: ReturnType<typeof useParentById> }) {
  if (!parent) return null;

  return (
    <div className="grid grid-cols-2 gap-6">
      <SectionCard title="Контакты" description="Все способы связи">
        <div className="flex flex-col gap-3">
          <ContactRow icon={<UserRound className="size-3.5 text-slate-400" />}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Кем приходится</p>
            <p className="text-sm text-slate-700">{normalizeParentRelation(parent.relation)}</p>
          </ContactRow>
          <ContactRow icon={<MessageCircle className="size-3.5 text-green-500" />}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">WhatsApp</p>
            <a
              href={formatWhatsappLink(parent.whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-green-600 hover:underline"
            >
              {parent.whatsapp}
            </a>
          </ContactRow>

          {parent.phone && (
            <ContactRow icon={<Phone className="size-3.5 text-slate-400" />}>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Телефон</p>
              <a href={`tel:${parent.phone}`} className="text-sm text-slate-700 hover:text-emerald-600">
                {parent.phone}
              </a>
            </ContactRow>
          )}

          {parent.telegram && (
            <ContactRow icon={<Send className="size-3.5 text-blue-500" />}>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Telegram</p>
              <a
                href={formatTelegramLink(parent.telegram)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-500 hover:underline"
              >
                {parent.telegram}
              </a>
            </ContactRow>
          )}

          {parent.instagram && (
            <ContactRow icon={<AtSign className="size-3.5 text-pink-500" />}>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Instagram</p>
              <a
                href={formatInstagramLink(parent.instagram)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-pink-500 hover:underline"
              >
                {parent.instagram}
              </a>
            </ContactRow>
          )}
        </div>
      </SectionCard>

      {parent.address && (
        <SectionCard title="Адрес">
          <div className="flex items-start gap-2 text-sm text-slate-600">
            <MapPin className="size-4 text-slate-400 mt-0.5 shrink-0" />
            {parent.address}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

function NotesTab({ parent }: { parent: ReturnType<typeof useParentById> }) {
  if (!parent) return null;

  if (!parent.description && !parent.notes) {
    return (
      <EmptyState
        icon={<FileText className="size-5" />}
        title="Заметок пока нет"
        description="Добавьте описание при редактировании родителя"
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {parent.description && (
        <SectionCard title="Описание">
          <p className="text-sm text-slate-600 whitespace-pre-wrap">{parent.description}</p>
        </SectionCard>
      )}
      {parent.notes && (
        <SectionCard title="Внутренние заметки">
          <p className="text-sm text-slate-600 whitespace-pre-wrap">{parent.notes}</p>
        </SectionCard>
      )}
    </div>
  );
}

function SupportTab({ parentId }: { parentId: string }) {
  const family = useFamilyByParentId(parentId);
  const payments = useFamilyPaymentsByFamilyId(family?.id ?? '');
  const currentMonth = getCurrentMonth();
  const currentPayment = family ? payments.find((p) => p.month === currentMonth) : undefined;

  if (!family) {
    return (
      <EmptyState
        icon={<HeartHandshake className="size-5" />}
        title="Запись поддержки не создана"
        description="Создайте запись, чтобы отслеживать взносы этой семьи"
        action={
          <Link href="/support/families/new">
            <Button variant="outline">
              <Plus className="size-3.5" />Создать запись
            </Button>
          </Link>
        }
      />
    );
  }

  const plan = SUPPORT_PLANS[family.supportPlanType];
  const planColors = PLAN_COLORS[family.supportPlanType];
  const expectedAmount = currentPayment?.expectedAmount ?? calculateFamilyExpectedAmount(family);
  const paidAmount = currentPayment?.paidAmount ?? 0;
  const remaining = Math.max(0, expectedAmount - paidAmount);
  const status = currentPayment?.status ?? (expectedAmount === 0 ? 'paid' : 'unpaid');
  const statusColors = STATUS_COLORS[status];

  return (
    <SectionCard
      title="Учёт поддержки"
      description={`Запись семьи · ${formatMonth(currentMonth)}`}
    >
      <div className="space-y-4">
        {/* Plan badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium', planColors.badge)}>
              {plan.emoji} {plan.name}
            </span>
            <span className={cn('px-2.5 py-1 rounded-lg text-xs font-medium', statusColors.badge)}>
              {PAYMENT_STATUS_LABELS[status]}
            </span>
          </div>
          <Link
            href={`/support/families/${family.id}`}
            className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:underline"
          >
            Открыть запись <ChevronRight className="size-3" />
          </Link>
        </div>

        {/* Amount summary */}
        {expectedAmount > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center bg-slate-50 rounded-xl py-2.5">
              <p className="text-[10px] text-slate-400 mb-0.5">Ожидается</p>
              <p className="text-sm font-bold text-slate-800">{formatAmount(expectedAmount)}</p>
            </div>
            <div className="text-center bg-emerald-50 rounded-xl py-2.5">
              <p className="text-[10px] text-slate-400 mb-0.5">Оплачено</p>
              <p className="text-sm font-bold text-emerald-700">{formatAmount(paidAmount)}</p>
            </div>
            <div className={cn('text-center rounded-xl py-2.5', remaining > 0 ? 'bg-amber-50' : 'bg-slate-50')}>
              <p className="text-[10px] text-slate-400 mb-0.5">Остаток</p>
              <p className={cn('text-sm font-bold', remaining > 0 ? 'text-amber-700' : 'text-slate-400')}>
                {remaining > 0 ? formatAmount(remaining) : '—'}
              </p>
            </div>
          </div>
        )}

        {/* Lesson selections */}
        {family.lessonSelections && family.lessonSelections.length > 0 && (
          <div className="space-y-1.5 pt-1">
            {family.lessonSelections.filter((ls) => ls.isActive).map((ls) => {
              const c = PLAN_COLORS[ls.planType];
              return (
                <div key={ls.id} className="flex items-center justify-between text-xs px-2 py-1.5 rounded-lg bg-slate-50">
                  <span className={cn('px-1.5 py-0.5 rounded-md font-medium mr-2', c.badge)}>
                    {SUPPORT_PLANS[ls.planType].emoji}
                  </span>
                  <span className="flex-1 text-slate-600 truncate">
                    Ученик #{ls.studentId.slice(-4)}
                  </span>
                  <span className={cn('font-semibold', c.text)}>{formatAmount(ls.monthlyAmount)}</span>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-slate-400">{plan.educationLogic}</p>
      </div>
    </SectionCard>
  );
}

function ContactRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="size-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
