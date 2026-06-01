'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Phone, MapPin, MessageCircle, Send, User, AtSign, Users, File, Paperclip, ZoomIn, UserRound } from 'lucide-react';
import { SectionCard } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';
import { Lightbox } from '@/shared/ui/lightbox';
import { Badge } from '@/shared/ui/badge';
import { useStudentById, useStudentParent, useStudentsByParentId } from '@/store/app-store';
import type { StudentContact, FriendContact, StudentAttachment } from '@/entities/student/model/types';
import { RELATION_LABELS } from '@/entities/parent/model/types';
import { formatWhatsappLink, formatTelegramLink, formatInstagramLink } from '@/entities/parent/model/helpers';

interface Props {
  studentId: string;
}

function ParentBlock({ studentId }: { studentId: string }) {
  const parent = useStudentParent(studentId);
  const siblings = useStudentsByParentId(parent?.id ?? '').filter((s) => s.id !== studentId);

  if (!parent) return null;

  return (
    <SectionCard title="Родитель" description="Основной контакт семьи">
      <div className="flex flex-col gap-4">
        <Link
          href={`/parents/${parent.id}`}
          className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
        >
          <div className="size-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold shrink-0">
            {parent.fullName.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase() || (
              <UserRound className="size-4 text-emerald-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
              {parent.fullName}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              {parent.relation && (
                <Badge variant="slate" className="text-[10px]">{RELATION_LABELS[parent.relation]}</Badge>
              )}
              <span className="text-xs text-slate-400">{parent.whatsapp}</span>
            </div>
          </div>
          <a
            href={formatWhatsappLink(parent.whatsapp)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors text-xs font-medium shrink-0"
          >
            <MessageCircle className="size-3.5" />WA
          </a>
        </Link>

        {siblings.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              Братья / сёстры ({siblings.length})
            </p>
            <div className="flex flex-col gap-1">
              {siblings.map((sib) => (
                <Link
                  key={sib.id}
                  href={`/students/${sib.id}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors group text-sm"
                >
                  <div className="size-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-[10px] font-bold shrink-0">
                    {sib.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={sib.avatar} alt={sib.fullName} className="size-full object-cover rounded-full" />
                    ) : sib.fullName.slice(0, 2).toUpperCase()}
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

  if (!student) return null;

  const contacts = student.contacts ?? [];
  const friendContacts = student.friendContacts ?? [];
  const attachments = student.attachments ?? [];
  const address = student.address ?? '';
  const notes = student.notes ?? '';

  const hasContactInfo = contacts.length > 0 || friendContacts.length > 0 || address;
  const hasExtra = notes || attachments.length > 0;

  if (!hasContactInfo && !hasExtra && !student.parentId) {
    return (
      <EmptyState
        icon={<User className="size-5" />}
        title="Нет дополнительной информации"
        description="Добавьте контакты и адрес при редактировании ученика"
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* parent block */}
      {student.parentId && <ParentBlock studentId={studentId} />}

      {/* contacts + address */}
      {hasContactInfo && (
        <div className="grid grid-cols-2 gap-6">
          {/* left: family contacts */}
          <div>
            {contacts.length > 0 && (
              <SectionCard title="Контакты семьи" description="Телефоны и мессенджеры">
                <div className="flex flex-col gap-3">
                  {contacts.map((c) => (
                    <ContactRow key={c.id} icon={<User className="size-3.5 text-slate-400" />}>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{c.relation}</p>
                      {c.phone && (
                        <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 text-sm text-slate-700 hover:text-emerald-600 mt-0.5">
                          <Phone className="size-3 shrink-0" />{c.phone}
                        </a>
                      )}
                      <MessengerLinks whatsapp={c.whatsapp} telegram={c.telegram} instagram={c.instagram} />
                      {c.notes && <p className="text-xs text-slate-400 mt-1 italic">{c.notes}</p>}
                    </ContactRow>
                  ))}
                </div>
              </SectionCard>
            )}
          </div>

          {/* right: address + friend contacts */}
          <div className="flex flex-col gap-5">
            {address && (
              <SectionCard title="Адрес">
                <div className="flex items-start gap-2 text-sm text-slate-600">
                  <MapPin className="size-4 text-slate-400 mt-0.5 shrink-0" />
                  {address}
                </div>
              </SectionCard>
            )}

            {friendContacts.length > 0 && (
              <SectionCard title="Контакты друзей" description="Для связи при недоступности ученика">
                <div className="flex flex-col gap-3">
                  {friendContacts.map((f) => (
                    <ContactRow key={f.id} icon={<Users className="size-3.5 text-slate-400" />}>
                      <p className="text-sm font-medium text-slate-800">{f.fullName}</p>
                      {f.relationNote && <p className="text-xs text-slate-400">{f.relationNote}</p>}
                      {f.phone && (
                        <a href={`tel:${f.phone}`} className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-emerald-600 mt-0.5">
                          <Phone className="size-3 shrink-0" />{f.phone}
                        </a>
                      )}
                      <MessengerLinks whatsapp={f.whatsapp} telegram={f.telegram} instagram={f.instagram} />
                    </ContactRow>
                  ))}
                </div>
              </SectionCard>
            )}
          </div>
        </div>
      )}

      {/* notes */}
      {notes && (
        <SectionCard title="Заметки">
          <p className="text-sm text-slate-600 whitespace-pre-wrap">{notes}</p>
        </SectionCard>
      )}

      {/* files */}
      {attachments.length > 0 ? (
        <SectionCard title="Файлы" description="Скриншоты и документы">
          <FilesGrid attachments={attachments} />
        </SectionCard>
      ) : hasExtra && !notes ? (
        <EmptyState
          icon={<Paperclip className="size-5" />}
          title="Файлов пока нет"
          description="Вложения добавляются при редактировании ученика"
        />
      ) : null}
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
                className={`relative aspect-square rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center group ${isImage ? 'cursor-pointer' : ''}`}
                onClick={() => isImage && setLightbox({ src: att.base64!, alt: att.name })}
              >
                {isImage ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={att.base64!} alt={att.name} className="size-full object-cover transition-transform duration-200 group-hover:scale-105" />
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

function MessengerLinks({
  whatsapp, telegram, instagram,
}: {
  whatsapp?: string;
  telegram?: string;
  instagram?: string;
}) {
  if (!whatsapp && !telegram && !instagram) return null;
  return (
    <div className="flex items-center gap-3 mt-1">
      {whatsapp && (
        <a href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-green-600 hover:underline">
          <MessageCircle className="size-3" />WA
        </a>
      )}
      {telegram && (
        <a href={`https://t.me/${telegram.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-blue-500 hover:underline">
          <Send className="size-3" />{telegram}
        </a>
      )}
      {instagram && (
        <a href={`https://instagram.com/${instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-pink-500 hover:underline">
          <AtSign className="size-3" />{instagram}
        </a>
      )}
    </div>
  );
}
