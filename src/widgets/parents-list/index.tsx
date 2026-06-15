'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, UserPlus, Trash2, Pencil, UserRound, MessageCircle, Phone } from 'lucide-react';
import { Input } from '@/shared/ui/input';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { EmptyState } from '@/shared/ui/empty-state';
import { Card } from '@/shared/ui/card';
import { PageHeader } from '@/shared/ui/page-header';
import { Modal } from '@/shared/ui/modal';
import { useAppStore, useParents } from '@/store/app-store';
import { normalizeParentRelation } from '@/entities/parent/model/types';
import { formatWhatsappLink } from '@/entities/parent/model/helpers';
import type { Parent } from '@/entities/parent/model/types';

function ParentCard({
  parent,
  childCount,
  onEdit,
  onDelete,
  onClick,
}: {
  parent: Parent;
  childCount: number;
  onEdit: () => void;
  onDelete: () => void;
  onClick: () => void;
}) {
  const initials = parent.fullName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

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
            {parent.fullName}
          </span>
          {parent.relation && (
            <Badge variant="slate" className="text-[10px]">
              {normalizeParentRelation(parent.relation)}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Phone className="size-3" />
            {parent.whatsapp}
          </span>
          {childCount > 0 && (
            <span className="text-emerald-600 font-medium">
              {childCount} {childCount === 1 ? 'ученик' : childCount < 5 ? 'ученика' : 'учеников'}
            </span>
          )}
        </div>
      </div>

      {/* WA link */}
      <a
        href={formatWhatsappLink(parent.whatsapp)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="size-8 rounded-lg flex items-center justify-center text-green-500 hover:bg-green-50 transition-colors shrink-0"
        title="Написать в WhatsApp"
      >
        <MessageCircle className="size-4" />
      </a>

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
        >
          <Pencil className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="size-7 p-0 text-slate-400 hover:text-red-500"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function ParentsList() {
  const parents = useParents();
  const students = useAppStore((s) => s.students);
  const deleteParent = useAppStore((s) => s.deleteParent);
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const childCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of students) {
      if (s.parentId) map[s.parentId] = (map[s.parentId] ?? 0) + 1;
    }
    return map;
  }, [students]);

  const filtered = useMemo(() => {
    if (!search) return parents;
    const q = search.toLowerCase();
    return parents.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        p.whatsapp.includes(q) ||
        (p.phone ?? '').includes(q) ||
        normalizeParentRelation(p.relation).toLowerCase().includes(q)
    );
  }, [parents, search]);

  const parentToDelete = parents.find((p) => p.id === deleteId);
  const deleteChildCount = deleteId ? (childCountMap[deleteId] ?? 0) : 0;

  return (
    <div>
      <PageHeader
        title="Родители"
        description={`${parents.length} родителей`}
        action={
          <Link href="/parents/new">
            <Button>
              <UserPlus className="size-4" />
              Добавить родителя
            </Button>
          </Link>
        }
      />

      <Card padding="none">
        {/* Search */}
        <div className="px-5 py-3 border-b border-slate-100">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
            <Input
              placeholder="Поиск по имени или номеру..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<UserRound className="size-5" />}
            title={search ? 'Родители не найдены' : 'Родителей пока нет'}
            description={search ? 'Попробуйте другой запрос' : 'Добавьте первого родителя'}
            action={
              !search ? (
                <Link href="/parents/new">
                  <Button><UserPlus className="size-4" />Добавить родителя</Button>
                </Link>
              ) : undefined
            }
            className="py-20"
          />
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered.map((parent) => (
              <ParentCard
                key={parent.id}
                parent={parent}
                childCount={childCountMap[parent.id] ?? 0}
                onClick={() => router.push(`/parents/${parent.id}`)}
                onEdit={() => router.push(`/parents/${parent.id}/edit`)}
                onDelete={() => setDeleteId(parent.id)}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Delete confirm */}
      <Modal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        size="sm"
        title="Удалить родителя?"
        description={
          parentToDelete
            ? `«${parentToDelete.fullName}» будет удалён. Это действие нельзя отменить.`
            : undefined
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>Отмена</Button>
            <Button
              variant="danger"
              onClick={() => {
                if (deleteId) { deleteParent(deleteId); setDeleteId(null); }
              }}
            >
              Удалить
            </Button>
          </>
        }
      >
        {deleteChildCount > 0 ? (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            У этого родителя {deleteChildCount}{' '}
            {deleteChildCount === 1 ? 'ученик' : 'ученика'} — у них будет снята привязка к родителю.
          </p>
        ) : (
          <p className="text-sm text-slate-500">
            Привязанных учеников нет — удаление безопасно.
          </p>
        )}
      </Modal>
    </div>
  );
}
