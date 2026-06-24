'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, UserPlus, Archive, ArchiveRestore, Pencil, UserRound, MessageCircle, Phone, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/shared/ui/input';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { EmptyState } from '@/shared/ui/empty-state';
import { Card } from '@/shared/ui/card';
import { PageHeader } from '@/shared/ui/page-header';
import { Modal } from '@/shared/ui/modal';
import { useAppStore, useAllFamilyContacts, useFamilies, useStudents } from '@/store/app-store';
import {
  formatWhatsappLink,
  getContactInitials,
} from '@/entities/family-contact/model/helpers';
import type { FamilyContact } from '@/entities/family-contact/model/types';

interface ContactRowMeta {
  studentCount: number;
  studentNames: string[];
  familyName: string;
  isPrimary: boolean;
}

function ContactCard({
  contact,
  meta,
  onEdit,
  onArchive,
  onRestore,
  onClick,
}: {
  contact: FamilyContact;
  meta: ContactRowMeta;
  onEdit: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onClick: () => void;
}) {
  const initials = getContactInitials(contact.fullName);
  return (
    <div
      onClick={onClick}
      className="group flex items-center gap-4 px-5 py-4 hover:bg-slate-50/80 transition-colors cursor-pointer border-b border-slate-50 last:border-b-0"
    >
      {/* Avatar */}
      <div className="size-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-sm font-bold shrink-0">
        {initials || <UserRound className="size-5 text-emerald-400" />}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
            {contact.fullName}
          </span>
          {meta.isPrimary && <Badge variant="emerald" className="text-[10px]">Основной</Badge>}
          {contact.isArchived && <Badge variant="slate" className="text-[10px]">В архиве</Badge>}
          {meta.familyName && (
            <Badge variant="slate" className="text-[10px]">{meta.familyName}</Badge>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Phone className="size-3" />
            {contact.whatsapp || '—'}
          </span>
          {meta.studentCount > 0 && (
            <span className="text-emerald-600 font-medium" title={meta.studentNames.join(', ')}>
              {meta.studentCount} {meta.studentCount === 1 ? 'ученик' : meta.studentCount < 5 ? 'ученика' : 'учеников'}
            </span>
          )}
        </div>
      </div>

      {/* WA link */}
      {contact.whatsapp && (
        <a
          href={formatWhatsappLink(contact.whatsapp)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="size-8 rounded-lg flex items-center justify-center text-green-500 hover:bg-green-50 transition-colors shrink-0"
          title="Написать в WhatsApp"
        >
          <MessageCircle className="size-4" />
        </a>
      )}

      {/* Actions */}
      <div
        className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="size-7 p-0 text-slate-400 hover:text-emerald-600"
          aria-label="Редактировать"
        >
          <Pencil className="size-3.5" />
        </Button>
        {contact.isArchived ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRestore}
            className="size-7 p-0 text-slate-400 hover:text-emerald-600"
            aria-label="Восстановить"
          >
            <ArchiveRestore className="size-3.5" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={onArchive}
            className="size-7 p-0 text-slate-400 hover:text-amber-600"
            aria-label="В архив"
          >
            <Archive className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function ParentsList() {
  const contacts = useAllFamilyContacts();
  const families = useFamilies();
  const students = useStudents();
  const links = useAppStore((s) => s.studentFamilyContactLinks);
  const archiveFamilyContact = useAppStore((s) => s.archiveFamilyContact);
  const restoreFamilyContact = useAppStore((s) => s.restoreFamilyContact);
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [archiveId, setArchiveId] = useState<string | null>(null);

  const metaMap = useMemo(() => {
    const map: Record<string, ContactRowMeta> = {};
    const familyById = new Map(families.map((f) => [f.id, f]));
    const studentById = new Map(students.map((s) => [s.id, s]));

    for (const c of contacts) {
      const contactLinks = links.filter((l) => l.contactId === c.id);
      const studentNames: string[] = [];
      const seen = new Set<string>();
      for (const link of contactLinks) {
        if (seen.has(link.studentId)) continue;
        seen.add(link.studentId);
        const student = studentById.get(link.studentId);
        if (student) studentNames.push(student.fullName);
      }
      const family = familyById.get(c.familyId);
      const isPrimary = family?.primaryContactId === c.id;
      map[c.id] = {
        studentCount: studentNames.length,
        studentNames,
        familyName: family?.name ?? '',
        isPrimary,
      };
    }
    return map;
  }, [contacts, families, students, links]);

  const visible = useMemo(() => {
    let result = showArchived ? contacts : contacts.filter((c) => !c.isArchived);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          c.whatsapp.includes(q) ||
          (c.phone ?? '').includes(q) ||
          (metaMap[c.id]?.familyName ?? '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [contacts, search, showArchived, metaMap]);

  const contactToArchive = contacts.find((c) => c.id === archiveId) ?? null;
  const archiveStudentCount = archiveId ? metaMap[archiveId]?.studentCount ?? 0 : 0;

  const activeCount = contacts.filter((c) => !c.isArchived).length;
  const archivedCount = contacts.length - activeCount;

  return (
    <div>
      <PageHeader
        title="Представители семьи"
        description={`${activeCount} активных${archivedCount > 0 ? ` · ${archivedCount} в архиве` : ''}`}
        action={
          <Link href="/parents/new">
            <Button>
              <UserPlus className="size-4" />
              Добавить представителя
            </Button>
          </Link>
        }
      />

      <Card padding="none">
        {/* Search + toggle */}
        <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3 flex-wrap">
          <div className="relative max-w-sm flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
            <Input
              placeholder="Поиск по имени, номеру или семье..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {archivedCount > 0 && (
            <button
              onClick={() => setShowArchived((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              {showArchived ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              {showArchived ? 'Скрыть архив' : `Показать архив (${archivedCount})`}
            </button>
          )}
        </div>

        {visible.length === 0 ? (
          <EmptyState
            icon={<UserRound className="size-5" />}
            title={search ? 'Представители не найдены' : 'Представителей пока нет'}
            description={search ? 'Попробуйте другой запрос' : 'Добавьте первого представителя семьи'}
            action={
              !search ? (
                <Link href="/parents/new">
                  <Button><UserPlus className="size-4" />Добавить представителя</Button>
                </Link>
              ) : undefined
            }
            className="py-20"
          />
        ) : (
          <div className="divide-y divide-slate-50">
            {visible.map((c) => (
              <ContactCard
                key={c.id}
                contact={c}
                meta={metaMap[c.id] ?? { studentCount: 0, studentNames: [], familyName: '', isPrimary: false }}
                onClick={() => router.push(`/parents/${c.id}`)}
                onEdit={() => router.push(`/parents/${c.id}/edit`)}
                onArchive={() => setArchiveId(c.id)}
                onRestore={() => restoreFamilyContact(c.id)}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Archive confirm */}
      <Modal
        isOpen={archiveId !== null}
        onClose={() => setArchiveId(null)}
        size="sm"
        title="Отправить в архив?"
        description={
          contactToArchive
            ? `«${contactToArchive.fullName}» будет скрыт из активного списка. Связи с учениками сохранятся.`
            : undefined
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setArchiveId(null)}>Отмена</Button>
            <Button
              variant="primary"
              onClick={() => {
                if (archiveId) { archiveFamilyContact(archiveId); setArchiveId(null); }
              }}
            >
              <Archive className="size-4" />В архив
            </Button>
          </>
        }
      >
        {archiveStudentCount > 0 ? (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            У этого представителя {archiveStudentCount}{' '}
            {archiveStudentCount === 1 ? 'ученик' : 'ученика'}. Связи сохранятся, представителя можно восстановить позже.
          </p>
        ) : (
          <p className="text-sm text-slate-500">Связанных учеников нет — архивирование безопасно.</p>
        )}
      </Modal>
    </div>
  );
}
