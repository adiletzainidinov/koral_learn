'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Users, Check, AlertTriangle } from 'lucide-react';
import { useAppStore, useStudents, useFamilies } from '@/store/app-store';
import {
  SUPPORT_PLANS, PLAN_COLORS, calculateExpectedPayment, formatAmount,
} from '@/entities/support/model/helpers';
import type { SupportPlanType } from '@/entities/support/model/types';
import { cn } from '@/shared/lib/cn';

export default function NewFamilyPage() {
  const router = useRouter();
  const students = useStudents();
  const families = useFamilies();
  const createFamily = useAppStore((s) => s.createFamily);

  const [name, setName] = useState('');
  const [parentName, setParentName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [planType, setPlanType] = useState<SupportPlanType>('family_support');
  const [submitting, setSubmitting] = useState(false);

  const expectedAmount = calculateExpectedPayment(planType, selectedStudentIds.length);

  function toggleStudent(id: string) {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  function getStudentCurrentFamily(studentId: string) {
    return families.find((f) => f.studentIds.includes(studentId));
  }

  function handleSubmit() {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    const id = createFamily({
      name: name.trim(),
      parentName: parentName.trim() || undefined,
      parentPhone: phone.trim() || undefined,
      notes: notes.trim() || undefined,
      studentIds: selectedStudentIds,
      supportPlanType: planType,
    });
    router.push(`/support/families/${id}`);
  }

  const isPrivateGroup = planType === 'private_group';
  const warnPrivateGroup = isPrivateGroup && selectedStudentIds.length > 5;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/support" className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50">
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Добавить семью</h1>
          <p className="text-sm text-slate-500">Заполните информацию о семье</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Basic info */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Основная информация</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Название семьи *</label>
              <input
                type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Семья Ивановых"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Имя родителя</label>
              <input
                type="text" value={parentName} onChange={(e) => setParentName(e.target.value)}
                placeholder="Айнура Иванова"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Телефон</label>
              <input
                type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="+996 700 000 000"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Заметки</label>
              <textarea
                value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="Дополнительная информация..."
                rows={2}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Plan selection */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Формат обучения</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(Object.keys(SUPPORT_PLANS) as SupportPlanType[]).map((type) => {
              const plan = SUPPORT_PLANS[type];
              const colors = PLAN_COLORS[type];
              const isActive = planType === type;
              return (
                <button
                  key={type}
                  onClick={() => setPlanType(type)}
                  className={cn(
                    'text-left p-4 rounded-2xl border-2 transition-all',
                    isActive ? `${colors.border} ${colors.light}` : 'border-transparent bg-slate-50 hover:border-slate-200'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span>{plan.emoji}</span>
                      <span className="font-semibold text-sm text-slate-800">{plan.name}</span>
                    </div>
                    {isActive && <Check className={cn('size-4', colors.text)} />}
                  </div>
                  <p className="text-xs text-slate-500 mb-1">{plan.educationLogic}</p>
                  {type !== 'open_learning' && plan.monthlyBasePrice && (
                    <p className={cn('text-xs font-semibold', colors.text)}>от {formatAmount(plan.monthlyBasePrice)}/мес</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Student selection */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">Выбрать учеников</h2>
            <span className="text-sm text-slate-500">{selectedStudentIds.length} выбрано</span>
          </div>

          {students.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Нет учеников</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {students.map((s) => {
                const isSelected = selectedStudentIds.includes(s.id);
                const currentFamily = getStudentCurrentFamily(s.id);
                return (
                  <label key={s.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                      isSelected ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <input
                      type="checkbox" checked={isSelected}
                      onChange={() => toggleStudent(s.id)}
                      className="text-emerald-600"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">{s.fullName}</p>
                      <div className="flex gap-2 mt-0.5">
                        <span className="text-xs text-slate-400">Группа {s.group}</span>
                        {currentFamily && (
                          <span className="text-xs text-amber-600">Сейчас в «{currentFamily.name}»</span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-medium text-slate-400 shrink-0">{s.level}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Amount preview */}
        {selectedStudentIds.length > 0 && planType !== 'open_learning' && (
          <div className={cn('rounded-2xl p-5 border', PLAN_COLORS[planType].border, PLAN_COLORS[planType].light)}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">Сумма за месяц</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedStudentIds.length} {selectedStudentIds.length === 1 ? 'ребёнок' : 'детей'} · {SUPPORT_PLANS[planType].name}
                </p>
              </div>
              <p className={cn('text-2xl font-bold', PLAN_COLORS[planType].text)}>
                {formatAmount(expectedAmount)}
              </p>
            </div>
            {warnPrivateGroup && (
              <div className="flex items-center gap-2 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertTriangle className="size-4 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-700">Рекомендуется не более 5 человек в индивидуальной группе.</p>
              </div>
            )}
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3">
          <Link href="/support"
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 text-center">
            Отмена
          </Link>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || submitting}
            className="flex-1 px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <Users className="size-4" />
            Создать семью
          </button>
        </div>
      </div>
    </div>
  );
}
