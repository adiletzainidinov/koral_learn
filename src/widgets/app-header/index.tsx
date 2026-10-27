'use client';

import { useTranslation } from '@/shared/i18n/use-translation';
import { localizeUI } from '@/shared/i18n/translate';


import { usePathname } from 'next/navigation';
import { GraduationCap, Menu } from 'lucide-react';
import { formatShortDate } from '@/shared/lib/dates';
import { Container } from '@/shared/ui/container';
import { useUIStore } from '@/store/ui-store';
import { LanguageSwitcher } from '@/shared/i18n/language-switcher';

const pageMeta: Record<string, { title: string; description: string }> = {
  '/dashboard': { title: 'Дашборд', description: 'Общая сводка по ученикам и заданиям' },
  '/students': { title: 'Ученики', description: 'Управление списком учеников' },
  '/assignments': { title: 'Задания', description: 'Все задания по ученикам' },
  '/reviews': { title: 'Проверка заданий', description: 'Задания, ожидающие проверки' },
  '/attendance': { title: 'Посещаемость', description: 'Отметка и просмотр посещений' },
  '/leaderboard': { title: 'Рейтинг', description: 'Топ учеников по баллам' },
  '/settings': { title: 'Настройки', description: 'Параметры системы' },
  '/families': { title: 'Семьи', description: 'Ученики и представители' },
  '/parents': { title: 'Представители', description: 'Контакты и информация о семьях' },
  '/teams': { title: 'Команды', description: 'Командные цели и достижения' },
  '/support': { title: 'Поддержка', description: 'Семьи и платежи' },
};

function getPageMeta(pathname: string) {
  if (pathname.startsWith('/students/') && pathname !== '/students') {
    return { title: 'Профиль ученика', description: 'Подробная информация, задания и история' };
  }
  return pageMeta[pathname] ?? { title: 'QuranLearn', description: '' };
}

export function AppHeader() {
  const { t: translateText, locale } = useTranslation();

  const mobileNavigationOpen = useUIStore((s) => s.mobileNavigationOpen);
  const setMobileNavigationOpen = useUIStore((s) => s.setMobileNavigationOpen);
  const pathname = usePathname();
  const { title, description } = localizeUI(getPageMeta(pathname), locale);
  const today = formatShortDate(new Date(), locale);

  return (
    <header className="sticky top-0 z-20 h-16 sm:h-14 shrink-0 bg-white border-b border-slate-200">
      <Container className="h-full flex items-center justify-between gap-3 py-0">
        <button
          type="button"
          aria-label={translateText("Открыть меню")}
          aria-expanded={mobileNavigationOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMobileNavigationOpen(true)}
          className="lg:hidden size-11 shrink-0 flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-emerald-600"
        >
          <Menu className="size-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-slate-900 truncate">{title}</h2>
          {description && (
            <p className="text-xs text-slate-400 truncate">{description}</p>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <LanguageSwitcher />
          <span className="hidden sm:inline text-xs text-slate-400">{today}</span>
          <div className="hidden sm:flex items-center gap-2 sm:pl-3 sm:border-l border-slate-200" title={translateText("Преподаватель")}>
            <div className="size-7 rounded-full bg-emerald-100 flex items-center justify-center">
              <GraduationCap className="size-3.5 text-emerald-700" />
            </div>
            <span className="sr-only md:not-sr-only text-sm font-medium text-slate-700">{translateText("Преподаватель")}</span>
          </div>
        </div>
      </Container>
    </header>
  );
}
