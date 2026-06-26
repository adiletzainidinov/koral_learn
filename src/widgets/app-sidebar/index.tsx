'use client';

import Link from 'next/link';
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
  UserRound,
  Home,
  Settings,
  BookMarked,
} from 'lucide-react';
import { cn } from '@/shared/lib/cn';

const navItems = [
  { href: '/dashboard', label: 'Дашборд', icon: LayoutDashboard },
  { href: '/students', label: 'Ученики', icon: Users },
  { href: '/families', label: 'Семьи', icon: Home },
  { href: '/parents', label: 'Родители', icon: UserRound },
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

export function AppSidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  }

  return (
    <aside className="w-[240px] shrink-0 sticky top-0 self-start h-screen flex flex-col bg-white border-r border-slate-200">
      <div className="px-5 py-5 border-b border-slate-100">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="size-8 rounded-xl bg-emerald-600 flex items-center justify-center">
            <BookMarked className="size-4 text-white" />
          </div>
          <div className="leading-tight">
            <span className="text-sm font-bold text-slate-900">QuranLearn</span>
            <p className="text-[10px] text-slate-400">Система обучения</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
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
        {bottomItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
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
    </aside>
  );
}
