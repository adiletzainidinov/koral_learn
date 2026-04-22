'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Gift, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/shared/ui/button';
import { Modal } from '@/shared/ui/modal';
import { Input } from '@/shared/ui/input';
import { useAppStore, useStudentById } from '@/store/app-store';
import { StudentTabs } from '@/widgets/student-tabs/student-tabs';

interface Props { studentId: string }

export function StudentProfile({ studentId }: Props) {
  const router = useRouter();
  const student = useStudentById(studentId);
  const { removeStudent, awardBonusPoints } = useAppStore();

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

  return (
    <div className="flex flex-col gap-6">
      {/* breadcrumb + actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/students">
            <Button variant="ghost" size="sm" className="size-8 p-0"><ArrowLeft className="size-4" /></Button>
          </Link>
          <span className="text-sm text-slate-500">Ученики</span>
          <span className="text-slate-300">/</span>
          <span className="text-sm font-medium text-slate-900">{student.fullName}</span>
        </div>
        <div className="flex items-center gap-2">
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

      {/* tabs */}
      <StudentTabs studentId={studentId} />

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
