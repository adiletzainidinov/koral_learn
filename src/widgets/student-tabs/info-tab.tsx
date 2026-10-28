'use client';

import { formatLocalizedDate } from '@/shared/i18n/date-format';

import { useTranslation } from '@/shared/i18n/use-translation';
import { localizeUI } from '@/shared/i18n/translate';
import { type Locale } from '@/shared/i18n/locale-store';


import { getStudentGroupLabel } from '@/entities/student/model/groups';

import { useState } from 'react';
import Link from 'next/link';
import {
  Phone, MapPin, MessageCircle, Send, AtSign, Users,
  File, ZoomIn, UserRound, Edit,
} from 'lucide-react';
import { SectionCard } from '@/shared/ui/card';
import { Lightbox } from '@/shared/ui/lightbox';
import { Badge, LevelBadge } from '@/shared/ui/badge';
import { EmptyState } from '@/shared/ui/empty-state';
import { useStudentById, useStudentFamilyContacts, useAppStore } from '@/store/app-store';
import type { Student, StudentAttachment } from '@/entities/student/model/types';
import { STUDENT_LEVEL_LABELS } from '@/entities/student/model/types';
import type { FamilyContact, StudentFamilyContactLink } from '@/entities/family-contact/model/types';
import {
  formatContactRelation,
  formatWhatsappLink,
  formatTelegramLink,
  formatInstagramLink,
  getContactInitials,
} from '@/entities/family-contact/model/helpers';

interface Props {
  studentId: string;
}

function formatDate(isoDate: string, locale: Locale = 'ru'): string {
  if (!isoDate) return '—';
  try {
    return formatLocalizedDate(new Date(isoDate), {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }, locale);
  } catch {
    return isoDate;
  }
}

function ContactChip({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 px-3 py-2 bg-slate-50 rounded-lg">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
        <div className="mt-0.5">{children}</div>
      </div>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
      <div className="text-sm text-slate-700">{value}</div>
    </div>
  );
}

function StudentPersonalInfoCard({ student }: { student: Student }) {
  const { t: translateText, locale } = useTranslation();

  const hasContacts = !!(
    student.studentPhone ||
    student.studentWhatsapp ||
    student.studentTelegram ||
    student.studentInstagram
  );

  return (
    <SectionCard
      title={translateText("Информация об ученике")}
      description={translateText("Личные данные, обучение и контакты ученика")}
      action={
        <Link
          href={`/students/${student.id}/edit`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors text-sm font-medium"
          aria-label={translateText(translateText(`Редактировать ученика ${student.fullName}`))}
        >
          <Edit className="size-3.5" />{translateText("Редактировать")}</Link>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Avatar + name */}
        <div className="flex items-center gap-4">
          <div className="size-14 rounded-full bg-emerald-100 overflow-hidden flex items-center justify-center text-emerald-700 text-lg font-bold shrink-0">
            {student.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={student.avatar} alt={student.fullName} className="size-full object-cover" />
            ) : (
              student.fullName.slice(0, 2).toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-semibold text-slate-900 leading-tight">{student.fullName}</p>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <Badge variant={student.isActive ? 'emerald' : 'slate'}>
                {student.isActive ? translateText('Активен') : translateText('Неактивен')}
              </Badge>
              <LevelBadge level={student.level} />
              <span className="text-xs text-slate-400">{translateText("Группа ")}{getStudentGroupLabel(student.group)}</span>
            </div>
          </div>
        </div>

        {/* Main data grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <InfoField label={translateText("Возраст")} value={translateText(`${student.age} лет`)} />
          <InfoField label={translateText("Группа")} value={getStudentGroupLabel(student.group)} />
          <InfoField label={translateText("Уровень")} value={localizeUI(STUDENT_LEVEL_LABELS, locale)[student.level]} />
          <InfoField label={translateText("Начало обучения")} value={formatDate(student.startedAt, locale)} />
          <InfoField label={translateText("Дата создания")} value={formatDate(student.createdAt, locale)} />
        </div>

        {/* Address — full-width row */}
        <div className="flex items-start gap-2 px-3 py-2.5 bg-slate-50 rounded-lg">
          <MapPin className="size-4 text-slate-400 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{translateText("Адрес")}</p>
            <p className="text-sm text-slate-700">
              {student.address || translateText('Адрес не указан')}
            </p>
          </div>
        </div>

        {/* Personal contacts */}
        {hasContacts ? (
          <div className="grid grid-cols-2 gap-3">
            {student.studentPhone && (
              <ContactChip
                icon={<Phone className="size-3 text-slate-400" />}
                label={translateText("Телефон")}
              >
                <a
                  href={`tel:${student.studentPhone.replace(/[\s\-()]/g, '')}`}
                  className="text-sm text-slate-700 hover:text-emerald-600"
                  aria-label={translateText(translateText(`Позвонить ученику ${student.fullName}`))}
                >
                  {student.studentPhone}
                </a>
              </ContactChip>
            )}
            {student.studentWhatsapp && (
              <ContactChip
                icon={<MessageCircle className="size-3 text-green-500" />}
                label="WhatsApp"
              >
                <a
                  href={formatWhatsappLink(student.studentWhatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-green-600 hover:underline"
                  aria-label={translateText(translateText(`Написать ${student.fullName} в WhatsApp`))}
                >
                  {student.studentWhatsapp}
                </a>
              </ContactChip>
            )}
            {student.studentTelegram && (
              <ContactChip
                icon={<Send className="size-3 text-blue-400" />}
                label="Telegram"
              >
                <a
                  href={formatTelegramLink(student.studentTelegram)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-500 hover:underline"
                  aria-label={translateText(translateText(`Написать ${student.fullName} в Telegram`))}
                >
                  {student.studentTelegram}
                </a>
              </ContactChip>
            )}
            {student.studentInstagram && (
              <ContactChip
                icon={<AtSign className="size-3 text-pink-400" />}
                label="Instagram"
              >
                <a
                  href={formatInstagramLink(student.studentInstagram)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-pink-500 hover:underline"
                  aria-label={translateText(translateText(`Instagram профиль ${student.fullName}`))}
                >
                  {student.studentInstagram}
                </a>
              </ContactChip>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-400">{translateText("Контакты ученика не указаны")}</p>
        )}
      </div>
    </SectionCard>
  );
}

function ContactRow({ contact, link }: { contact: FamilyContact; link: StudentFamilyContactLink }) {
  const { t: translateText, locale } = useTranslation();

  const initials = getContactInitials(contact.fullName);
  const relationText = formatContactRelation(link, locale);
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-white">
      <div className="size-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-sm font-bold shrink-0">
        {initials || <UserRound className="size-5 text-emerald-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/parents/${contact.id}`}
            className="text-sm font-semibold text-slate-900 hover:text-emerald-700 transition-colors"
          >
            {contact.fullName}
          </Link>
          <Badge variant="slate" className="text-[10px]">{relationText}</Badge>
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {link.isPrimaryContact && <Badge variant="emerald" className="text-[10px]">{translateText("Основной")}</Badge>}
          {link.canDecideEducation && <Badge variant="slate" className="text-[10px]">{translateText("Решает")}</Badge>}
          {link.canReceiveNotifications && <Badge variant="slate" className="text-[10px]">{translateText("Уведомления")}</Badge>}
          {link.isEmergencyContact && <Badge variant="warning" className="text-[10px]">{translateText("Экстренный")}</Badge>}
          {link.isBillingContact && <Badge variant="info" className="text-[10px]">{translateText("Платит")}</Badge>}
        </div>
        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
          {contact.whatsapp && (
            <a
              href={formatWhatsappLink(contact.whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-green-600 hover:underline"
            >
              <MessageCircle className="size-3" />WhatsApp
            </a>
          )}
          {contact.phone && (
            <a
              href={`tel:${contact.phone}`}
              className="flex items-center gap-1 text-slate-600 hover:text-emerald-600"
            >
              <Phone className="size-3" />{contact.phone}
            </a>
          )}
          {contact.telegram && (
            <a
              href={formatTelegramLink(contact.telegram)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-500 hover:underline"
            >
              <Send className="size-3" />TG
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function ContactsBlock({ studentId }: { studentId: string }) {
  const { t: translateText } = useTranslation();

  const rows = useStudentFamilyContacts(studentId);
  if (rows.length === 0) {
    return (
      <SectionCard title={translateText("Родители и представители")}>
        <EmptyState
          icon={<UserRound className="size-5" />}
          title={translateText("Представителей пока нет")}
          description={translateText("Привяжите ученика к семье и добавьте представителей через карточку семьи")}
        />
      </SectionCard>
    );
  }
  return (
    <SectionCard title={translateText("Родители и представители")} description={translateText(`${rows.length} ${rows.length === 1 ? translateText('контакт') : translateText('контакта')}`)}>
      <div className="flex flex-col gap-2">
        {rows.map(({ link, contact }) => (
          <ContactRow key={link.id} contact={contact} link={link} />
        ))}
      </div>
    </SectionCard>
  );
}

export function InfoTab({ studentId }: Props) {
  const { t: translateText } = useTranslation();

  const student = useStudentById(studentId);
  const allStudents = useAppStore((s) => s.students);

  if (!student) return null;

  const attachments = student.attachments ?? [];
  const notes = student.notes ?? '';

  const friendStudents = (student.friendIds ?? [])
    .map((id) => allStudents.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => !!s);

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Student personal info — always first */}
      <StudentPersonalInfoCard student={student} />

      {/* 2. Contacts (replaces single parent block) */}
      <ContactsBlock studentId={studentId} />

      {/* 3. Friends and connections */}
      <SectionCard
        title={translateText("Друзья и связи")}
        description={
          friendStudents.length > 0 ? translateText('Ученики, через которых можно связаться') : undefined
        }
      >
        {friendStudents.length === 0 ? (
          <p className="text-sm text-slate-400">{translateText("Друзья не выбраны")}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {friendStudents.map((friend) => {
              const initials = friend.fullName.slice(0, 2).toUpperCase();
              const contactLine = friend.studentWhatsapp || friend.studentPhone;
              return (
                <Link
                  key={friend.id}
                  href={`/students/${friend.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
                >
                  <div className="size-9 rounded-full overflow-hidden bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold shrink-0">
                    {friend.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={friend.avatar} alt={friend.fullName} className="size-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 group-hover:text-emerald-700 transition-colors">
                      {friend.fullName}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                      <span>{translateText("Группа ")}{getStudentGroupLabel(friend.group)}</span>
                      <span>·</span>
                      <span>{friend.age}{translateText(" лет")}</span>
                      {contactLine && (
                        <>
                          <span>·</span>
                          {friend.studentWhatsapp ? (
                            <a
                              href={formatWhatsappLink(friend.studentWhatsapp)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-green-600 hover:underline"
                            >
                              WA
                            </a>
                          ) : (
                            <span>{contactLine}</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <Users className="size-3.5 text-slate-300 group-hover:text-emerald-400 transition-colors shrink-0" />
                </Link>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* 4. Notes and files */}
      {notes && (
        <SectionCard title={translateText("Заметки")}>
          <p className="text-sm text-slate-600 whitespace-pre-wrap">{notes}</p>
        </SectionCard>
      )}

      {attachments.length > 0 && (
        <SectionCard title={translateText("Файлы")} description={translateText("Скриншоты и документы")}>
          <FilesGrid attachments={attachments} />
        </SectionCard>
      )}
    </div>
  );
}

function FilesGrid({ attachments }: { attachments: StudentAttachment[] }) {
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {attachments.map((att) => {
          const isImage = att.type.startsWith('image/') && !!att.base64;
          return (
            <div
              key={att.id}
              className="flex flex-col gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200"
            >
              <div
                className={`relative aspect-square rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center group ${
                  isImage ? 'cursor-pointer' : ''
                }`}
                onClick={() => isImage && setLightbox({ src: att.base64!, alt: att.name })}
              >
                {isImage ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={att.base64!}
                      alt={att.name}
                      className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <ZoomIn className="size-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                    </div>
                  </>
                ) : (
                  <File className="size-8 text-slate-300" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-700 truncate">{att.name}</p>
                <p className="text-[10px] text-slate-400">
                  {att.type.split('/')[1]?.toUpperCase() ?? 'FILE'} ·{' '}
                  {att.size < 1024
                    ? `${att.size} B`
                    : att.size < 1024 * 1024
                    ? `${(att.size / 1024).toFixed(1)} KB`
                    : `${(att.size / 1024 / 1024).toFixed(1)} MB`}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <Lightbox
        isOpen={!!lightbox}
        imageSrc={lightbox?.src ?? ''}
        imageAlt={lightbox?.alt ?? ''}
        onClose={() => setLightbox(null)}
      />
    </>
  );
}
