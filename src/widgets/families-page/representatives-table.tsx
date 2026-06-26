'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Pencil, Archive, ArchiveRestore, MessageCircle, Phone, UserRound, UserPlus } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { EmptyState } from '@/shared/ui/empty-state';
import { Card } from '@/shared/ui/card';
import { Modal } from '@/shared/ui/modal';
import { useAppStore, useAllFamilyContacts, useFamilies, useStudents } from '@/store/app-store';
import {
  formatWhatsappLink,
  getContactInitials,
  formatContactRelation,
} from '@/entities/family-contact/model/helpers';
import type { FamilyContact } from '@/entities/family-contact/model/types';
import { cn } from '@/shared/lib/cn';

interface RepMeta {
  familyName: string;
  familyId: string;
  isPrimaryContact: boolean;
  isBillingContact: boolean;
  canDecideEducation: boolean;
  canReceiveNotifications: boolean;
  isEmergencyContact: boolean;
  studentRelations: string;
}

interface Props {
  search: string;
}

export function RepresentativesTable({ search }: Props) {
  const contacts = useAllFamilyContacts();
  const families = useFamilies();
  const students = useStudents();
  const links = useAppStore((s) => s.studentFamilyContactLinks);
  const archiveFamilyContact = useAppStore((s) => s.archiveFamilyContact);
  const restoreFamilyContact = useAppStore((s) => s.restoreFamilyContact);
  const router = useRouter();
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const metaMap = useMemo<Record<string, RepMeta>>(() => {
    const map: Record<string, RepMeta> = {};
    const familyById = new Map(families.map((f) => [f.id, f]));
    const studentById = new Map(students.map((s) => [s.id, s]));

    for (const c of contacts) {
      const family = familyById.get(c.familyId);
      const contactLinks = links.filter((l) => l.contactId === c.id);

      // Build student-relation string: group by relation
      const relationGroups = new Map<string, string[]>();
      for (const link of contactLinks) {
        const student = studentById.get(link.studentId);
        if (!student) continue;
        const rel = formatContactRelation(link);
        const existing = relationGroups.get(rel) ?? [];
        existing.push(student.fullName.split(' ')[0]); // first name only for brevity
        relationGroups.set(rel, existing);
      }
      const studentRelations = Array.from(relationGroups.entries())
        .map(([rel, names]) => `${rel}: ${names.join(', ')}`)
        .join(' · ');

      map[c.id] = {
        familyName: family?.name ?? '',
        familyId: c.familyId,
        isPrimaryContact: family?.primaryContactId === c.id || contactLinks.some((l) => l.isPrimaryContact),
        isBillingContact: family?.billingContactId === c.id || contactLinks.some((l) => l.isBillingContact),
        canDecideEducation: contactLinks.some((l) => l.canDecideEducation),
        canReceiveNotifications: contactLinks.some((l) => l.canReceiveNotifications),
        isEmergencyContact: contactLinks.some((l) => l.isEmergencyContact),
        studentRelations,
      };
    }
    return map;
  }, [contacts, families, students, links]);

  const visible = useMemo(() => {
    let result = showArchived ? contacts : contacts.filter((c) => !c.isArchived);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((c) => {
        if (c.fullName.toLowerCase().includes(q)) return true;
        if (c.whatsapp.includes(q) || (c.phone ?? '').includes(q)) return true;
        const meta = metaMap[c.id];
        if (meta?.familyName.toLowerCase().includes(q)) return true;
        if (meta?.studentRelations.toLowerCase().includes(q)) return true;
        return false;
      });
    }
    return result;
  }, [contacts, search, showArchived, metaMap]);

  const contactToArchive = contacts.find((c) => c.id === archiveId) ?? null;
  const archiveStudentCount = archiveId ? links.filter((l) => l.contactId === archiveId).length : 0;
  const archivedCount = contacts.filter((c) => c.isArchived).length;
  const hasFamilies = families.some((f) => !f.isArchived);

  if (contacts.length === 0) {
    return (
      <EmptyState
        icon={<UserRound className="size-5" />}
        title="Представителей пока нет"
        description={hasFamilies ? 'Добавьте маму, папу, опекуна или другого представителя в существующую семью.' : 'Сначала создайте семью.'}
        action={
          hasFamilies ? (
            <Link href="/parents/new">
              <Button><UserPlus className="size-4" />Добавить представителя</Button>
            </Link>
          ) : (
            <Link href="/families/new">
              <Button>Создать семью</Button>
            </Link>
          )
        }
        className="py-20"
      />
    );
  }

  return (
    <>
      {archivedCount > 0 && (
        <div className="flex justify-end mb-2">
          <button
            onClick={() => setShowArchived((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            {showArchived ? 'Скрыть архив' : `Показать архив (${archivedCount})`}
          </button>
        </div>
      )}

      <Card padding="none">
        {visible.length === 0 ? (
          <EmptyState
            icon={<UserRound className="size-5" />}
            title="Представители не найдены"
            description="Попробуйте изменить запрос"
            className="py-16"
          />
        ) : (
          <div>
            {visible.map((contact) => {
              const meta = metaMap[contact.id];
              const initials = getContactInitials(contact.fullName);
              const roles: string[] = [];
              if (meta?.isPrimaryContact) roles.push('Основной контакт');
              if (meta?.canDecideEducation) roles.push('Принимает решения');
              if (meta?.isBillingContact) roles.push('Плательщик');
              if (meta?.canReceiveNotifications) roles.push('Получает уведомления');
              if (meta?.isEmergencyContact) roles.push('Экстренный контакт');

              return (
                <div
                  key={contact.id}
                  onClick={() => router.push(`/parents/${contact.id}`)}
                  className="group flex items-start gap-4 px-5 py-4 hover:bg-slate-50/80 transition-colors cursor-pointer border-b border-slate-50 last:border-b-0"
                >
                  {/* Avatar */}
                  <div className="size-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-sm font-bold shrink-0 mt-0.5">
                    {initials || <UserRound className="size-5 text-emerald-400" />}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
                        {contact.fullName}
                      </span>
                      {contact.isArchived && <Badge variant="slate" className="text-[10px]">В архиве</Badge>}
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                      {meta?.familyName && (
                        <span
                          className="text-blue-600 font-medium hover:underline"
                          onClick={(e) => { e.stopPropagation(); if (meta.familyId) router.push(`/families/${meta.familyId}`); }}
                        >
                          {meta.familyName}
                        </span>
                      )}
                      {meta?.studentRelations && (
                        <>
                          {meta.familyName && <span className="text-slate-200">·</span>}
                          <span>{meta.studentRelations}</span>
                        </>
                      )}
                    </div>

                    {roles.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap mt-1.5">
                        {roles.map((role) => (
                          <span
                            key={role}
                            className={cn(
                              'inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium',
                              role === 'Основной контакт' && 'bg-emerald-50 text-emerald-700',
                              role === 'Принимает решения' && 'bg-blue-50 text-blue-700',
                              role === 'Плательщик' && 'bg-amber-50 text-amber-700',
                              role === 'Получает уведомления' && 'bg-purple-50 text-purple-700',
                              role === 'Экстренный контакт' && 'bg-red-50 text-red-700',
                            )}
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* WhatsApp */}
                  {contact.whatsapp && (
                    <a
                      href={formatWhatsappLink(contact.whatsapp)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="size-8 rounded-lg flex items-center justify-center text-green-500 hover:bg-green-50 transition-colors shrink-0 mt-0.5"
                      title={contact.whatsapp}
                    >
                      <MessageCircle className="size-4" />
                    </a>
                  )}

                  {/* Actions */}
                  <div
                    className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/parents/${contact.id}/edit`)}
                      className="size-7 p-0 text-slate-400 hover:text-emerald-600"
                      aria-label="Редактировать"
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    {contact.isArchived ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => restoreFamilyContact(contact.id)}
                        className="size-7 p-0 text-slate-400 hover:text-emerald-600"
                        aria-label="Восстановить"
                      >
                        <ArchiveRestore className="size-3.5" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setArchiveId(contact.id)}
                        className="size-7 p-0 text-slate-400 hover:text-amber-600"
                        aria-label="В архив"
                      >
                        <Archive className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal
        isOpen={archiveId !== null}
        onClose={() => setArchiveId(null)}
        size="sm"
        title="Отправить в архив?"
        description={contactToArchive ? `«${contactToArchive.fullName}» будет скрыт из активного списка.` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setArchiveId(null)}>Отмена</Button>
            <Button
              variant="primary"
              onClick={() => { if (archiveId) { archiveFamilyContact(archiveId); setArchiveId(null); } }}
            >
              <Archive className="size-4" />В архив
            </Button>
          </>
        }
      >
        {archiveStudentCount > 0 ? (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Связан с {archiveStudentCount}{' '}
            {archiveStudentCount === 1 ? 'учеником' : 'учениками'}. Связи сохранятся, можно восстановить позже.
          </p>
        ) : (
          <p className="text-sm text-slate-500">Связанных учеников нет — архивирование безопасно.</p>
        )}
      </Modal>
    </>
  );
}
