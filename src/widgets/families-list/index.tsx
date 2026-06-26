'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Plus, Users, UserRound, Eye, EyeOff, Archive, ArchiveRestore } from 'lucide-react';
import { Input } from '@/shared/ui/input';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { EmptyState } from '@/shared/ui/empty-state';
import { Card } from '@/shared/ui/card';
import { PageHeader } from '@/shared/ui/page-header';
import { Modal } from '@/shared/ui/modal';
import { useAppStore, useFamilies } from '@/store/app-store';
import type { Family } from '@/entities/support/model/types';

interface FamilyRowMeta {
  contactCount: number;
  studentCount: number;
  primaryContactName: string;
}

function FamilyRow({
  family,
  meta,
  onArchive,
  onRestore,
  onClick,
}: {
  family: Family;
  meta: FamilyRowMeta;
  onArchive: () => void;
  onRestore: () => void;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="group flex items-center gap-4 px-5 py-4 hover:bg-slate-50/80 transition-colors cursor-pointer border-b border-slate-50 last:border-b-0"
    >
      {/* Avatar */}
      <div className="size-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-bold shrink-0">
        {family.name.slice(0, 2).toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
            {family.name}
          </span>
          {family.isArchived && <Badge variant="slate" className="text-[10px]">В архиве</Badge>}
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
          {meta.primaryContactName && (
            <span className="flex items-center gap-1">
              <UserRound className="size-3" />
              {meta.primaryContactName}
            </span>
          )}
          {meta.contactCount > 0 && (
            <span>
              {meta.contactCount}{' '}
              {meta.contactCount === 1 ? 'представитель' : meta.contactCount < 5 ? 'представителя' : 'представителей'}
            </span>
          )}
          {meta.studentCount > 0 && (
            <span className="text-emerald-600 font-medium">
              {meta.studentCount}{' '}
              {meta.studentCount === 1 ? 'ученик' : meta.studentCount < 5 ? 'ученика' : 'учеников'}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div
        className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        {family.isArchived ? (
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

export function FamiliesList() {
  const families = useFamilies();
  const contacts = useAppStore((s) => s.familyContacts);
  const students = useAppStore((s) => s.students);
  const archiveFamily = useAppStore((s) => s.archiveFamily);
  const restoreFamily = useAppStore((s) => s.restoreFamily);
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [archiveId, setArchiveId] = useState<string | null>(null);

  const metaMap = useMemo(() => {
    const map: Record<string, FamilyRowMeta> = {};
    const contactById = new Map(contacts.map((c) => [c.id, c]));

    for (const f of families) {
      const primaryContact = f.primaryContactId ? contactById.get(f.primaryContactId) : undefined;
      map[f.id] = {
        contactCount: f.contactIds.length,
        studentCount: f.studentIds.length,
        primaryContactName: primaryContact?.fullName ?? '',
      };
    }
    return map;
  }, [families, contacts]);

  const visible = useMemo(() => {
    let result = showArchived ? families : families.filter((f) => !f.isArchived);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((f) => {
        if (f.name.toLowerCase().includes(q)) return true;
        // search by contact name or phone
        const familyContacts = contacts.filter((c) => f.contactIds.includes(c.id));
        if (familyContacts.some((c) => c.fullName.toLowerCase().includes(q) || c.whatsapp.includes(q) || (c.phone ?? '').includes(q))) return true;
        // search by student name
        const familyStudents = students.filter((s) => f.studentIds.includes(s.id));
        if (familyStudents.some((s) => s.fullName.toLowerCase().includes(q))) return true;
        return false;
      });
    }
    return result;
  }, [families, search, showArchived, contacts, students]);

  const familyToArchive = families.find((f) => f.id === archiveId) ?? null;

  const activeCount = families.filter((f) => !f.isArchived).length;
  const archivedCount = families.length - activeCount;

  return (
    <div>
      <PageHeader
        title="Семьи"
        description={`${activeCount} активных${archivedCount > 0 ? ` · ${archivedCount} в архиве` : ''}`}
        action={
          <Link href="/families/new">
            <Button>
              <Plus className="size-4" />
              Добавить семью
            </Button>
          </Link>
        }
      />

      <Card padding="none">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3 flex-wrap">
          <div className="relative max-w-sm flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
            <Input
              placeholder="Поиск по названию, представителю, ученику..."
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
            icon={<Users className="size-5" />}
            title={search ? 'Семьи не найдены' : 'Семей пока нет'}
            description={search ? 'Попробуйте другой запрос' : 'Добавьте первую семью, чтобы начать работу'}
            action={
              !search ? (
                <Link href="/families/new">
                  <Button><Plus className="size-4" />Добавить семью</Button>
                </Link>
              ) : undefined
            }
            className="py-20"
          />
        ) : (
          <div className="divide-y divide-slate-50">
            {visible.map((f) => (
              <FamilyRow
                key={f.id}
                family={f}
                meta={metaMap[f.id] ?? { contactCount: 0, studentCount: 0, primaryContactName: '' }}
                onClick={() => router.push(`/support/families/${f.id}`)}
                onArchive={() => setArchiveId(f.id)}
                onRestore={() => restoreFamily(f.id)}
              />
            ))}
          </div>
        )}
      </Card>

      <Modal
        isOpen={archiveId !== null}
        onClose={() => setArchiveId(null)}
        size="sm"
        title="Отправить семью в архив?"
        description={familyToArchive ? `«${familyToArchive.name}» будет скрыта из активного списка.` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setArchiveId(null)}>Отмена</Button>
            <Button
              variant="primary"
              onClick={() => {
                if (archiveId) { archiveFamily(archiveId); setArchiveId(null); }
              }}
            >
              <Archive className="size-4" />В архив
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-500">Данные семьи, платежи и связи сохранятся. Семью можно восстановить позже.</p>
      </Modal>
    </div>
  );
}
