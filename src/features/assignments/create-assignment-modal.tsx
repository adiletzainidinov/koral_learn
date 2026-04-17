'use client';

import { useState } from 'react';
import { Modal } from '@/shared/ui/modal';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Select } from '@/shared/ui/select';
import { Button } from '@/shared/ui/button';
import { useAppStore, useStudents } from '@/store/app-store';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  preselectedStudentId?: string;
}

interface FormData {
  studentId: string;
  title: string;
  description: string;
  dueDate: string;
}

export function CreateAssignmentModal({ isOpen, onClose, preselectedStudentId }: Props) {
  const students = useStudents();
  const createAssignment = useAppStore((s) => s.createAssignment);

  const [form, setForm] = useState<FormData>({
    studentId: preselectedStudentId ?? '',
    title: '',
    description: '',
    dueDate: '',
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});

  const studentOptions = students
    .filter((s) => s.isActive)
    .map((s) => ({ value: s.id, label: `${s.fullName} (Группа ${s.group})` }));

  function set(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate(): boolean {
    const errs: Partial<FormData> = {};
    if (!form.studentId) errs.studentId = 'Выберите ученика';
    if (!form.title.trim()) errs.title = 'Введите название';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    createAssignment({
      studentId: form.studentId,
      title: form.title.trim(),
      description: form.description.trim(),
      dueDate: form.dueDate || undefined,
    });
    setForm({ studentId: preselectedStudentId ?? '', title: '', description: '', dueDate: '' });
    setErrors({});
    onClose();
  }

  function handleClose() {
    setForm({ studentId: preselectedStudentId ?? '', title: '', description: '', dueDate: '' });
    setErrors({});
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Создать задание"
      description="Выдайте задание ученику"
      footer={
        <>
          <Button variant="outline" onClick={handleClose}>Отмена</Button>
          <Button onClick={handleSubmit}>Создать</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Select
          label="Ученик *"
          options={studentOptions}
          placeholder="Выберите ученика..."
          value={form.studentId}
          onChange={(e) => set('studentId', e.target.value)}
          error={errors.studentId}
        />
        <Input
          label="Название задания *"
          placeholder="Сура Аль-Фатиха"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          error={errors.title}
        />
        <Textarea
          label="Описание"
          placeholder="Что нужно сделать ученику..."
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
        />
        <Input
          label="Дедлайн (опционально)"
          type="date"
          value={form.dueDate}
          onChange={(e) => set('dueDate', e.target.value)}
        />
      </div>
    </Modal>
  );
}
