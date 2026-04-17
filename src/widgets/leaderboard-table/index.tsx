'use client';

import { Trophy } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/shared/ui/card';
import { LevelBadge } from '@/shared/ui/badge';
import { EmptyState } from '@/shared/ui/empty-state';
import { PageHeader } from '@/shared/ui/page-header';
import { useLeaderboard, useAssignments, useAttendanceRecords } from '@/store/app-store';

const RANK_MEDAL = ['🥇', '🥈', '🥉'];

export function LeaderboardTable() {
  const students = useLeaderboard();
  const assignments = useAssignments();
  const attendance = useAttendanceRecords();

  function doneCount(studentId: string) {
    return assignments.filter(
      (a) => a.studentId === studentId && a.status !== 'pending'
    ).length;
  }

  function presentCount(studentId: string) {
    return attendance.filter(
      (r) => r.studentId === studentId && r.status === 'present'
    ).length;
  }

  return (
    <div>
      <PageHeader
        title="Рейтинг"
        description="Топ учеников по количеству баллов"
      />

      {students.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Trophy className="size-5" />}
            title="Учеников пока нет"
            className="py-20"
          />
        </Card>
      ) : (
        <Card padding="none">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-12">
                  #
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Ученик
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Группа
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Уровень
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Заданий
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Посещений
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Баллы
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {students.map((student, index) => {
                const rank = index + 1;
                const isTop3 = rank <= 3;
                return (
                  <tr
                    key={student.id}
                    className={`group hover:bg-slate-50/60 transition-colors ${isTop3 ? 'bg-emerald-50/30' : ''}`}
                  >
                    <td className="px-5 py-3.5">
                      <span className={`text-sm font-bold ${isTop3 ? 'text-lg' : 'text-slate-500'}`}>
                        {RANK_MEDAL[index] ?? rank}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <Link
                        href={`/students/${student.id}`}
                        className="flex items-center gap-3 group/link"
                      >
                        <div
                          className={`size-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            isTop3 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {student.fullName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900 group-hover/link:text-emerald-700 transition-colors">
                            {student.fullName}
                          </p>
                          <p className="text-xs text-slate-400">{student.age} лет</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-medium text-slate-600">{student.group}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <LevelBadge level={student.level} />
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm text-slate-600">{doneCount(student.id)}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm text-slate-600">{presentCount(student.id)}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className={`text-xl font-bold ${isTop3 ? 'text-emerald-700' : 'text-slate-900'}`}>
                          {student.totalPoints}
                        </span>
                        <span className="text-xs text-slate-400">б.</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
