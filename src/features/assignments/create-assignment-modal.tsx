'use client';

import { useState, useRef } from 'react';
import { Paperclip, X, File, GraduationCap, Home } from 'lucide-react';
import { Modal } from '@/shared/ui/modal';
import { Input } from '@/shared/ui/input';
import { Select } from '@/shared/ui/select';
import { Button } from '@/shared/ui/button';
import { useAppStore, useStudents } from '@/store/app-store';
import { generateId } from '@/shared/lib/ids';
import type { AssignmentType, AssignmentAttachment } from '@/entities/assignment/model/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  preselectedStudentId?: string;
}

const TYPE_OPTIONS: { value: AssignmentType; label: string; desc: string; icon: React.ReactNode }[] = [
  {
    value: 'intermediate',
    label: 'Промежуточная',
    desc: 'Выполняется на уроке',
    icon: <GraduationCap className="size-4" />,
  },
  {
    value: 'homework',
    label: 'Домашняя',
    desc: 'Выполняется дома',
    icon: <Home className="size-4" />,
  },
];

function fileToAttachment(file: File): Promise<AssignmentAttachment> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve({
        id: generateId(),
        name: file.name,
        type: file.type,
        size: file.size,
        base64: e.target?.result as string,
        createdAt: new Date().toISOString(),
      });
    };
    reader.readAsDataURL(file);
  });
}

export function CreateAssignmentModal({ isOpen, onClose, preselectedStudentId }: Props) {
  const students = useStudents();
  const createAssignment = useAppStore((s) => s.createAssignment);

  const [studentId, setStudentId] = useState(preselectedStudentId ?? '');
  const [title, setTitle] = useState('');
  const [assignmentType, setAssignmentType] = useState<AssignmentType>('homework');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [attachments, setAttachments] = useState<AssignmentAttachment[]>([]);
  const [errors, setErrors] = useState<{ studentId?: string; title?: string }>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  const studentOptions = students
    .filter((s) => s.isActive)
    .map((s) => ({ value: s.id, label: `${s.fullName} (Группа ${s.group})` }));

  function reset() {
    setStudentId(preselectedStudentId ?? '');
    setTitle('');
    setAssignmentType('homework');
    setDescription('');
    setDueDate('');
    setAttachments([]);
    setErrors({});
  }

  function validate(): boolean {
    const errs: typeof errors = {};
    if (!preselectedStudentId && !studentId) errs.studentId = 'Выберите ученика';
    if (!title.trim()) errs.title = 'Введите название';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    createAssignment({
      studentId: preselectedStudentId ?? studentId,
      title: title.trim(),
      description: description.trim(),
      dueDate: dueDate || undefined,
      assignmentType,
      attachments,
    });
    reset();
    onClose();
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const newAttachments = await Promise.all(files.map(fileToAttachment));
    setAttachments((prev) => [...prev, ...newAttachments]);
    e.target.value = '';
  }

  async function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find((item) => item.type.startsWith('image/'));
    if (!imageItem) return;
    e.preventDefault();
    const file = imageItem.getAsFile();
    if (!file) return;
    const att = await fileToAttachment(file);
    setAttachments((prev) => [...prev, att]);
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
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
        {/* student selector — hidden when preselected */}
        {!preselectedStudentId && (
          <Select
            label="Ученик *"
            options={studentOptions}
            placeholder="Выберите ученика..."
            value={studentId}
            onChange={(e) => { setStudentId(e.target.value); setErrors((p) => ({ ...p, studentId: undefined })); }}
            error={errors.studentId}
          />
        )}

        {/* title */}
        <Input
          label="Название задания *"
          placeholder="Сура Аль-Фатиха"
          value={title}
          onChange={(e) => { setTitle(e.target.value); setErrors((p) => ({ ...p, title: undefined })); }}
          error={errors.title}
        />

        {/* type selector */}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-slate-700">Тип задания</p>
          <div className="grid grid-cols-2 gap-2">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setAssignmentType(opt.value)}
                className={`flex items-start gap-2.5 p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                  assignmentType === opt.value
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span className={`mt-0.5 shrink-0 ${assignmentType === opt.value ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {opt.icon}
                </span>
                <div>
                  <p className={`text-sm font-medium ${assignmentType === opt.value ? 'text-emerald-800' : 'text-slate-700'}`}>
                    {opt.label}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* description + paste area */}
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium text-slate-700">Описание и вложения</p>
          <div className="rounded-xl border border-slate-200 overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-colors">
            <textarea
              className="w-full px-3 py-2.5 text-sm resize-none outline-none min-h-[80px] placeholder:text-slate-400"
              placeholder="Что нужно сделать ученику..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onPaste={handlePaste}
            />
            <div className="flex items-center gap-3 px-3 py-2 border-t border-slate-100 bg-slate-50/80">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-emerald-600 transition-colors cursor-pointer"
              >
                <Paperclip className="size-3.5" />
                Прикрепить файл
              </button>
              <span className="text-slate-300 text-xs">·</span>
              <span className="text-xs text-slate-400">Ctrl+V для скриншота</span>
            </div>
          </div>

          {/* attachment list */}
          {attachments.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-1">
              {attachments.map((att) => {
                const isImage = att.type.startsWith('image/');
                return (
                  <div key={att.id} className="relative group rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                    <div className="aspect-square flex items-center justify-center bg-slate-100">
                      {isImage && att.base64 ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={att.base64} alt={att.name} className="size-full object-cover" />
                      ) : (
                        <File className="size-6 text-slate-300" />
                      )}
                    </div>
                    <div className="px-2 py-1.5">
                      <p className="text-[10px] font-medium text-slate-600 truncate">{att.name}</p>
                      <p className="text-[10px] text-slate-400">
                        {att.size < 1024 ? `${att.size} B` : att.size < 1024 * 1024 ? `${(att.size / 1024).toFixed(1)} KB` : `${(att.size / 1024 / 1024).toFixed(1)} MB`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(att.id)}
                      className="absolute top-1 right-1 size-5 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx,.txt"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {/* due date */}
        <Input
          label="Дедлайн (опционально)"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>
    </Modal>
  );
}
