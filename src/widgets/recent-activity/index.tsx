'use client';

import { Zap } from 'lucide-react';
import { SectionCard } from '@/shared/ui/card';
import { PointsBadge } from '@/shared/ui/badge';
import { EmptyState } from '@/shared/ui/empty-state';
import { formatRelative } from '@/shared/lib/dates';
import { useRecentActivity, useStudents } from '@/store/app-store';
import { POINT_SOURCE_LABELS } from '@/entities/points/model/types';

export function RecentActivity() {
  const activity = useRecentActivity(12);
  const students = useStudents();

  const studentName = (id: string) =>
    students.find((s) => s.id === id)?.fullName ?? 'Неизвестный';

  return (
    <SectionCard title="Последняя активность" description="Последние начисления баллов">
      {activity.length === 0 ? (
        <EmptyState icon={<Zap className="size-5" />} title="Активности пока нет" />
      ) : (
        <div className="flex flex-col divide-y divide-slate-50">
          {activity.map((item) => (
            <div key={item.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <div className="size-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-[10px] font-bold text-slate-500">
                {POINT_SOURCE_LABELS[item.source][0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-800 truncate">{item.reason}</p>
                <p className="text-xs text-slate-400 truncate">{studentName(item.studentId)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <PointsBadge points={item.points} />
                <span className="text-[10px] text-slate-400">{formatRelative(item.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
