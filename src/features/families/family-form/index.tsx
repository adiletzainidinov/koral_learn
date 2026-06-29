'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Home, FileText, AlertTriangle, CheckCircle, UserPlus } from 'lucide-react';
import { Breadcrumb } from '@/shared/ui/breadcrumb';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Card } from '@/shared/ui/card';
import { Modal } from '@/shared/ui/modal';
import { useAppStore, useFamilies } from '@/store/app-store';

interface FormState {
  fatherFullName: string;
  address: string;
  notes: string;
}

interface Errors {
  fatherFullName?: string;
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

function normalizeName(v: string) {
  return v.toLowerCase().trim().replace(/\s+/g, ' ');
}

export function FamilyForm() {
  const router = useRouter();
  const families = useFamilies();
  const createFamily = useAppStore((s) => s.createFamily);

  const [form, setForm] = useState<FormState>({ fatherFullName: '', address: '', notes: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [duplicateMatch, setDuplicateMatch] = useState<null | { id: string; name: string }>(null);
  const [createdFamilyId, setCreatedFamilyId] = useState<string | null>(null);
  const [createdFamilyName, setCreatedFamilyName] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  const upd = useCallback(<K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  function validate(): boolean {
    const errs: Errors = {};
    if (!form.fatherFullName.trim()) errs.fatherFullName = 'Введите ФИО отца';
    setErrors(errs);
    if (errs.fatherFullName) nameRef.current?.focus();
    return Object.keys(errs).length === 0;
  }

  function clearError(field: keyof Errors) {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function findDuplicate() {
    const norm = normalizeName(form.fatherFullName);
    if (!norm) return null;
    const match = families.find(
      (f) => f.fatherFullName && normalizeName(f.fatherFullName) === norm
    );
    return match ? { id: match.id, name: match.name } : null;
  }

  function doCreate() {
    setSaving(true);
    const familyName = `Семья: ${form.fatherFullName.trim()}`;
    const id = createFamily({
      fatherFullName: form.fatherFullName.trim(),
      name: familyName,
      address: form.address.trim() || undefined,
      notes: form.notes.trim() || undefined,
    });
    setCreatedFamilyId(id);
    setCreatedFamilyName(familyName);
    setSaving(false);
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

  // ── Success state ──
  if (createdFamilyId) {
    return (
      <div className="flex flex-col gap-6">
        <div className="sticky top-14 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-200 -mx-6 xl:-mx-8 px-6 xl:px-8 py-4">
          <Breadcrumb items={[{ label: 'Семьи', href: '/families' }, { label: 'Новая семья' }]} />
          <h1 className="text-xl font-bold text-slate-900 mt-1">Новая семья</h1>
        </div>

        <Card padding="none">
          <div className="p-8 flex flex-col items-center text-center gap-4">
            <div className="size-14 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="size-7 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Семья создана</h2>
              <p className="text-sm text-slate-500 mt-1">«{createdFamilyName}» добавлена в систему</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-2 w-full max-w-sm">
              <Button
                className="flex-1"
                onClick={() => router.push(`/parents/new?familyId=${createdFamilyId}`)}
              >
                <UserPlus className="size-4" />
                Добавить представителей
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => router.push(`/support/families/${createdFamilyId}`)}
              >
                Открыть семью
              </Button>
            </div>
            <button
              type="button"
              onClick={() => router.push('/families')}
              className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
            >
              Вернуться к списку
            </button>
          </div>
        </Card>
      </div>
    );
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
            <p className="text-sm text-slate-500">Введите имя отца семейства — оно будет идентифицировать семью</p>
          </div>
        </div>
      </div>

      {hasAttemptedSubmit && Object.keys(errors).length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
          <AlertTriangle className="size-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">
            Заполните обязательные поля:{' '}
            <span className="font-medium">{errors.fatherFullName && 'ФИО отца'}</span>
          </p>
        </div>
      )}

      <Section
        icon={<Home className="size-4" />}
        title="Основная информация"
        description="ФИО отца обязательно — по нему система идентифицирует семью"
      >
        <div className="flex flex-col gap-4">
          <Input
            ref={nameRef}
            label="ФИО отца *"
            placeholder="Маматов Бакыт Маматович"
            value={form.fatherFullName}
            onChange={(e) => { upd('fatherFullName', e.target.value); clearError('fatherFullName'); }}
            error={errors.fatherFullName}
            hint={form.fatherFullName.trim() ? `Название семьи: «Семья: ${form.fatherFullName.trim()}»` : undefined}
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
        description={duplicateMatch ? `Семья с отцом «${duplicateMatch.name}» уже зарегистрирована.` : undefined}
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
          Найдена семья с похожим именем отца. Хотите открыть существующую запись или создать новую?
        </p>
      </Modal>
    </div>
  );
}
