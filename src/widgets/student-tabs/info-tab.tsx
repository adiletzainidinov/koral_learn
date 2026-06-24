'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Phone, MapPin, MessageCircle, Send, AtSign, Users,
  File, ZoomIn, UserRound, Edit,
} from 'lucide-react';
import { SectionCard } from '@/shared/ui/card';
import { Lightbox } from '@/shared/ui/lightbox';
import { Badge, LevelBadge } from '@/shared/ui/badge';
import { useStudentById, useStudentParent, useStudentsByParentId, useAppStore } from '@/store/app-store';
import type { Student, StudentAttachment } from '@/entities/student/model/types';
import { STUDENT_LEVEL_LABELS } from '@/entities/student/model/types';
import { normalizeParentRelation } from '@/entities/parent/model/types';
import { formatWhatsappLink, formatTelegramLink, formatInstagramLink } from '@/entities/parent/model/helpers';

interface Props {
  studentId: string;
}

function formatDate(isoDate: string): string {
  if (!isoDate) return '—';
  try {
    return new Date(isoDate).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
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
  const hasContacts = !!(
    student.studentPhone ||
    student.studentWhatsapp ||
    student.studentTelegram ||
    student.studentInstagram
  );

  return (
    <SectionCard
      title="Информация об ученике"
      description="Личные данные, обучение и контакты ученика"
      action={
        <Link
          href={`/students/${student.id}/edit`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors text-sm font-medium"
          aria-label={`Редактировать ученика ${student.fullName}`}
        >
          <Edit className="size-3.5" />
          Редактировать
        </Link>
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
                {student.isActive ? 'Активен' : 'Неактивен'}
              </Badge>
              <LevelBadge level={student.level} />
              <span className="text-xs text-slate-400">Группа {student.group}</span>
            </div>
          </div>
        </div>

        {/* Main data grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <InfoField label="Возраст" value={`${student.age} лет`} />
          <InfoField label="Группа" value={`Группа ${student.group}`} />
          <InfoField label="Уровень" value={STUDENT_LEVEL_LABELS[student.level]} />
          <InfoField label="Начало обучения" value={formatDate(student.startedAt)} />
          <InfoField label="Дата создания" value={formatDate(student.createdAt)} />
        </div>

        {/* Address — full-width row */}
        <div className="flex items-start gap-2 px-3 py-2.5 bg-slate-50 rounded-lg">
          <MapPin className="size-4 text-slate-400 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">
              Адрес
            </p>
            <p className="text-sm text-slate-700">
              {student.address || 'Адрес не указан'}
            </p>
          </div>
        </div>

        {/* Personal contacts */}
        {hasContacts ? (
          <div className="grid grid-cols-2 gap-3">
            {student.studentPhone && (
              <ContactChip
                icon={<Phone className="size-3 text-slate-400" />}
                label="Телефон"
              >
                <a
                  href={`tel:${student.studentPhone.replace(/[\s\-()]/g, '')}`}
                  className="text-sm text-slate-700 hover:text-emerald-600"
                  aria-label={`Позвонить ученику ${student.fullName}`}
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
                  aria-label={`Написать ${student.fullName} в WhatsApp`}
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
                  aria-label={`Написать ${student.fullName} в Telegram`}
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
                  aria-label={`Instagram профиль ${student.fullName}`}
                >
                  {student.studentInstagram}
                </a>
              </ContactChip>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-400">Контакты ученика не указаны</p>
        )}
      </div>
    </SectionCard>
  );
}

function ParentBlock({ studentId }: { studentId: string }) {
  const parent = useStudentParent(studentId);
  const siblings = useStudentsByParentId(parent?.id ?? '').filter((s) => s.id !== studentId);

  if (!parent) return null;

  const initials = parent.fullName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <SectionCard title="Родитель" description="Основной контакт семьи">
      <div className="flex flex-col gap-5">
        {/* identity row */}
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-sm font-bold shrink-0">
            {initials || <UserRound className="size-5 text-emerald-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-slate-900">{parent.fullName}</p>
            {parent.relation && (
              <Badge variant="slate" className="text-[10px] mt-1">
                {normalizeParentRelation(parent.relation)}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={formatWhatsappLink(parent.whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors text-sm font-medium"
              aria-label={`Написать родителю ${parent.fullName} в WhatsApp`}
            >
              <MessageCircle className="size-4" />Написать в WA
            </a>
            <Link
              href={`/parents/${parent.id}`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors text-sm font-medium"
            >
              <UserRound className="size-4" />Открыть
            </Link>
          </div>
        </div>

        {/* contact details */}
        <div className="grid grid-cols-2 gap-2">
          <ContactChip icon={<MessageCircle className="size-3 text-green-500" />} label="WhatsApp">
            <a
              href={formatWhatsappLink(parent.whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-green-600 hover:underline"
            >
              {parent.whatsapp}
            </a>
          </ContactChip>

          {parent.phone && (
            <ContactChip icon={<Phone className="size-3 text-slate-400" />} label="Телефон">
              <a href={`tel:${parent.phone}`} className="text-sm text-slate-700 hover:text-emerald-600">
                {parent.phone}
              </a>
            </ContactChip>
          )}

          {parent.telegram && (
            <ContactChip icon={<Send className="size-3 text-blue-400" />} label="Telegram">
              <a
                href={formatTelegramLink(parent.telegram)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-500 hover:underline"
              >
                {parent.telegram}
              </a>
            </ContactChip>
          )}

          {parent.instagram && (
            <ContactChip icon={<AtSign className="size-3 text-pink-400" />} label="Instagram">
              <a
                href={formatInstagramLink(parent.instagram)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-pink-500 hover:underline"
              >
                {parent.instagram}
              </a>
            </ContactChip>
          )}
        </div>

        {/* siblings */}
        {siblings.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              Другие дети этого родителя ({siblings.length})
            </p>
            <div className="flex flex-col gap-1">
              {siblings.map((sib) => (
                <Link
                  key={sib.id}
                  href={`/students/${sib.id}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors group text-sm"
                >
                  <div className="size-6 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center text-slate-600 text-[10px] font-bold shrink-0">
                    {sib.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={sib.avatar} alt={sib.fullName} className="size-full object-cover" />
                    ) : (
                      sib.fullName.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <span className="text-slate-700 group-hover:text-emerald-600 transition-colors">
                    {sib.fullName}
                  </span>
                  <span className="text-xs text-slate-400 ml-auto">{sib.age} лет</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

export function InfoTab({ studentId }: Props) {
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

      {/* 2. Parent */}
      {student.parentId && <ParentBlock studentId={studentId} />}

      {/* 3. Friends and connections */}
      <SectionCard
        title="Друзья и связи"
        description={
          friendStudents.length > 0 ? 'Ученики, через которых можно связаться' : undefined
        }
      >
        {friendStudents.length === 0 ? (
          <p className="text-sm text-slate-400">Друзья не выбраны</p>
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
                      <span>Группа {friend.group}</span>
                      <span>·</span>
                      <span>{friend.age} лет</span>
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
        <SectionCard title="Заметки">
          <p className="text-sm text-slate-600 whitespace-pre-wrap">{notes}</p>
        </SectionCard>
      )}

      {attachments.length > 0 && (
        <SectionCard title="Файлы" description="Скриншоты и документы">
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
