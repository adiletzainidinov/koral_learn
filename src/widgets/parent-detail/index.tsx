'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Pencil, Archive, ArchiveRestore, Phone, MessageCircle, Send, AtSign,
  UserRound, Users, FileText, HeartHandshake, ChevronRight, Plus,
} from 'lucide-react';
import { Breadcrumb } from '@/shared/ui/breadcrumb';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { SectionCard } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';
import { Modal } from '@/shared/ui/modal';
import {
  useAppStore, useFamilyContactById, useContactStudentLinks, useStudents, useFamilyById,
  useFamilyPaymentsByFamilyId,
} from '@/store/app-store';
import {
  SUPPORT_PLANS, PLAN_COLORS, STATUS_COLORS, PAYMENT_STATUS_LABELS,
  calculateFamilyExpectedAmount, formatAmount, getCurrentMonth, formatMonth,
} from '@/entities/support/model/helpers';
import {
  PREFERRED_CONTACT_METHOD_LABELS,
  FAMILY_RELATION_LABELS,
} from '@/entities/family-contact/model/types';
import {
  formatWhatsappLink, formatTelegramLink, formatInstagramLink,
  formatContactRelation, getContactInitials,
} from '@/entities/family-contact/model/helpers';
import { cn } from '@/shared/lib/cn';

type Tab = 'children' | 'contacts' | 'notes' | 'support';

interface Props {
  /** The URL still uses `parentId` slug for backward compat — this is the FamilyContact id */
  contactId: string;
}

export function ParentDetail({ contactId }: Props) {
  const router = useRouter();
  const contact = useFamilyContactById(contactId);
  const links = useContactStudentLinks(contactId);
  const students = useStudents();
  const archiveFamilyContact = useAppStore((s) => s.archiveFamilyContact);
  const restoreFamilyContact = useAppStore((s) => s.restoreFamilyContact);

  const childRows = useMemo(() => {
    const map = new Map<string, typeof students[number]>(students.map((s) => [s.id, s]));
    return links
      .map((link) => ({ link, student: map.get(link.studentId) }))
      .filter((row): row is { link: typeof links[number]; student: typeof students[number] } => !!row.student);
  }, [links, students]);

  const [tab, setTab] = useState<Tab>('children');
  const [confirmArchive, setConfirmArchive] = useState(false);

  if (!contact) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <UserRound className="size-8 text-slate-300" />
        <p className="text-lg font-semibold text-slate-700">Представитель не найден</p>
        <Button variant="outline" onClick={() => router.push('/families?tab=representatives')}>
          <ArrowLeft className="size-4" />Назад к списку
        </Button>
      </div>
    );
  }

  const initials = getContactInitials(contact.fullName);

  function handleArchive() {
    archiveFamilyContact(contactId);
    setConfirmArchive(false);
  }

  function handleRestore() {
    restoreFamilyContact(contactId);
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'children', label: `Дети (${childRows.length})` },
    { id: 'support', label: 'Поддержка' },
    { id: 'contacts', label: 'Контакты' },
    { id: 'notes', label: 'Заметки' },
  ];

  // Determine the family this contact belongs to (for the "primary" badge label)
  const familyId = contact.familyId;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="sticky top-14 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-200 -mx-6 xl:-mx-8 px-6 xl:px-8 py-4">
        <Breadcrumb
          items={[
            { label: 'Семьи', href: '/families' },
            { label: 'Представители', href: '/families?tab=representatives' },
            { label: contact.fullName },
          ]}
        />
        <div className="flex items-center justify-between gap-4 mt-1">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/families?tab=representatives')}
              className="size-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors shrink-0"
            >
              <ArrowLeft className="size-4" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{contact.fullName}</h1>
              <p className="text-sm text-slate-500">
                Представитель семьи
                {childRows.length > 0 && ` · ${childRows.length} ${childRows.length === 1 ? 'ученик' : 'ученика'}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/parents/${contactId}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="size-3.5" />Редактировать
              </Button>
            </Link>
            {contact.isArchived ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRestore}
                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
              >
                <ArchiveRestore className="size-3.5" />Восстановить
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmArchive(true)}
                className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
              >
                <Archive className="size-3.5" />В архив
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Profile card */}
      <div className="flex items-center gap-5 px-6 py-5 bg-white rounded-2xl border border-slate-200">
        <div className="size-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xl font-bold shrink-0">
          {initials || <UserRound className="size-7 text-emerald-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-slate-900">{contact.fullName}</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {contact.isArchived && <Badge variant="slate">В архиве</Badge>}
            {contact.preferredContact && (
              <Badge variant="slate">
                Предпочитает: {PREFERRED_CONTACT_METHOD_LABELS[contact.preferredContact]}
              </Badge>
            )}
          </div>
        </div>
        {contact.whatsapp && (
          <a
            href={formatWhatsappLink(contact.whatsapp)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-50 text-green-700 hover:bg-green-100 transition-colors text-sm font-medium shrink-0"
          >
            <MessageCircle className="size-4" />
            WhatsApp
          </a>
        )}
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
        <ChildrenTab rows={childRows} />
      )}
      {tab === 'support' && (
        <SupportTab familyId={familyId} />
      )}
      {tab === 'contacts' && (
        <ContactsTab contact={contact} />
      )}
      {tab === 'notes' && (
        <NotesTab contact={contact} />
      )}

      {/* Archive confirm */}
      <Modal
        isOpen={confirmArchive}
        onClose={() => setConfirmArchive(false)}
        size="sm"
        title="Отправить в архив?"
        description={`«${contact.fullName}» будет скрыт из активного списка. Связи с учениками сохранятся.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmArchive(false)}>Отмена</Button>
            <Button onClick={handleArchive}>
              <Archive className="size-4" />В архив
            </Button>
          </>
        }
      >
        {childRows.length > 0 ? (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            У представителя {childRows.length}{' '}
            {childRows.length === 1 ? 'ученик' : 'ученика'} — связи сохранятся, можно восстановить позже.
          </p>
        ) : (
          <p className="text-sm text-slate-500">Связанных учеников нет — архивирование безопасно.</p>
        )}
      </Modal>
    </div>
  );
}

interface ChildRow {
  link: {
    id: string;
    relation: keyof typeof FAMILY_RELATION_LABELS;
    customRelation?: string;
    isPrimaryContact: boolean;
    canDecideEducation: boolean;
    canReceiveNotifications: boolean;
    isEmergencyContact: boolean;
    isBillingContact: boolean;
  };
  student: {
    id: string;
    fullName: string;
    age: number;
    group: string;
    totalPoints: number;
    avatar?: string;
  };
}

function ChildrenTab({ rows }: { rows: ChildRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Users className="size-5" />}
        title="Учеников не привязано"
        description="Привяжите ученика через карточку семьи"
      />
    );
  }

  return (
    <SectionCard title="Дети" description="Ученики, привязанные к этому представителю">
      <div className="flex flex-col gap-2">
        {rows.map(({ link, student }) => {
          const initials = student.fullName.slice(0, 2).toUpperCase();
          const relationText = formatContactRelation(link);
          return (
            <Link
              key={link.id}
              href={`/students/${student.id}`}
              className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
            >
              <div className="size-9 rounded-full overflow-hidden bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold shrink-0">
                {student.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={student.avatar} alt={student.fullName} className="size-full object-cover" />
                ) : initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-slate-900 group-hover:text-emerald-700 transition-colors">
                    {student.fullName}
                  </p>
                  <Badge variant="slate" className="text-[10px]">{relationText}</Badge>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {student.age} лет · Группа {student.group} · {student.totalPoints} баллов
                </p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {link.isPrimaryContact && <Badge variant="emerald" className="text-[10px]">Основной</Badge>}
                  {link.canDecideEducation && <Badge variant="slate" className="text-[10px]">Решает</Badge>}
                  {link.canReceiveNotifications && <Badge variant="slate" className="text-[10px]">Уведомления</Badge>}
                  {link.isEmergencyContact && <Badge variant="warning" className="text-[10px]">Экстренный</Badge>}
                  {link.isBillingContact && <Badge variant="info" className="text-[10px]">Платит</Badge>}
                </div>
              </div>
              <ChevronRight className="size-3.5 text-slate-300 group-hover:text-emerald-500 transition-colors" />
            </Link>
          );
        })}
      </div>
    </SectionCard>
  );
}

function ContactsTab({ contact }: { contact: NonNullable<ReturnType<typeof useFamilyContactById>> }) {
  return (
    <div className="grid grid-cols-2 gap-6">
      <SectionCard title="Контакты" description="Все способы связи">
        <div className="flex flex-col gap-3">
          {contact.whatsapp && (
            <ContactRow icon={<MessageCircle className="size-3.5 text-green-500" />}>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">WhatsApp</p>
              <a
                href={formatWhatsappLink(contact.whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-green-600 hover:underline"
              >
                {contact.whatsapp}
              </a>
            </ContactRow>
          )}

          {contact.phone && (
            <ContactRow icon={<Phone className="size-3.5 text-slate-400" />}>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Телефон</p>
              <a href={`tel:${contact.phone}`} className="text-sm text-slate-700 hover:text-emerald-600">
                {contact.phone}
              </a>
            </ContactRow>
          )}

          {contact.telegram && (
            <ContactRow icon={<Send className="size-3.5 text-blue-500" />}>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Telegram</p>
              <a
                href={formatTelegramLink(contact.telegram)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-500 hover:underline"
              >
                {contact.telegram}
              </a>
            </ContactRow>
          )}

          {contact.instagram && (
            <ContactRow icon={<AtSign className="size-3.5 text-pink-500" />}>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Instagram</p>
              <a
                href={formatInstagramLink(contact.instagram)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-pink-500 hover:underline"
              >
                {contact.instagram}
              </a>
            </ContactRow>
          )}
        </div>
      </SectionCard>
    </div>
  );
}

function NotesTab({ contact }: { contact: NonNullable<ReturnType<typeof useFamilyContactById>> }) {
  const notes = contact.notes;

  if (!notes) {
    return (
      <EmptyState
        icon={<FileText className="size-5" />}
        title="Заметок пока нет"
        description="Добавьте заметки при редактировании представителя"
      />
    );
  }

  return (
    <SectionCard title="Заметки">
      <p className="text-sm text-slate-600 whitespace-pre-wrap">{notes}</p>
    </SectionCard>
  );
}

function SupportTab({ familyId }: { familyId: string }) {
  const family = useFamilyById(familyId);
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
