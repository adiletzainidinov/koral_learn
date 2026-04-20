'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Phone, Calendar, BookOpen, CalendarDays, Star, Trash2,
  Gift, MapPin, MessageCircle, Send, Users, Paperclip, File, User, AtSign,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/shared/ui/button';
import { Card, SectionCard } from '@/shared/ui/card';
import { Badge, AssignmentStatusBadge, AttendanceStatusBadge, LevelBadge, PointsBadge } from '@/shared/ui/badge';
import { EmptyState } from '@/shared/ui/empty-state';
import { Modal } from '@/shared/ui/modal';
import { Input } from '@/shared/ui/input';
import {
  useAppStore,
  useStudentById,
  useStudentAssignments,
  useStudentAttendance,
  useStudentPointHistory,
} from '@/store/app-store';
import { formatDate, formatShortDate, formatRelative } from '@/shared/lib/dates';
import { STUDENT_LEVEL_LABELS } from '@/entities/student/model/types';
import { POINT_SOURCE_LABELS } from '@/entities/points/model/types';
import type { StudentAttachment } from '@/entities/student/model/types';

interface Props { studentId: string }

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function StudentProfile({ studentId }: Props) {
  const router = useRouter();
  const student = useStudentById(studentId);
  const assignments = useStudentAssignments(studentId);
  const attendance = useStudentAttendance(studentId);
  const pointHistory = useStudentPointHistory(studentId);
  const { removeStudent, awardBonusPoints } = useAppStore();

  const [activeTab, setActiveTab] = useState<'assignments' | 'attendance' | 'history' | 'files'>('assignments');
  const [bonusOpen, setBonusOpen] = useState(false);
  const [bonusReason, setBonusReason] = useState('');
  const [bonusPoints, setBonusPoints] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <p className="text-slate-500 mb-4">Ученик не найден</p>
        <Link href="/students">
          <Button variant="outline"><ArrowLeft className="size-4" />К списку</Button>
        </Link>
      </div>
    );
  }

  // Safe defaults for new fields (backwards-compat with old localStorage data)
  const contacts = student.contacts ?? [];
  const friendContacts = student.friendContacts ?? [];
  const attachments = student.attachments ?? [];
  const address = student.address ?? '';

  const presentCount = attendance.filter((r) => r.status === 'present').length;
  const doneAssignments = assignments.filter((a) => a.status !== 'pending').length;

  function handleBonus() {
    const pts = Number(bonusPoints);
    if (!bonusReason.trim() || isNaN(pts) || pts === 0) return;
    awardBonusPoints(studentId, bonusReason.trim(), pts);
    setBonusReason(''); setBonusPoints(''); setBonusOpen(false);
  }

  function handleDelete() {
    removeStudent(studentId);
    router.push('/students');
  }

  const tabs = [
    { id: 'assignments' as const, label: 'Задания', count: assignments.length },
    { id: 'attendance' as const, label: 'Посещаемость', count: attendance.length },
    { id: 'history' as const, label: 'История баллов', count: pointHistory.length },
    { id: 'files' as const, label: 'Файлы', count: attachments.length },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* breadcrumb */}
      <div className="flex items-center gap-2">
        <Link href="/students">
          <Button variant="ghost" size="sm" className="size-8 p-0"><ArrowLeft className="size-4" /></Button>
        </Link>
        <span className="text-sm text-slate-500">Ученики</span>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-900">{student.fullName}</span>
      </div>

      {/* profile header */}
      <Card className="flex items-start gap-6">
        <div className="size-16 rounded-2xl overflow-hidden bg-emerald-100 flex items-center justify-center text-emerald-700 text-xl font-bold shrink-0">
          {student.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={student.avatar} alt={student.fullName} className="size-full object-cover" />
          ) : (
            student.fullName.slice(0, 2).toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">{student.fullName}</h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <LevelBadge level={student.level} />
                <Badge variant="slate">Группа {student.group}</Badge>
                <Badge variant={student.isActive ? 'success' : 'danger'}>
                  {student.isActive ? 'Активен' : 'Неактивен'}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => setBonusOpen(true)}>
                <Gift className="size-3.5" />Бонус
              </Button>
              <Button
                variant="ghost" size="sm" onClick={() => setDeleteOpen(true)}
                className="text-red-500 hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>

          {/* stats row */}
          <div className="grid grid-cols-4 gap-4 mt-5">
            <div className="flex items-center gap-2">
              <Star className="size-4 text-amber-500" />
              <div>
                <p className="text-xl font-bold text-slate-900">{student.totalPoints}</p>
                <p className="text-xs text-slate-400">баллов</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="size-4 text-blue-500" />
              <div>
                <p className="text-xl font-bold text-slate-900">{doneAssignments}</p>
                <p className="text-xs text-slate-400">заданий</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays className="size-4 text-emerald-500" />
              <div>
                <p className="text-xl font-bold text-slate-900">{presentCount}</p>
                <p className="text-xs text-slate-400">посещений</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-slate-400" />
              <div>
                <p className="text-sm font-semibold text-slate-900">{formatDate(student.startedAt)}</p>
                <p className="text-xs text-slate-400">начало</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* extended info: address + contacts */}
      {(address || contacts.length > 0 || friendContacts.length > 0) && (
        <div className="grid grid-cols-2 gap-5">
          {/* contacts */}
          {contacts.length > 0 && (
            <SectionCard title="Контакты семьи" description="Телефоны и мессенджеры">
              <div className="flex flex-col gap-3">
                {contacts.map((c) => (
                  <div key={c.id} className="flex items-start gap-3">
                    <div className="size-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="size-3.5 text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{c.relation}</p>
                      {c.phone && (
                        <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 text-sm text-slate-700 hover:text-emerald-600 mt-0.5">
                          <Phone className="size-3 shrink-0" />{c.phone}
                        </a>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        {c.whatsapp && (
                          <a href={`https://wa.me/${c.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-green-600 hover:underline">
                            <MessageCircle className="size-3" />WA
                          </a>
                        )}
                        {c.telegram && (
                          <a href={`https://t.me/${c.telegram.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-blue-500 hover:underline">
                            <Send className="size-3" />{c.telegram}
                          </a>
                        )}
                        {c.instagram && (
                          <a href={`https://instagram.com/${c.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-pink-500 hover:underline">
                            <AtSign className="size-3" />{c.instagram}
                          </a>
                        )}
                      </div>
                      {c.notes && <p className="text-xs text-slate-400 mt-1 italic">{c.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* address + friends */}
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
                    <div key={f.id} className="flex items-start gap-3">
                      <div className="size-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                        <Users className="size-3.5 text-slate-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800">{f.fullName}</p>
                        {f.relationNote && <p className="text-xs text-slate-400">{f.relationNote}</p>}
                        {f.phone && (
                          <a href={`tel:${f.phone}`} className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-emerald-600 mt-0.5">
                            <Phone className="size-3 shrink-0" />{f.phone}
                          </a>
                        )}
                        <div className="flex items-center gap-3 mt-1">
                          {f.whatsapp && (
                            <a href={`https://wa.me/${f.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-green-600 hover:underline">
                              <MessageCircle className="size-3" />WA
                            </a>
                          )}
                          {f.telegram && (
                            <a href={`https://t.me/${f.telegram.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-blue-500 hover:underline">
                              <Send className="size-3" />{f.telegram}
                            </a>
                          )}
                          {f.instagram && (
                            <a href={`https://instagram.com/${f.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-pink-500 hover:underline">
                              <AtSign className="size-3" />{f.instagram}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}
          </div>
        </div>
      )}

      {/* notes */}
      {student.notes && (
        <SectionCard title="Заметки">
          <p className="text-sm text-slate-600 whitespace-pre-wrap">{student.notes}</p>
        </SectionCard>
      )}

      {/* tabs */}
      <div>
        <div className="flex gap-1 mb-4 bg-slate-100 p-1 rounded-xl w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-xs text-slate-400">({tab.count})</span>
            </button>
          ))}
        </div>

        {activeTab === 'assignments' && <AssignmentsTab assignments={assignments} />}
        {activeTab === 'attendance' && <AttendanceTab attendance={attendance} />}
        {activeTab === 'history' && <HistoryTab history={pointHistory} />}
        {activeTab === 'files' && <FilesTab attachments={attachments} />}
      </div>

      {/* bonus modal */}
      <Modal
        isOpen={bonusOpen} onClose={() => setBonusOpen(false)}
        title="Начислить бонусные баллы" description={student.fullName}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setBonusOpen(false)}>Отмена</Button>
            <Button onClick={handleBonus}>Начислить</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input label="Причина" placeholder="Хатм джуза, помощь другим..."
            value={bonusReason} onChange={(e) => setBonusReason(e.target.value)} />
          <Input label="Баллы" type="number" placeholder="5"
            value={bonusPoints} onChange={(e) => setBonusPoints(e.target.value)}
            hint="Можно отрицательное значение для снятия баллов" />
        </div>
      </Modal>

      {/* delete modal */}
      <Modal
        isOpen={deleteOpen} onClose={() => setDeleteOpen(false)}
        title="Удалить ученика" size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Отмена</Button>
            <Button variant="danger" onClick={handleDelete}>Удалить</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Вы уверены, что хотите удалить ученика <strong>{student.fullName}</strong>?
          Все задания, посещаемость и история будут удалены. Это действие нельзя отменить.
        </p>
      </Modal>
    </div>
  );
}

// ── tab components ─────────────────────────────────────────────────────────────

function AssignmentsTab({ assignments }: { assignments: ReturnType<typeof useStudentAssignments> }) {
  if (assignments.length === 0)
    return <EmptyState icon={<BookOpen className="size-5" />} title="Заданий пока нет" />;
  return (
    <Card padding="none">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Задание</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Статус</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Дедлайн</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Баллы</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {assignments.map((a) => (
            <tr key={a.id} className="hover:bg-slate-50/60">
              <td className="px-5 py-3">
                <p className="text-sm font-medium text-slate-900">{a.title}</p>
                {a.description && <p className="text-xs text-slate-400 truncate max-w-xs">{a.description}</p>}
              </td>
              <td className="px-4 py-3"><AssignmentStatusBadge status={a.status} /></td>
              <td className="px-4 py-3"><span className="text-sm text-slate-500">{a.dueDate ? formatDate(a.dueDate) : '—'}</span></td>
              <td className="px-4 py-3">{a.pointsAwarded > 0 ? <PointsBadge points={a.pointsAwarded} /> : <span className="text-xs text-slate-400">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function AttendanceTab({ attendance }: { attendance: ReturnType<typeof useStudentAttendance> }) {
  if (attendance.length === 0)
    return <EmptyState icon={<CalendarDays className="size-5" />} title="Посещений пока нет" />;
  return (
    <Card padding="none">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Дата</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Статус</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Баллы</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {attendance.map((r) => (
            <tr key={r.id} className="hover:bg-slate-50/60">
              <td className="px-5 py-3"><span className="text-sm text-slate-700">{formatShortDate(r.date)}</span></td>
              <td className="px-4 py-3"><AttendanceStatusBadge status={r.status} /></td>
              <td className="px-4 py-3">{r.pointsAwarded > 0 ? <PointsBadge points={r.pointsAwarded} /> : <span className="text-xs text-slate-400">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function HistoryTab({ history }: { history: ReturnType<typeof useStudentPointHistory> }) {
  if (history.length === 0)
    return <EmptyState icon={<Star className="size-5" />} title="История баллов пуста" />;
  return (
    <Card padding="none">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Причина</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Источник</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Баллы</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Дата</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {history.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50/60">
              <td className="px-5 py-3"><span className="text-sm text-slate-700">{item.reason}</span></td>
              <td className="px-4 py-3"><Badge variant="slate">{POINT_SOURCE_LABELS[item.source]}</Badge></td>
              <td className="px-4 py-3"><PointsBadge points={item.points} /></td>
              <td className="px-4 py-3"><span className="text-xs text-slate-400">{formatRelative(item.createdAt)}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function FilesTab({ attachments }: { attachments: StudentAttachment[] }) {
  if (attachments.length === 0)
    return (
      <EmptyState
        icon={<Paperclip className="size-5" />}
        title="Файлов пока нет"
        description="Вложения добавляются при создании или редактировании ученика"
      />
    );

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {attachments.map((att) => {
        const isImage = att.type.startsWith('image/');
        const preview = att.base64;
        return (
          <div key={att.id} className="flex flex-col gap-2 p-3 bg-white rounded-2xl border border-slate-200">
            <div className="aspect-square rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center">
              {isImage && preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt={att.name} className="size-full object-cover" />
              ) : (
                <File className="size-8 text-slate-300" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-700 truncate">{att.name}</p>
              <p className="text-[10px] text-slate-400">
                {att.type.split('/')[1]?.toUpperCase() ?? 'FILE'} · {
                  att.size < 1024 ? `${att.size} B` :
                  att.size < 1024*1024 ? `${(att.size/1024).toFixed(1)} KB` :
                  `${(att.size/1024/1024).toFixed(1)} MB`
                }
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
