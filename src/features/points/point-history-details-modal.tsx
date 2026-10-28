'use client';

import { useTranslation } from '@/shared/i18n/use-translation';
import { localizeUI } from '@/shared/i18n/translate';


import { useState, useEffect } from 'react';
import { BookOpen, CalendarDays, Pencil } from 'lucide-react';
import { Modal } from '@/shared/ui/modal';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Badge, AttendanceStatusBadge, PointsBadge } from '@/shared/ui/badge';
import { AssignmentDetailsModal } from '@/features/assignments/assignment-details-modal';
import { useAppStore, useAttendanceRecords } from '@/store/app-store';
import { formatDateTime, formatShortDate } from '@/shared/lib/dates';
import { POINT_SOURCE_LABELS } from '@/entities/points/model/types';
import { getAttendancePoints } from '@/entities/attendance/model/types';
import type { AttendanceStatus } from '@/entities/attendance/model/types';

const ATTENDANCE_INLINE: { status: AttendanceStatus; label: string; base: string }[] = [
  { status: 'present', label: 'Присутствовал',   base: 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100' },
  { status: 'late',    label: 'Опоздал',          base: 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100' },
  { status: 'absent',  label: 'Отсутствовал',     base: 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' },
  { status: 'excused', label: 'Уваж. причина',    base: 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100' },
];

interface Props {
  itemId: string | null;
  onClose: () => void;
}

export function PointHistoryDetailsModal({ itemId, onClose }: Props) {
  const { t: translateText, locale } = useTranslation();

  const item = useAppStore((s) =>
    itemId ? s.pointHistory.find((h) => h.id === itemId) : undefined
  );
  const allRecords = useAttendanceRecords();
  const { markAttendance, updateBonusHistoryItem } = useAppStore();

  const attendanceRecord = item?.attendanceId
    ? allRecords.find((r) => r.id === item.attendanceId)
    : undefined;

  const [assignmentOpen, setAssignmentOpen] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editReason, setEditReason] = useState('');
  const [editPoints, setEditPoints] = useState('');
  const [editComment, setEditComment] = useState('');

  useEffect(() => {
    if (!itemId) { setEditMode(false); return; }
    if (item) {
      setEditReason(item.reason);
      setEditPoints(String(item.points));
      setEditComment(item.comment ?? '');
    }
    setEditMode(false);
  }, [itemId]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSave() {
    const pts = Number(editPoints);
    if (!editReason.trim() || isNaN(pts)) return;
    updateBonusHistoryItem(itemId!, {
      reason: editReason.trim(),
      points: pts,
      comment: editComment.trim() || undefined,
    });
    setEditMode(false);
    onClose();
  }

  function handleClose() {
    setEditMode(false);
    onClose();
  }

  const isBonus = item?.source === 'bonus';

  const footer = editMode ? (
    <>
      <Button variant="outline" onClick={() => setEditMode(false)}>{translateText("Отмена")}</Button>
      <Button onClick={handleSave}>{translateText("Сохранить")}</Button>
    </>
  ) : (
    <div className="flex items-center justify-between w-full">
      <div>
        {isBonus && (
          <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
            <Pencil className="size-3.5" />{translateText("Редактировать")}</Button>
        )}
      </div>
      <Button variant="outline" onClick={handleClose}>{translateText("Закрыть")}</Button>
    </div>
  );

  return (
    <>
      <Modal
        isOpen={!!itemId}
        onClose={handleClose}
        title={editMode ? translateText('Редактировать запись') : translateText('Запись истории баллов')}
        size="md"
        footer={footer}
      >
        {item && (
          editMode ? (
            <div className="flex flex-col gap-4">
              <Input
                label={translateText("Причина *")}
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
              />
              <Input
                label={translateText("Баллы *")}
                type="number"
                value={editPoints}
                onChange={(e) => setEditPoints(e.target.value)}
                hint={translateText("Можно отрицательное значение для снятия баллов")}
              />
              <div className="flex flex-col gap-1.5">
                <p className="text-sm font-medium text-slate-700">{translateText("Комментарий")}</p>
                <textarea
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 resize-none outline-none min-h-[80px] placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                  placeholder={translateText("Дополнительная заметка...")}
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {/* source + points */}
              <div className="flex items-center justify-between">
                <Badge variant="slate">{localizeUI(POINT_SOURCE_LABELS, locale)[item.source]}</Badge>
                <PointsBadge points={item.points} />
              </div>

              {/* reason */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{translateText("Причина")}</p>
                <p className="text-sm text-slate-800">{item.reason}</p>
              </div>

              {/* comment */}
              {item.comment && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{translateText("Комментарий")}</p>
                  <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3 whitespace-pre-wrap">{item.comment}</p>
                </div>
              )}

              {/* date */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{translateText("Дата записи")}</p>
                <p className="text-sm text-slate-600">{formatDateTime(item.createdAt)}</p>
              </div>

              {/* assignment link */}
              {item.source === 'assignment' && item.assignmentId && (
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <BookOpen className="size-4 text-blue-500" />{translateText("Связанное задание")}</div>
                  <Button size="sm" onClick={() => setAssignmentOpen(item.assignmentId!)}>{translateText("Открыть задание")}</Button>
                </div>
              )}

              {/* attendance inline edit */}
              {item.source === 'attendance' && attendanceRecord && (
                <div className="flex flex-col gap-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{translateText("Посещаемость")}</p>
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <CalendarDays className="size-4 text-emerald-500" />
                      {formatShortDate(attendanceRecord.date, locale)}
                    </div>
                    <AttendanceStatusBadge status={attendanceRecord.status} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-2">{translateText("Изменить статус:")}</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {localizeUI(ATTENDANCE_INLINE, locale).map(({ status, label, base }) => {
                        const isActive = attendanceRecord.status === status;
                        const pts = getAttendancePoints(status);
                        return (
                          <button
                            key={status}
                            onClick={() => markAttendance(item.studentId, attendanceRecord.date, status)}
                            className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${base} ${
                              isActive ? 'ring-2 ring-offset-1 ring-current' : ''
                            }`}
                          >
                            <span>{label}</span>
                            {pts > 0 && <span className="opacity-60">+{pts}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        )}
      </Modal>

      <AssignmentDetailsModal
        assignmentId={assignmentOpen}
        onClose={() => setAssignmentOpen(null)}
      />
    </>
  );
}
