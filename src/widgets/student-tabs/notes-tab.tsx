'use client';

import { File, Paperclip, StickyNote } from 'lucide-react';
import { SectionCard } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';
import type { StudentAttachment } from '@/entities/student/model/types';

interface Props {
  notes: string;
  attachments: StudentAttachment[];
}

export function NotesTab({ notes, attachments }: Props) {
  const hasContent = notes || attachments.length > 0;

  if (!hasContent) {
    return (
      <EmptyState
        icon={<StickyNote className="size-5" />}
        title="Нет заметок и файлов"
        description="Добавьте заметки и вложения при редактировании ученика"
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {notes && (
        <SectionCard title="Заметки">
          <p className="text-sm text-slate-600 whitespace-pre-wrap">{notes}</p>
        </SectionCard>
      )}

      {attachments.length > 0 && (
        <SectionCard title="Файлы" description="Скриншоты и документы">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {attachments.map((att) => {
              const isImage = att.type.startsWith('image/');
              return (
                <div key={att.id} className="flex flex-col gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="aspect-square rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center">
                    {isImage && att.base64 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={att.base64} alt={att.name} className="size-full object-cover" />
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
        </SectionCard>
      )}

      {!notes && attachments.length === 0 && (
        <EmptyState
          icon={<Paperclip className="size-5" />}
          title="Файлов пока нет"
          description="Вложения добавляются при создании или редактировании ученика"
        />
      )}
    </div>
  );
}
