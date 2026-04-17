'use client';

import Link from 'next/link';
import { Trophy } from 'lucide-react';
import { SectionCard } from '@/shared/ui/card';
import { LevelBadge } from '@/shared/ui/badge';
import { EmptyState } from '@/shared/ui/empty-state';
import { useLeaderboard } from '@/store/app-store';

const RANK_COLORS = ['text-amber-500', 'text-slate-400', 'text-amber-700', 'text-slate-500', 'text-slate-500'];

export function TopStudents() {
  const students = useLeaderboard().slice(0, 5);

  return (
    <SectionCard title="Топ 5 учеников" description="По общему количеству баллов">
      {students.length === 0 ? (
        <EmptyState icon={<Trophy className="size-5" />} title="Учеников пока нет" />
      ) : (
        <div className="flex flex-col gap-1">
          {students.map((student, index) => (
            <Link
              key={student.id}
              href={`/students/${student.id}`}
              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
            >
              <span className={`text-sm font-bold w-5 text-center shrink-0 ${RANK_COLORS[index] ?? 'text-slate-400'}`}>
                {index + 1}
              </span>
              <div className="size-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold shrink-0">
                {student.fullName.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate group-hover:text-emerald-700 transition-colors">
                  {student.fullName}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <LevelBadge level={student.level} />
                  <span className="text-xs text-slate-400">Группа {student.group}</span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-base font-bold text-slate-900">{student.totalPoints}</p>
                <p className="text-[10px] text-slate-400">баллов</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
