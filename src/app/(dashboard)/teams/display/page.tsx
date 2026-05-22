'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAppStore, useTeams, useActiveSeason, useTeamGoals } from '@/store/app-store';
import { TEAM_COLOR_CLASSES, TEAM_LEVEL_CONFIGS, TEAM_BADGE_META, getTeamLevel, getNextLevelInfo } from '@/entities/team/model/types';
import { todayISO } from '@/shared/lib/dates';

function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);
  return hydrated;
}

function useTodayTeamAttendance() {
  // Pull raw stable references — selectors return s.teams / s.attendanceRecords directly,
  // so references only change when the actual data changes.
  const teams = useAppStore((s) => s.teams);
  const attendanceRecords = useAppStore((s) => s.attendanceRecords);

  // Derived mapping is computed in useMemo, not inside the Zustand selector.
  // This avoids the "getSnapshot result must be cached" infinite-loop warning
  // that happens when a selector returns new object/array references every call.
  return useMemo(() => {
    const today = todayISO();
    return teams.map((t) => {
      const presentCount = attendanceRecords.filter(
        (r) => r.date === today && t.studentIds.includes(r.studentId) && r.status === 'present',
      ).length;
      return { teamId: t.id, presentCount, totalCount: t.studentIds.length };
    });
  }, [teams, attendanceRecords]);
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function TeamsDisplayPage() {
  const hydrated = useHydrated();
  const teams = useTeams();
  const activeSeason = useActiveSeason();
  const allGoals = useTeamGoals();
  const todayAttendance = useTodayTeamAttendance();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-2xl animate-pulse">Загрузка...</div>
      </div>
    );
  }

  const sorted = [...teams].sort((a, b) => {
    const aPoints = activeSeason ? (a.seasonPoints ?? 0) : a.points;
    const bPoints = activeSeason ? (b.seasonPoints ?? 0) : b.points;
    return bPoints - aPoints;
  });

  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  const teamOfWeek = teams.find((t) => (t.badges ?? []).some((b) => b.type === 'team_of_week'));
  const recentBadges = teams
    .flatMap((t) => (t.badges ?? []).map((b) => ({ ...b, teamName: t.name, teamColor: t.color })))
    .sort((a, b) => b.awardedAt.localeCompare(a.awardedAt))
    .slice(0, 5);

  const activeGoals = allGoals.filter((g) => g.status === 'active').slice(0, 3);

  const seasonDaysLeft = activeSeason?.endDate ? daysUntil(activeSeason.endDate) : null;

  const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });

  const podiumOrder = top3.length === 3 ? [top3[1], top3[0], top3[2]] : top3.length === 2 ? [top3[1], top3[0]] : top3;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6 font-sans select-none">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">🏆 Рейтинг команд</h1>
          {activeSeason && (
            <p className="text-slate-400 text-lg mt-1">
              {activeSeason.title}
              {seasonDaysLeft !== null && (
                <span className="ml-3 bg-amber-500/20 text-amber-300 text-sm px-2 py-0.5 rounded-full">
                  {seasonDaysLeft === 0 ? 'Последний день!' : `Осталось ${seasonDaysLeft} дн.`}
                </span>
              )}
            </p>
          )}
        </div>
        <div className="text-right">
          <div className="text-3xl font-mono font-bold text-amber-400">{timeStr}</div>
          <div className="text-slate-400 text-sm capitalize">{dateStr}</div>
          <button
            onClick={toggleFullscreen}
            className="mt-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            {isFullscreen ? '✕ Выйти из полного экрана' : '⛶ Полный экран'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">

        {/* Left: Podium + rest */}
        <div className="col-span-8 space-y-6">

          {/* Podium */}
          {top3.length > 0 && (
            <div className="bg-slate-800/60 rounded-2xl p-6 border border-slate-700">
              <div className="flex items-end justify-center gap-4 mb-2" style={{ minHeight: 260 }}>
                {podiumOrder.map((team, pIdx) => {
                  const rank = top3.indexOf(team) + 1;
                  const pts = activeSeason ? (team.seasonPoints ?? 0) : team.points;
                  const colors = TEAM_COLOR_CLASSES[team.color];
                  const level = getTeamLevel(team.points);
                  const levelCfg = TEAM_LEVEL_CONFIGS[level];
                  const isFirst = rank === 1;
                  const isSecond = rank === 2;
                  const heights = { 1: 220, 2: 170, 3: 140 };
                  const podiumHeight = heights[rank as keyof typeof heights] ?? 140;
                  const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
                  const medal = medals[rank as keyof typeof medals];

                  return (
                    <div key={team.id} className="flex flex-col items-center flex-1 max-w-[220px]">
                      {/* Crown for 1st */}
                      {isFirst && (
                        <div className="text-4xl mb-1 animate-bounce">👑</div>
                      )}

                      {/* Team card above podium */}
                      <div className={`w-full rounded-xl p-4 mb-3 text-center border-2 ${colors.light} ${colors.border} ${isFirst ? 'shadow-2xl scale-105' : ''} transition-all`}>
                        <div className="text-3xl mb-1">{team.emoji ?? levelCfg.emoji}</div>
                        <div className={`font-bold text-lg ${colors.text} truncate`}>{team.name}</div>
                        <div className="text-2xl font-bold text-slate-800 mt-1">
                          {pts.toLocaleString('ru-RU')} <span className="text-sm font-normal text-slate-500">балл.</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">{levelCfg.emoji} {levelCfg.label}</div>
                        {/* Badges row */}
                        {(team.badges ?? []).length > 0 && (
                          <div className="flex flex-wrap justify-center gap-0.5 mt-2">
                            {(team.badges ?? []).slice(0, 6).map((b) => (
                              <span key={b.id} title={b.title} className="text-sm">{b.icon}</span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Podium block */}
                      <div
                        className={`w-full rounded-t-xl flex flex-col items-center justify-start pt-3 border-t-4 ${colors.header} ${isFirst ? 'shadow-2xl' : ''}`}
                        style={{ height: podiumHeight }}
                      >
                        <span className="text-4xl">{medal}</span>
                        <span className="text-white font-bold text-xl mt-1">#{rank}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Rest of teams */}
          {rest.length > 0 && (
            <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700">
              <h3 className="text-slate-400 text-sm font-medium mb-3">Остальные команды</h3>
              <div className="grid grid-cols-2 gap-3">
                {rest.map((team, idx) => {
                  const rank = idx + 4;
                  const pts = activeSeason ? (team.seasonPoints ?? 0) : team.points;
                  const colors = TEAM_COLOR_CLASSES[team.color];
                  const level = getTeamLevel(team.points);
                  const levelCfg = TEAM_LEVEL_CONFIGS[level];
                  const attendance = todayAttendance.find((a) => a.teamId === team.id);

                  return (
                    <div key={team.id} className={`flex items-center gap-3 p-3 rounded-xl border ${colors.light} ${colors.border}`}>
                      <span className="text-2xl font-bold text-slate-400 w-8 text-center">#{rank}</span>
                      <span className="text-2xl">{team.emoji ?? levelCfg.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className={`font-semibold truncate ${colors.text}`}>{team.name}</div>
                        <div className="text-slate-500 text-xs">{levelCfg.label}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-700">{pts}</div>
                        {attendance && (
                          <div className="text-xs text-slate-500">👤 {attendance.presentCount}/{attendance.totalCount}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="col-span-4 space-y-4">

          {/* Team of the week */}
          {teamOfWeek && (
            <div className="bg-gradient-to-br from-amber-500/20 to-yellow-600/10 rounded-2xl p-5 border border-amber-500/30">
              <div className="text-amber-400 font-semibold text-sm mb-2">🏆 Команда недели</div>
              <div className="flex items-center gap-3">
                <span className="text-4xl">{teamOfWeek.emoji ?? '⭐'}</span>
                <div>
                  <div className={`font-bold text-xl ${TEAM_COLOR_CLASSES[teamOfWeek.color].text}`}>
                    {teamOfWeek.name}
                  </div>
                  <div className="text-slate-400 text-sm">
                    {(activeSeason ? (teamOfWeek.seasonPoints ?? 0) : teamOfWeek.points)} балл.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Today's attendance per team */}
          <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700">
            <div className="text-slate-400 font-semibold text-sm mb-3">📅 Сегодня присутствуют</div>
            <div className="space-y-2">
              {sorted.slice(0, 6).map((team) => {
                const att = todayAttendance.find((a) => a.teamId === team.id);
                const colors = TEAM_COLOR_CLASSES[team.color];
                const pct = att && att.totalCount > 0 ? Math.round((att.presentCount / att.totalCount) * 100) : 0;
                return (
                  <div key={team.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                        <span className="text-sm text-slate-300 truncate max-w-[130px]">{team.name}</span>
                      </div>
                      <span className="text-sm text-slate-400">
                        {att ? `${att.presentCount}/${att.totalCount}` : '—'}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${colors.dot}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active goals */}
          {activeGoals.length > 0 && (
            <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700">
              <div className="text-slate-400 font-semibold text-sm mb-3">🎯 Цели</div>
              <div className="space-y-3">
                {activeGoals.map((goal) => {
                  const team = teams.find((t) => t.id === goal.teamId);
                  if (!team) return null;
                  const colors = TEAM_COLOR_CLASSES[team.color];
                  const pct = Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));
                  return (
                    <div key={goal.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-slate-300 truncate max-w-[160px]">{goal.title}</span>
                        <span className="text-xs text-slate-500">{pct}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
                        <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${colors.dot}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 flex-shrink-0">
                          {goal.currentValue}/{goal.targetValue}
                        </span>
                      </div>
                      <div className={`text-xs mt-0.5 ${colors.text}`}>{team.name}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent badges */}
          {recentBadges.length > 0 && (
            <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700">
              <div className="text-slate-400 font-semibold text-sm mb-3">🎖 Последние достижения</div>
              <div className="space-y-2">
                {recentBadges.map((badge) => {
                  const meta = TEAM_BADGE_META[badge.type];
                  const colors = TEAM_COLOR_CLASSES[badge.teamColor];
                  return (
                    <div key={badge.id} className="flex items-center gap-3">
                      <span className="text-2xl">{badge.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-200 truncate">{meta.title}</div>
                        <div className={`text-xs ${colors.text} truncate`}>{badge.teamName}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Level progress for top team */}
          {sorted[0] && (() => {
            const team = sorted[0];
            const { currentLevel, nextLevel, progress, pointsToNext } = getNextLevelInfo(team.points);
            const levelCfg = TEAM_LEVEL_CONFIGS[currentLevel];
            const nextCfg = nextLevel ? TEAM_LEVEL_CONFIGS[nextLevel] : null;
            const colors = TEAM_COLOR_CLASSES[team.color];
            return (
              <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700">
                <div className="text-slate-400 font-semibold text-sm mb-3">📈 Прогресс лидера</div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{team.emoji ?? levelCfg.emoji}</span>
                  <div>
                    <div className={`font-semibold ${colors.text}`}>{team.name}</div>
                    <div className="text-slate-500 text-xs">{levelCfg.emoji} {levelCfg.label}</div>
                  </div>
                </div>
                {nextCfg && (
                  <>
                    <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden mb-1">
                      <div
                        className={`h-full rounded-full ${colors.dot} transition-all`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>{levelCfg.label}</span>
                      <span>До «{nextCfg.label}» — {pointsToNext} балл.</span>
                    </div>
                  </>
                )}
                {!nextCfg && (
                  <div className="text-center text-amber-400 text-sm font-medium mt-1">🏆 Максимальный уровень!</div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
