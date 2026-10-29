'use client';

import { useTranslation } from '@/shared/i18n/use-translation';
import { localizeUI } from '@/shared/i18n/translate';


import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardCheck,
  CalendarDays,
  Trophy,
  UsersRound,
  HeartHandshake,
  Home,
  Settings,
  BookMarked,
  Presentation,
  X,
} from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { useUIStore } from '@/store/ui-store';

const navItems = [
  { href: '/dashboard', label: 'Дашборд', icon: LayoutDashboard },
  { href: '/students', label: 'Ученики', icon: Users },
  { href: '/families', label: 'Семьи', icon: Home },
  { href: '/teacher-lessons', label: 'Уроки для устаза', icon: Presentation },
  { href: '/assignments', label: 'Задания', icon: BookOpen },
  { href: '/reviews', label: 'Проверка', icon: ClipboardCheck },
  { href: '/attendance', label: 'Посещаемость', icon: CalendarDays },
  { href: '/leaderboard', label: 'Рейтинг', icon: Trophy },
  { href: '/teams', label: 'Команды', icon: UsersRound },
  { href: '/support', label: 'Поддержка', icon: HeartHandshake },
];

const bottomItems = [
  { href: '/settings', label: 'Настройки', icon: Settings },
];

function NavigationContent({ onNavigate }: { onNavigate?: () => void }) {
  const { t: translateText, locale } = useTranslation();

  const pathname = usePathname();

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    if (href === '/families') return pathname.startsWith('/families') || pathname.startsWith('/parents');
    return pathname.startsWith(href);
  }

  return (
    <>
      <div className="px-5 py-5 border-b border-slate-100 flex items-center justify-between gap-3">
        <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-2.5">
          <div className="size-8 rounded-xl bg-emerald-600 flex items-center justify-center">
            <BookMarked className="size-4 text-white" />
          </div>
          <div className="leading-tight">
            <span className="text-sm font-bold text-slate-900">QuranLearn</span>
            <p className="text-[10px] text-slate-400">{translateText("Система обучения")}</p>
          </div>
        </Link>
        {onNavigate && (
          <button type="button" onClick={onNavigate} aria-label={translateText("Закрыть меню")} className="size-11 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-emerald-600">
            <X className="size-5" />
          </button>
        )}
      </div>

      <nav aria-label={translateText("Основная навигация")} className="flex-1 min-h-0 px-3 py-4 flex flex-col gap-1 overflow-y-auto overscroll-contain">
        {localizeUI(navItems, locale).map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={isActive(href) ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 min-h-11 lg:min-h-0 px-3 py-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600',
              isActive(href)
                ? 'bg-emerald-50 text-emerald-700'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            )}
          >
            <Icon
              className={cn(
                'size-4 shrink-0',
                isActive(href) ? 'text-emerald-600' : 'text-slate-400'
              )}
            />
            {label}
          </Link>
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-slate-100">
        {localizeUI(bottomItems, locale).map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={isActive(href) ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 min-h-11 lg:min-h-0 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              isActive(href)
                ? 'bg-emerald-50 text-emerald-700'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            )}
          >
            <Icon
              className={cn(
                'size-4 shrink-0',
                isActive(href) ? 'text-emerald-600' : 'text-slate-400'
              )}
            />
            {label}
          </Link>
        ))}
      </div>
    </>
  );
}

export function AppSidebar() {
  const { t: translateText } = useTranslation();

  const dialogRef = useRef<HTMLDialogElement>(null);
  const open = useUIStore((s) => s.mobileNavigationOpen);
  const setOpen = useUIStore((s) => s.setMobileNavigationOpen);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!open) {
      dialog.close();
      return;
    }

    // Native dialog contains keyboard focus and restores it to the menu trigger.
    dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const desktop = window.matchMedia('(min-width: 1024px)');
    const closeOnDesktop = () => { if (desktop.matches) setOpen(false); };
    desktop.addEventListener('change', closeOnDesktop);
    closeOnDesktop();

    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      desktop.removeEventListener('change', closeOnDesktop);
    };
  }, [open, setOpen]);

  return (
    <>
      <aside className="hidden lg:flex w-[240px] shrink-0 sticky top-0 self-start h-dvh flex-col bg-white border-r border-slate-200">
        <NavigationContent />
      </aside>
      <dialog
        ref={dialogRef}
        id="mobile-navigation"
        aria-label={translateText("Меню QuranLearn")}
        onCancel={(event) => { event.preventDefault(); setOpen(false); }}
        onClose={() => setOpen(false)}
        onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }}
        className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-80 max-w-[calc(100%-3rem)] border-0 p-0 bg-white shadow-xl backdrop:bg-slate-900/40 lg:hidden"
      >
        <div className="flex h-full flex-col pb-[env(safe-area-inset-bottom)]">
          <NavigationContent onNavigate={() => setOpen(false)} />
        </div>
      </dialog>
    </>
  );
}
