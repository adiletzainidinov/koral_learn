'use client';

import { usePathname } from 'next/navigation';
import { GraduationCap } from 'lucide-react';
import { formatShortDate } from '@/shared/lib/dates';
import { Container } from '@/shared/ui/container';

const pageMeta: Record<string, { title: string; description: string }> = {
  '/dashboard': { title: 'Дашборд', description: 'Общая сводка по ученикам и заданиям' },
  '/students': { title: 'Ученики', description: 'Управление списком учеников' },
  '/assignments': { title: 'Задания', description: 'Все задания по ученикам' },
  '/reviews': { title: 'Проверка заданий', description: 'Задания, ожидающие проверки' },
  '/attendance': { title: 'Посещаемость', description: 'Отметка и просмотр посещений' },
  '/leaderboard': { title: 'Рейтинг', description: 'Топ учеников по баллам' },
  '/settings': { title: 'Настройки', description: 'Параметры системы' },
};

function getPageMeta(pathname: string) {
  if (pathname.startsWith('/students/') && pathname !== '/students') {
    return { title: 'Профиль ученика', description: 'Подробная информация, задания и история' };
  }
  return pageMeta[pathname] ?? { title: 'QuranLearn', description: '' };
}

export function AppHeader() {
  const pathname = usePathname();
  const { title, description } = getPageMeta(pathname);
  const today = formatShortDate(new Date());

  return (
    <header className="h-14 shrink-0 bg-white border-b border-slate-200">
      <Container className="h-full flex items-center justify-between py-0">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900 truncate">{title}</h2>
          {description && (
            <p className="text-xs text-slate-400 truncate">{description}</p>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-slate-400">{today}</span>
          <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
            <div className="size-7 rounded-full bg-emerald-100 flex items-center justify-center">
              <GraduationCap className="size-3.5 text-emerald-700" />
            </div>
            <span className="text-sm font-medium text-slate-700">Преподаватель</span>
          </div>
        </div>
      </Container>
    </header>
  );
}
