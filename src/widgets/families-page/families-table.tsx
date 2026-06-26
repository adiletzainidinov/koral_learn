'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Archive, ArchiveRestore, ChevronRight, Users, UserRound } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { EmptyState } from '@/shared/ui/empty-state';
import { Card } from '@/shared/ui/card';
import { Modal } from '@/shared/ui/modal';
import Link from 'next/link';
import { useAppStore, useFamilies } from '@/store/app-store';
import { SUPPORT_PLANS } from '@/entities/support/model/helpers';
import type { Family } from '@/entities/support/model/types';
import { cn } from '@/shared/lib/cn';

interface FamilyMeta {
  studentCount: number;
  contactCount: number;
  primaryContactName: string;
  billingContactName: string;
  planName: string;
  planEmoji: string;
}

interface Props {
  search: string;
}

function normalizeName(v: string) {
  return v.toLowerCase().trim().replace(/\s+/g, ' ');
}

export function FamiliesTable({ search }: Props) {
  const families = useFamilies();
  const contacts = useAppStore((s) => s.familyContacts);
  const students = useAppStore((s) => s.students);
  const archiveFamily = useAppStore((s) => s.archiveFamily);
  const restoreFamily = useAppStore((s) => s.restoreFamily);
  const router = useRouter();
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const contactById = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);
  const studentById = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);

  const metaMap = useMemo<Record<string, FamilyMeta>>(() => {
    const map: Record<string, FamilyMeta> = {};
    for (const f of families) {
      const primaryContact = f.primaryContactId ? contactById.get(f.primaryContactId) : undefined;
      const billingContact = f.billingContactId ? contactById.get(f.billingContactId) : undefined;
      const plan = SUPPORT_PLANS[f.supportPlanType];
      map[f.id] = {
        studentCount: f.studentIds.length,
        contactCount: f.contactIds.length,
        primaryContactName: primaryContact?.fullName ?? '',
        billingContactName: billingContact?.fullName ?? (primaryContact?.fullName ?? ''),
        planName: plan?.name ?? f.supportPlanType,
        planEmoji: plan?.emoji ?? '',
      };
    }
    return map;
  }, [families, contactById]);

  const visible = useMemo(() => {
    let result = showArchived ? families : families.filter((f) => !f.isArchived);
    if (search) {
      const q = normalizeName(search);
      result = result.filter((f) => {
        if (normalizeName(f.name).includes(q)) return true;
        const meta = metaMap[f.id];
        if (meta?.primaryContactName && normalizeName(meta.primaryContactName).includes(q)) return true;
        if (meta?.billingContactName && normalizeName(meta.billingContactName).includes(q)) return true;
        // search by student names
        const familyStudents = f.studentIds.map((id) => studentById.get(id)).filter(Boolean);
        if (familyStudents.some((s) => s && normalizeName(s.fullName).includes(q))) return true;
        // search by contact names / phones
        const familyContacts = f.contactIds.map((id) => contactById.get(id)).filter(Boolean);
        if (familyContacts.some((c) => c && (normalizeName(c.fullName).includes(q) || c.whatsapp.includes(search) || (c.phone ?? '').includes(search)))) return true;
        return false;
      });
    }
    return result;
  }, [families, search, showArchived, metaMap, studentById, contactById]);

  const activeCount = families.filter((f) => !f.isArchived).length;
  const archivedCount = families.length - activeCount;
  const familyToArchive = archiveId ? (families.find((f) => f.id === archiveId) ?? null) : null;

  if (families.length === 0) {
    return (
      <EmptyState
        icon={<Users className="size-5" />}
        title="Семей пока нет"
        description="Создайте семью, затем добавьте представителей и учеников."
        action={
          <Link href="/families/new">
            <Button><Users className="size-4" />Добавить семью</Button>
          </Link>
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

      <Card padding="none" className="overflow-x-auto">
        {visible.length === 0 ? (
          <EmptyState
            icon={<Users className="size-5" />}
            title={search ? 'Семьи не найдены' : 'Ничего не найдено'}
            description="Попробуйте изменить запрос"
            className="py-16"
          />
        ) : (
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th scope="col" className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Семья</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Ученики</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Представители</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Основной контакт</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Поддержка</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {visible.map((family) => {
                const meta = metaMap[family.id] ?? { studentCount: 0, contactCount: 0, primaryContactName: '', billingContactName: '', planName: '', planEmoji: '' };
                return (
                  <tr
                    key={family.id}
                    onClick={() => router.push(`/families/${family.id}`)}
                    className="group hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold shrink-0">
                          {family.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
                            {family.name}
                          </span>
                          {family.isArchived && (
                            <Badge variant="slate" className="ml-2 text-[10px]">В архиве</Badge>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {meta.studentCount > 0 ? (
                        <span className="text-emerald-600 font-medium">
                          {meta.studentCount}{' '}
                          {meta.studentCount === 1 ? 'ученик' : meta.studentCount < 5 ? 'ученика' : 'учеников'}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {meta.contactCount > 0 ? (
                        <span>
                          {meta.contactCount}{' '}
                          {meta.contactCount === 1 ? 'контакт' : meta.contactCount < 5 ? 'контакта' : 'контактов'}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {meta.primaryContactName ? (
                        <span className="text-slate-700 text-sm">{meta.primaryContactName}</span>
                      ) : (
                        <span className="text-slate-300 text-sm">Не указан</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-slate-500">
                        {meta.planEmoji} {meta.planName}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          href={`/parents/new?familyId=${family.id}`}
                          className="size-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="Добавить представителя"
                        >
                          <UserPlus className="size-3.5" />
                        </Link>
                        <button
                          onClick={() => router.push(`/families/${family.id}`)}
                          className="size-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="Открыть семью"
                        >
                          <ChevronRight className="size-3.5" />
                        </button>
                        {family.isArchived ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => restoreFamily(family.id)}
                            className="size-7 p-0 text-slate-400 hover:text-emerald-600"
                            aria-label="Восстановить"
                          >
                            <ArchiveRestore className="size-3.5" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setArchiveId(family.id)}
                            className="size-7 p-0 text-slate-400 hover:text-amber-600"
                            aria-label="В архив"
                          >
                            <Archive className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
              onClick={() => { if (archiveId) { archiveFamily(archiveId); setArchiveId(null); } }}
            >
              <Archive className="size-4" />В архив
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-500">Данные, платежи и связи сохранятся. Семью можно восстановить позже.</p>
      </Modal>
    </>
  );
}
