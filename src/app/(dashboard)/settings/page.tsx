import type { Metadata } from 'next';
import { Star, CalendarCheck, BookOpen, Database, Puzzle, ShieldCheck } from 'lucide-react';
import { Card, SectionCard } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { PageHeader } from '@/shared/ui/page-header';

export const metadata: Metadata = { title: 'Настройки' };

function PointRow({ label, points }: { label: string; points: number | string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
      <span className="text-sm text-slate-600">{label}</span>
      <Badge variant={typeof points === 'number' && points > 0 ? 'emerald' : 'slate'}>
        {typeof points === 'number' && points > 0 ? `+${points}` : points} {typeof points === 'number' ? 'б.' : ''}
      </Badge>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <PageHeader
        title="Настройки"
        description="Информация о системе баллов и параметрах приложения"
      />

      <SectionCard
        title="Система баллов — Посещаемость"
        description="Баллы за посещение занятий"
      >
        <div className="flex items-center gap-2 mb-4">
          <CalendarCheck className="size-4 text-emerald-600" />
          <span className="text-sm font-medium text-slate-700">Статусы посещаемости</span>
        </div>
        <PointRow label="Присутствовал" points={1} />
        <PointRow label="Опоздал" points={0} />
        <PointRow label="Отсутствовал" points={0} />
        <PointRow label="Уважительная причина" points={0} />
      </SectionCard>

      <SectionCard
        title="Система баллов — Задания"
        description="Баллы за выполнение заданий"
      >
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="size-4 text-blue-600" />
          <span className="text-sm font-medium text-slate-700">Оценки заданий</span>
        </div>
        <PointRow label="Не сделано" points={0} />
        <PointRow label="Сделано" points={1} />
        <PointRow label="Хорошо" points={2} />
        <PointRow label="Отлично" points={3} />
        <p className="text-xs text-slate-400 mt-3">
          При изменении оценки баллы пересчитываются автоматически (дельта-подход).
        </p>
      </SectionCard>

      <SectionCard
        title="Хранение данных"
        description="Где и как хранятся данные"
      >
        <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
          <Database className="size-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">localStorage (клиентское хранилище)</p>
            <p className="text-sm text-amber-600 mt-0.5">
              Все данные хранятся в браузере. При очистке кэша или переходе на другой браузер данные будут потеряны.
              В следующей версии планируется подключение backend с облачным хранилищем.
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Статус функций"
        description="Что реализовано сейчас, что планируется"
      >
        <div className="flex flex-col gap-2">
          {[
            { label: 'Управление учениками', status: 'done' },
            { label: 'Задания и проверка', status: 'done' },
            { label: 'Посещаемость', status: 'done' },
            { label: 'Рейтинг и баллы', status: 'done' },
            { label: 'История баллов', status: 'done' },
            { label: 'Backend / облачное хранилище', status: 'planned' },
            { label: 'Авторизация и роли', status: 'planned' },
            { label: 'Экспорт отчётов (PDF/Excel)', status: 'planned' },
            { label: 'Уведомления родителям', status: 'planned' },
            { label: 'Расписание занятий', status: 'planned' },
          ].map(({ label, status }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
              <span className="text-sm text-slate-600">{label}</span>
              <Badge variant={status === 'done' ? 'success' : 'slate'}>
                {status === 'done' ? 'Готово' : 'Планируется'}
              </Badge>
            </div>
          ))}
        </div>
      </SectionCard>

      <Card className="flex items-center gap-4 bg-emerald-50 border-emerald-200">
        <div className="size-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
          <ShieldCheck className="size-5 text-emerald-700" />
        </div>
        <div>
          <p className="text-sm font-semibold text-emerald-900">QuranLearn MVP v0.1</p>
          <p className="text-xs text-emerald-700 mt-0.5">
            Frontend-only прототип. Архитектура готова к подключению backend без рефакторинга.
          </p>
        </div>
      </Card>
    </div>
  );
}
