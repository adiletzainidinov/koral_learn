'use client';

import { useState, useEffect } from 'react';
import { Calendar, CalendarDays, File, Star, Pencil, Trash2 } from 'lucide-react';
import { Modal } from '@/shared/ui/modal';
import { Button } from '@/shared/ui/button';
import { AssignmentTypeBadge } from '@/shared/ui/badge';
import { Lightbox } from '@/shared/ui/lightbox';
import { useAppStore } from '@/store/app-store';
import { formatDate } from '@/shared/lib/dates';
import { ASSIGNMENT_STATUS_LABELS, getAssignmentPoints } from '@/entities/assignment/model/types';
import type { AssignmentStatus } from '@/entities/assignment/model/types';

interface Props {
  assignmentId: string | null;
  onClose: () => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string, title: string) => void;
}

const STATUS_OPTIONS: { value: AssignmentStatus; label: string; activeClass: string }[] = [
  { value: 'pending',   label: 'На проверке', activeClass: 'bg-amber-100 text-amber-700 ring-2 ring-amber-400' },
  { value: 'not_done',  label: 'Не сделано',  activeClass: 'bg-red-100 text-red-700 ring-2 ring-red-400' },
  { value: 'done',      label: 'Сделано',     activeClass: 'bg-blue-100 text-blue-700 ring-2 ring-blue-400' },
  { value: 'good',      label: 'Хорошо',      activeClass: 'bg-green-100 text-green-700 ring-2 ring-green-400' },
  { value: 'excellent', label: 'Отлично',     activeClass: 'bg-emerald-100 text-emerald-800 ring-2 ring-emerald-400' },
];

export function AssignmentDetailsModal({ assignmentId, onClose, onEdit, onDelete }: Props) {
  const assignment = useAppStore((s) =>
    assignmentId ? s.assignments.find((a) => a.id === assignmentId) : undefined
  );
  const { updateAssignmentStatus, updateAssignmentComment } = useAppStore();

  const [comment, setComment] = useState('');
  const [commentSaved, setCommentSaved] = useState(false);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);

  useEffect(() => {
    if (assignment) setComment(assignment.teacherComment ?? '');
    setCommentSaved(false);
  }, [assignment?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!assignment) return null;

  const points = getAssignmentPoints(assignment.status, assignment.assignmentType);
  const attachments = assignment.attachments ?? [];

  function handleStatusChange(status: AssignmentStatus) {
    updateAssignmentStatus(assignment!.id, status);
    setCommentSaved(false);
  }

  function handleSaveComment() {
    updateAssignmentComment(assignment!.id, comment.trim());
    setCommentSaved(true);
    setTimeout(() => setCommentSaved(false), 2000);
  }

  function handleEdit() {
    onClose();
    onEdit?.(assignment!.id);
  }

  function handleDelete() {
    onClose();
    onDelete?.(assignment!.id, assignment!.title);
  }

  return (
    <>
      <Modal
        isOpen={!!assignmentId}
        onClose={onClose}
        title={assignment.title}
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              {onEdit && (
                <Button variant="outline" size="sm" onClick={handleEdit}>
                  <Pencil className="size-3.5" />
                  Редактировать
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost" size="sm" onClick={handleDelete}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="size-3.5" />
                  Удалить
                </Button>
              )}
            </div>
            <Button variant="outline" onClick={onClose}>Закрыть</Button>
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          {/* badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {assignment.assignmentType && <AssignmentTypeBadge type={assignment.assignmentType} />}
          </div>

          {/* meta */}
          <div className="flex items-center gap-5 text-sm text-slate-500 flex-wrap">
            <span className="flex items-center gap-1.5">
              <Calendar className="size-3.5" />
              Выдано: {formatDate(assignment.issuedAt)}
            </span>
            {assignment.dueDate && (
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-3.5" />
                Дедлайн: {formatDate(assignment.dueDate)}
              </span>
            )}
            {points > 0 && (
              <span className="flex items-center gap-1.5 text-amber-600 font-medium">
                <Star className="size-3.5" />
                +{points} {points === 1 ? 'балл' : points < 5 ? 'балла' : 'баллов'}
              </span>
            )}
          </div>

          {/* status selector */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Статус</p>
            <div className="grid grid-cols-5 gap-1.5">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleStatusChange(opt.value)}
                  className={`py-2 px-1 rounded-lg text-xs font-medium transition-all cursor-pointer text-center ${
                    assignment.status === opt.value
                      ? opt.activeClass
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {ASSIGNMENT_STATUS_LABELS[opt.value]}
                </button>
              ))}
            </div>
          </div>

          {/* description */}
          {assignment.description && (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Описание</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-xl p-3">
                {assignment.description}
              </p>
            </div>
          )}

          {/* attachments */}
          {attachments.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Вложения ({attachments.length})
              </p>
              <div className="grid grid-cols-4 gap-2">
                {attachments.map((att) => {
                  const isImage = att.type.startsWith('image/') && !!att.base64;
                  return (
                    <div key={att.id} className="flex flex-col gap-1.5 p-2 rounded-xl border border-slate-200 bg-slate-50">
                      <div
                        className={`aspect-square rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center group ${isImage ? 'cursor-pointer' : ''}`}
                        onClick={() => isImage && setLightbox({ src: att.base64!, alt: att.name })}
                      >
                        {isImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={att.base64!} alt={att.name} className="size-full object-cover group-hover:scale-105 transition-transform" />
                        ) : (
                          <File className="size-6 text-slate-300" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 truncate">{att.name}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* teacher comment */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Комментарий преподавателя
            </p>
            <textarea
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 resize-none outline-none min-h-[80px] placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
              placeholder="Сделано хорошо, но нужно повторить 3-ю строку..."
              value={comment}
              onChange={(e) => { setComment(e.target.value); setCommentSaved(false); }}
            />
            <div className="flex items-center gap-3">
              <Button size="sm" onClick={handleSaveComment}>Сохранить комментарий</Button>
              {commentSaved && <span className="text-xs text-emerald-600 font-medium">Сохранено</span>}
            </div>
          </div>
        </div>
      </Modal>

      <Lightbox
        isOpen={!!lightbox}
        imageSrc={lightbox?.src ?? ''}
        imageAlt={lightbox?.alt ?? ''}
        onClose={() => setLightbox(null)}
      />
    </>
  );
}
