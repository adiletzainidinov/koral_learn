'use client';

import { useTranslation } from '@/shared/i18n/use-translation';


import { useMemo } from 'react';
import { Users, BookOpen, CalendarCheck, Trophy } from 'lucide-react';
import { StatCard } from '@/shared/ui/card';
import { useAppStore, useActiveStudents, usePendingAssignments, useTodayAttendance } from '@/store/app-store';

export function DashboardStats() {
  const { t: translateText } = useTranslation();

  const allStudents = useAppStore((s) => s.students);
  const activeStudents = useActiveStudents();
  const pending = usePendingAssignments();
  const todayAttendance = useTodayAttendance();

  const presentToday = useMemo(
    () => todayAttendance.filter((r) => r.status === 'present').length,
    [todayAttendance]
  );

  const topStudent = useMemo(
    () =>
      activeStudents.length > 0
        ? [...activeStudents].sort((a, b) => b.totalPoints - a.totalPoints)[0]
        : null,
    [activeStudents]
  );

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
      <StatCard
        label={translateText("Всего учеников")}
        value={allStudents.length}
        sub={translateText(`${activeStudents.length} активных`)}
        icon={<Users className="size-5" />}
        accent="emerald"
      />
      <StatCard
        label={translateText("На проверке")}
        value={pending.length}
        sub={translateText("заданий ожидают")}
        icon={<BookOpen className="size-5" />}
        accent="amber"
      />
      <StatCard
        label={translateText("Сегодня присутствовали")}
        value={presentToday}
        sub={translateText(`из ${activeStudents.length} активных`)}
        icon={<CalendarCheck className="size-5" />}
        accent="blue"
      />
      <StatCard
        label={translateText("Лучший ученик")}
        value={topStudent?.totalPoints ?? 0}
        sub={topStudent?.fullName ?? '—'}
        icon={<Trophy className="size-5" />}
        accent="purple"
      />
    </div>
  );
}
