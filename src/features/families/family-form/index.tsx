'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Home, FileText, AlertTriangle } from 'lucide-react';
import { Breadcrumb } from '@/shared/ui/breadcrumb';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Card } from '@/shared/ui/card';
import { Modal } from '@/shared/ui/modal';
import { useAppStore, useFamilies } from '@/store/app-store';

interface FormState {
  name: string;
  address: string;
  notes: string;
}

interface Errors {
  name?: string;
}

function Section({
  icon, title, description, children,
}: { icon: React.ReactNode; title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card padding="none">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
        <div className="size-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="p-6">{children}</div>
    </Card>
  );
}

function normalizeFamilyName(v: string) {
  return v.toLowerCase().trim().replace(/\s+/g, ' ');
}

export function FamilyForm() {
  const router = useRouter();
  const families = useFamilies();
  const createFamily = useAppStore((s) => s.createFamily);

  const [form, setForm] = useState<FormState>({ name: '', address: '', notes: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [duplicateMatch, setDuplicateMatch] = useState<null | { id: string; name: string }>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const upd = useCallback(<K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  function validate(): boolean {
    const errs: Errors = {};
    if (!form.name.trim()) errs.name = 'Введите название семьи';
    setErrors(errs);
    if (errs.name) nameRef.current?.focus();
    return Object.keys(errs).length === 0;
  }

  function clearError(field: keyof Errors) {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function findDuplicate() {
    const norm = normalizeFamilyName(form.name);
    if (!norm) return null;
    const match = families.find((f) => normalizeFamilyName(f.name) === norm);
    return match ? { id: match.id, name: match.name } : null;
  }

  function doCreate() {
    setSaving(true);
    const id = createFamily({
      name: form.name.trim(),
      address: form.address.trim() || undefined,
      notes: form.notes.trim() || undefined,
    });
    router.push(`/support/families/${id}`);
  }

  function handleSubmit() {
    setHasAttemptedSubmit(true);
    if (!validate()) return;
    const dup = findDuplicate();
    if (dup) { setDuplicateMatch(dup); return; }
    doCreate();
  }

  function handleCancel() {
    router.push('/families');
  }

  return (
    <div className="flex flex-col gap-6">
      {/* sticky header */}
      <div className="sticky top-14 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-200 -mx-6 xl:-mx-8 px-6 xl:px-8 py-4">
        <Breadcrumb
          items={[
            { label: 'Семьи', href: '/families' },
            { label: 'Новая семья' },
          ]}
        />
        <div className="flex items-center gap-3 mt-1">
          <button
            type="button"
            onClick={handleCancel}
            className="size-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors shrink-0"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Новая семья</h1>
            <p className="text-sm text-slate-500">Заполните основную информацию о семье</p>
          </div>
        </div>
      </div>

      {hasAttemptedSubmit && Object.keys(errors).length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
          <AlertTriangle className="size-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">
            Заполните обязательные поля:{' '}
            <span className="font-medium">{errors.name && 'Название семьи'}</span>
          </p>
        </div>
      )}

      <Section icon={<Home className="size-4" />} title="Основная информация" description="Название обязательно, остальное опционально">
        <div className="flex flex-col gap-4">
          <Input
            ref={nameRef}
            label="Название семьи *"
            placeholder="Маматовы"
            value={form.name}
            onChange={(e) => { upd('name', e.target.value); clearError('name'); }}
            error={errors.name}
          />
          <Input
            label="Адрес"
            placeholder="г. Бишкек, ул. Токтогула, д. 14"
            value={form.address}
            onChange={(e) => upd('address', e.target.value)}
          />
        </div>
      </Section>

      <Section icon={<FileText className="size-4" />} title="Заметки" description="Дополнительная информация о семье">
        <textarea
          placeholder="Примечания по семье..."
          value={form.notes}
          onChange={(e) => upd('notes', e.target.value)}
          rows={3}
          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 resize-none outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
        />
      </Section>

      <div className="flex items-center justify-end gap-3 py-4 border-t border-slate-200 mt-2">
        <Button variant="outline" onClick={handleCancel}>Отмена</Button>
        <Button onClick={handleSubmit} loading={saving}>
          <Save className="size-4" />Создать семью
        </Button>
      </div>

      <Modal
        isOpen={duplicateMatch !== null}
        onClose={() => setDuplicateMatch(null)}
        size="sm"
        title="Такая семья уже существует"
        description={duplicateMatch ? `«${duplicateMatch.name}» уже зарегистрирована в системе.` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDuplicateMatch(null)}>Отмена</Button>
            <Button
              variant="outline"
              onClick={() => {
                const id = duplicateMatch?.id;
                setDuplicateMatch(null);
                if (id) router.push(`/support/families/${id}`);
              }}
            >
              Открыть существующую
            </Button>
            <Button onClick={() => { setDuplicateMatch(null); doCreate(); }}>
              Всё равно создать
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Найдена семья с похожим названием. Хотите открыть существующую запись или создать новую?
        </p>
      </Modal>
    </div>
  );
}
