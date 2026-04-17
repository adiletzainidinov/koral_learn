'use client';

import { useState } from 'react';
import { Modal } from '@/shared/ui/modal';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Select } from '@/shared/ui/select';
import { Button } from '@/shared/ui/button';
import { useAppStore } from '@/store/app-store';
import type { StudentLevel } from '@/entities/student/model/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const LEVEL_OPTIONS = [
  { value: 'beginner', label: 'Начинающий' },
  { value: 'intermediate', label: 'Средний' },
  { value: 'advanced', label: 'Продвинутый' },
];

const GROUP_OPTIONS = [
  { value: 'A', label: 'Группа A' },
  { value: 'B', label: 'Группа B' },
  { value: 'C', label: 'Группа C' },
];

interface FormData {
  fullName: string;
  age: string;
  group: string;
  level: StudentLevel;
  startedAt: string;
  parentPhone: string;
  notes: string;
}

const initialForm: FormData = {
  fullName: '',
  age: '',
  group: 'A',
  level: 'beginner',
  startedAt: new Date().toISOString().split('T')[0],
  parentPhone: '',
  notes: '',
};

export function AddStudentModal({ isOpen, onClose }: Props) {
  const addStudent = useAppStore((s) => s.addStudent);
  const [form, setForm] = useState<FormData>(initialForm);
  const [errors, setErrors] = useState<Partial<FormData>>({});

  function set(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate(): boolean {
    const newErrors: Partial<FormData> = {};
    if (!form.fullName.trim()) newErrors.fullName = 'Введите ФИО';
    if (!form.age || isNaN(Number(form.age)) || Number(form.age) < 1)
      newErrors.age = 'Введите корректный возраст';
    if (!form.startedAt) newErrors.startedAt = 'Укажите дату начала';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    addStudent({
      fullName: form.fullName.trim(),
      age: Number(form.age),
      group: form.group,
      level: form.level,
      startedAt: form.startedAt,
      parentPhone: form.parentPhone.trim(),
      notes: form.notes.trim(),
      isActive: true,
    });
    setForm(initialForm);
    setErrors({});
    onClose();
  }

  function handleClose() {
    setForm(initialForm);
    setErrors({});
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Добавить ученика"
      description="Заполните информацию о новом ученике"
      footer={
        <>
          <Button variant="outline" onClick={handleClose}>Отмена</Button>
          <Button onClick={handleSubmit}>Добавить</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input
          label="ФИО *"
          placeholder="Иванов Иван Иванович"
          value={form.fullName}
          onChange={(e) => set('fullName', e.target.value)}
          error={errors.fullName}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Возраст *"
            type="number"
            min={1}
            max={100}
            placeholder="12"
            value={form.age}
            onChange={(e) => set('age', e.target.value)}
            error={errors.age}
          />
          <Select
            label="Группа"
            options={GROUP_OPTIONS}
            value={form.group}
            onChange={(e) => set('group', e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Уровень"
            options={LEVEL_OPTIONS}
            value={form.level}
            onChange={(e) => set('level', e.target.value as StudentLevel)}
          />
          <Input
            label="Дата начала *"
            type="date"
            value={form.startedAt}
            onChange={(e) => set('startedAt', e.target.value)}
            error={errors.startedAt}
          />
        </div>
        <Input
          label="Телефон родителей"
          placeholder="+996 700 000 000"
          value={form.parentPhone}
          onChange={(e) => set('parentPhone', e.target.value)}
        />
        <Textarea
          label="Заметки"
          placeholder="Дополнительная информация об ученике..."
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
        />
      </div>
    </Modal>
  );
}
