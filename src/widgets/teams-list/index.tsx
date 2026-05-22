'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus, Search, Users, Trophy, Target, Zap, ChevronRight, Star,
  Calendar, Shuffle, Crown, Medal, Monitor, TrendingUp, X,
} from 'lucide-react';
import {
  useTeams, useAppStore, useStudents, useActiveSeason, useTeamSeasons,
  useActiveSeasonId,
} from '@/store/app-store';
import {
  TEAM_COLOR_CLASSES, TEAM_COLORS, TEAM_POINT_PRESETS,
  TEAM_BADGE_META, getTeamLevel, getNextLevelInfo, TEAM_LEVEL_CONFIGS,
  type TeamColor, type TeamBadgeType,
} from '@/entities/team/model/types';
import { cn } from '@/shared/lib/cn';

function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => setH(true), []);
  return h;
}

// ─── Preset Award Modal ───────────────────────────────────────────────────────

function PresetAwardModal({ teamId, teamName, onClose }: { teamId: string; teamName: string; onClose: () => void }) {
  const award = useAppStore((s) => s.awardTeamPoints);
  const [selected, setSelected] = useState<typeof TEAM_POINT_PRESETS[number] | null>(null);
  const [customPts, setCustomPts] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [mode, setMode] = useState<'preset' | 'manual'>('preset');

  function submit() {
    if (mode === 'preset' && selected) {
      award(teamId, selected.points, selected.label, 'preset');
      onClose();
    } else if (mode === 'manual') {
      const n = parseInt(customPts, 10);
      if (!n || !customReason.trim()) return;
      award(teamId, n, customReason.trim(), 'manual');
      onClose();
    }
  }

  const positivePresets = TEAM_POINT_PRESETS.filter((p) => p.points > 0);
  const negativePresets = TEAM_POINT_PRESETS.filter((p) => p.points < 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Начислить баллы</h2>
            <p className="text-sm text-slate-500 mt-0.5">Команда: <span className="font-medium text-slate-700">{teamName}</span></p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="size-4" /></button>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 p-4 pb-0">
          <button onClick={() => setMode('preset')} className={cn('flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors', mode === 'preset' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100')}>Быстрые</button>
          <button onClick={() => setMode('manual')} className={cn('flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors', mode === 'manual' ? 'bg-slate-700 text-white' : 'text-slate-600 hover:bg-slate-100')}>Вручную</button>
        </div>

        <div className="p-4 space-y-4">
          {mode === 'preset' ? (
            <>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Положительные</p>
                <div className="grid grid-cols-2 gap-2">
                  {positivePresets.map((p) => (
                    <button key={p.id} onClick={() => setSelected(selected?.id === p.id ? null : p)}
                      className={cn('flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all text-sm',
                        selected?.id === p.id
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-medium'
                          : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50')}>
                      <span className="text-lg">{p.icon}</span>
                      <div>
                        <div className="font-medium text-xs">{p.label}</div>
                        <div className="text-emerald-600 font-bold text-xs">+{p.points} бал.</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Штрафы</p>
                <div className="grid grid-cols-2 gap-2">
                  {negativePresets.map((p) => (
                    <button key={p.id} onClick={() => setSelected(selected?.id === p.id ? null : p)}
                      className={cn('flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all text-sm',
                        selected?.id === p.id
                          ? 'border-red-400 bg-red-50 text-red-800 font-medium'
                          : 'border-slate-200 hover:border-red-300 hover:bg-red-50/50')}>
                      <span className="text-lg">{p.icon}</span>
                      <div>
                        <div className="font-medium text-xs">{p.label}</div>
                        <div className="text-red-600 font-bold text-xs">{p.points} бал.</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              {selected && (
                <div className={cn('rounded-xl px-4 py-3 text-sm font-medium text-center border', selected.points > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700')}>
                  Команда получит <span className="font-bold">{selected.points > 0 ? `+${selected.points}` : selected.points} баллов</span> — {selected.label}
                </div>
              )}
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Баллы (отрицательные — штраф)</label>
                <input type="number" value={customPts} onChange={(e) => setCustomPts(e.target.value)}
                  placeholder="+20 или -5"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Причина</label>
                <input type="text" value={customReason} onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Например: Отличное чтение сегодня"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              {customPts && customReason && (
                <div className={cn('rounded-xl px-4 py-3 text-sm font-medium text-center border', parseInt(customPts) > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700')}>
                  Команда получит <span className="font-bold">{parseInt(customPts) > 0 ? `+${customPts}` : customPts} баллов</span>
                </div>
              )}
            </>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Отмена</button>
            <button onClick={submit}
              disabled={mode === 'preset' ? !selected : (!customPts || !customReason.trim())}
              className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-40 transition-colors">
              Начислить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Badge Award Modal ────────────────────────────────────────────────────────

function BadgeAwardModal({ teamId, teamName, onClose }: { teamId: string; teamName: string; onClose: () => void }) {
  const awardBadge = useAppStore((s) => s.awardTeamBadge);
  const [selected, setSelected] = useState<TeamBadgeType | null>(null);

  const badgeTypes = Object.entries(TEAM_BADGE_META) as [TeamBadgeType, typeof TEAM_BADGE_META[TeamBadgeType]][];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-slate-900 mb-1">Выдать бейдж</h2>
        <p className="text-sm text-slate-500 mb-4">Команда: <span className="font-medium text-slate-700">{teamName}</span></p>
        <div className="grid grid-cols-2 gap-2 mb-5">
          {badgeTypes.map(([type, meta]) => (
            <button key={type} onClick={() => setSelected(selected === type ? null : type)}
              className={cn('flex items-center gap-2 p-3 rounded-xl border text-left transition-all',
                selected === type ? 'border-amber-400 bg-amber-50' : 'border-slate-200 hover:border-amber-300')}>
              <span className="text-2xl">{meta.icon}</span>
              <div>
                <div className="text-xs font-semibold text-slate-800">{meta.title}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{meta.description}</div>
              </div>
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Отмена</button>
          <button onClick={() => { if (selected) { awardBadge(teamId, selected); onClose(); } }}
            disabled={!selected}
            className="flex-1 px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 disabled:opacity-40">
            Выдать бейдж 🏅
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Season Modal ─────────────────────────────────────────────────────────────

function SeasonModal({ onClose }: { onClose: () => void }) {
  const createSeason = useAppStore((s) => s.createTeamSeason);
  const [title, setTitle] = useState('');
  const [start, setStart] = useState(new Date().toISOString().split('T')[0]);
  const [end, setEnd] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-slate-900 mb-5">Создать сезон</h2>
        <form onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          createSeason({ title: title.trim(), startDate: start, endDate: end || undefined });
          onClose();
        }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Название сезона <span className="text-red-400">*</span></label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus
              placeholder="Весенний сезон 2026"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Начало</label>
              <input type="date" value={start} onChange={(e) => setStart(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Конец</label>
              <input type="date" value={end} onChange={(e) => setEnd(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Отмена</button>
            <button type="submit" disabled={!title.trim()} className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-40">Создать</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Auto Distribution Modal ──────────────────────────────────────────────────

type DistPreview = { name: string; color: TeamColor; emoji: string; studentIds: string[] };

function AutoDistributionModal({ onClose }: { onClose: () => void }) {
  const students = useStudents();
  const createTeam = useAppStore((s) => s.createTeam);
  const [count, setCount] = useState('3');
  const [strategy, setStrategy] = useState<'equal' | 'level' | 'balanced'>('balanced');
  const [preview, setPreview] = useState<DistPreview[] | null>(null);

  const activeStudents = students.filter((s) => s.isActive);

  function generate() {
    const n = Math.max(2, Math.min(8, parseInt(count, 10) || 3));
    const shuffled = [...activeStudents];

    if (strategy === 'level') {
      shuffled.sort((a, b) => {
        const lvl = { beginner: 0, intermediate: 1, advanced: 2 };
        return (lvl[b.level as keyof typeof lvl] ?? 0) - (lvl[a.level as keyof typeof lvl] ?? 0);
      });
    } else if (strategy === 'balanced') {
      shuffled.sort((a, b) => b.totalPoints - a.totalPoints);
    } else {
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
    }

    const teamNames = ['Ан-Нур', 'Аль-Фатиха', 'Аль-Ихлас', 'Аль-Бакара', 'Ар-Рахман', 'Аль-Имран', 'Аль-Каусар', 'Аль-Аср'];
    const teamEmojis = ['💡', '🌿', '✨', '📖', '🌙', '⭐', '🌊', '🔥'];
    const colors: TeamColor[] = ['blue', 'emerald', 'amber', 'purple', 'teal', 'rose', 'indigo', 'orange'];

    const teams: DistPreview[] = Array.from({ length: n }, (_, i) => ({
      name: teamNames[i] ?? `Команда ${i + 1}`,
      color: colors[i] ?? 'blue',
      emoji: teamEmojis[i] ?? '🏆',
      studentIds: [] as string[],
    }));

    if (strategy === 'balanced') {
      // Snake draft: 0,1,2,2,1,0,0,1,2...
      shuffled.forEach((s, i) => {
        const cycle = Math.floor(i / n);
        const pos = i % n;
        const idx = cycle % 2 === 0 ? pos : n - 1 - pos;
        teams[idx].studentIds.push(s.id);
      });
    } else {
      shuffled.forEach((s, i) => {
        teams[i % n].studentIds.push(s.id);
      });
    }

    setPreview(teams);
  }

  function apply() {
    if (!preview) return;
    preview.forEach((t) => createTeam({ name: t.name, color: t.color, emoji: t.emoji, studentIds: t.studentIds }));
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white px-6 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Авто-распределение</h2>
            <p className="text-sm text-slate-500">{activeStudents.length} учеников доступно</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="size-4 text-slate-400" /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Количество команд</label>
              <input type="number" min="2" max="8" value={count} onChange={(e) => setCount(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Принцип</label>
              <select value={strategy} onChange={(e) => setStrategy(e.target.value as typeof strategy)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                <option value="balanced">Сбалансированно</option>
                <option value="level">По уровню</option>
                <option value="equal">Поровну</option>
              </select>
            </div>
          </div>

          <button onClick={generate} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-700 text-white text-sm font-medium hover:bg-slate-800">
            <Shuffle className="size-4" /> Сформировать команды
          </button>

          {preview && (
            <>
              <div className="space-y-2">
                {preview.map((t, i) => {
                  const cls = TEAM_COLOR_CLASSES[t.color];
                  const members = activeStudents.filter((s) => t.studentIds.includes(s.id));
                  return (
                    <div key={i} className={cn('rounded-xl border p-3', cls.light, 'border-slate-200')}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-lg">{t.emoji}</span>
                        <span className={cn('font-semibold text-sm', cls.text)}>{t.name}</span>
                        <span className="text-xs text-slate-400 ml-auto">{members.length} уч.</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {members.map((s) => (
                          <span key={s.id} className="text-xs bg-white border border-slate-200 px-2 py-0.5 rounded-lg text-slate-600">{s.fullName.split(' ')[0]}</span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-3">
                <button onClick={generate} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1.5">
                  <Shuffle className="size-3.5" /> Перегенерировать
                </button>
                <button onClick={apply} className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700">
                  Применить
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Edit Team Modal ──────────────────────────────────────────────────────────

function EditTeamModal({ teamId, initialName, initialDescription, initialColor, onClose }: {
  teamId: string; initialName: string; initialDescription?: string; initialColor: TeamColor; onClose: () => void;
}) {
  const updateTeam = useAppStore((s) => s.updateTeam);
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription ?? '');
  const [color, setColor] = useState<TeamColor>(initialColor);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-slate-900 mb-5">Изменить команду</h2>
        <form onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          updateTeam(teamId, { name: name.trim(), description: description.trim() || undefined, color });
          onClose();
        }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Название</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Описание</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Цвет</label>
            <div className="flex flex-wrap gap-2">
              {TEAM_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={cn('size-7 rounded-full transition-all', TEAM_COLOR_CLASSES[c].dot, color === c ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-105')} />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Отмена</button>
            <button type="submit" disabled={!name.trim()} className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-40">Сохранить</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Team Podium ──────────────────────────────────────────────────────────────

function TeamPodium({ teams, students, useSeasonPoints }: {
  teams: ReturnType<typeof useTeams>;
  students: ReturnType<typeof useStudents>;
  useSeasonPoints: boolean;
}) {
  const router = useRouter();
  const sorted = [...teams].sort((a, b) => {
    const ap = useSeasonPoints ? (a.seasonPoints ?? 0) : a.points;
    const bp = useSeasonPoints ? (b.seasonPoints ?? 0) : b.points;
    return bp - ap;
  }).slice(0, 3);

  if (sorted.length < 1) return null;

  const order = sorted.length >= 2 ? [sorted[1], sorted[0], sorted[2]].filter(Boolean) : sorted;
  const heights = sorted.length >= 2 ? ['h-24', 'h-32', 'h-20'] : ['h-32'];
  const medals = ['🥈', '🥇', '🥉'];
  const labelColors = ['text-slate-500', 'text-amber-600', 'text-orange-500'];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-slate-900 flex items-center gap-2"><Trophy className="size-4 text-amber-500" /> Рейтинг команд</h2>
        <span className="text-xs text-slate-400">{useSeasonPoints ? 'По сезону' : 'За всё время'}</span>
      </div>
      <div className="flex items-end justify-center gap-3">
        {order.map((team, i) => {
          if (!team) return null;
          const cls = TEAM_COLOR_CLASSES[team.color as TeamColor] ?? TEAM_COLOR_CLASSES.emerald;
          const pts = useSeasonPoints ? (team.seasonPoints ?? 0) : team.points;
          const memberCount = students.filter((s) => team.studentIds.includes(s.id)).length;
          const level = getTeamLevel(pts);
          const levelCfg = TEAM_LEVEL_CONFIGS[level];
          const actualRank = order.length >= 2 ? [2, 1, 3][i] : 1;

          return (
            <div key={team.id} className={cn('flex flex-col items-center flex-1 cursor-pointer group')} onClick={() => router.push(`/teams/${team.id}`)}>
              <div className="text-2xl mb-1">{team.emoji ?? '🏆'}</div>
              <div className={cn('font-bold text-sm text-center mb-1 truncate max-w-full', cls.text)}>{team.name}</div>
              <div className="text-xs text-slate-400 mb-2">{memberCount} уч. · {levelCfg.emoji}</div>
              <div className={cn('w-full rounded-t-xl flex flex-col items-center justify-end pb-3 transition-all group-hover:opacity-90', heights[i] ?? 'h-24', cls.light, 'border border-b-0', 'border-slate-200')}>
                <div className="text-xl">{medals[i]}</div>
                <div className={cn('font-bold text-lg', cls.text)}>{pts}</div>
                <div className="text-[10px] text-slate-400">баллов</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Season Card ──────────────────────────────────────────────────────────────

function SeasonCard({ onNewSeason }: { onNewSeason: () => void }) {
  const season = useActiveSeason();
  const teams = useTeams();
  const finishSeason = useAppStore((s) => s.finishTeamSeason);
  const resetPoints = useAppStore((s) => s.resetSeasonPoints);

  if (!season) {
    return (
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl border border-slate-200 p-5 mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Активный сезон</p>
          <p className="font-bold text-slate-700 mt-0.5">Нет активного сезона</p>
        </div>
        <button onClick={onNewSeason} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700">
          <Plus className="size-4" /> Создать сезон
        </button>
      </div>
    );
  }

  const leader = [...teams].sort((a, b) => (b.seasonPoints ?? 0) - (a.seasonPoints ?? 0))[0];
  const daysLeft = season.endDate
    ? Math.max(0, Math.ceil((new Date(season.endDate).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 p-5 mb-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">● Активный сезон</span>
            {daysLeft !== null && (
              <span className="text-xs text-slate-500">Осталось {daysLeft} дн.</span>
            )}
          </div>
          <h3 className="font-bold text-slate-900 text-lg">{season.title}</h3>
          {season.description && <p className="text-sm text-slate-500 mt-0.5">{season.description}</p>}
          <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
            <span className="flex items-center gap-1"><Calendar className="size-3.5" /> {new Date(season.startDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
            {season.endDate && <span>— {new Date(season.endDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>}
            {leader && <span className="flex items-center gap-1 font-medium text-amber-600"><Crown className="size-3.5" /> {leader.emoji} {leader.name}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onNewSeason} className="px-3 py-1.5 rounded-xl border border-emerald-300 text-sm font-medium text-emerald-700 hover:bg-emerald-100">+ Новый</button>
          <button onClick={() => {
            if (confirm('Завершить сезон? Будет определён победитель по сезонным баллам.')) {
              finishSeason(season.id);
            }
          }} className="px-3 py-1.5 rounded-xl bg-slate-700 text-white text-sm font-medium hover:bg-slate-800">Завершить</button>
        </div>
      </div>
    </div>
  );
}

// ─── Team Card ────────────────────────────────────────────────────────────────

function TeamCard({
  team, students, rank, useSeasonPoints, onAward, onEdit, onBadge,
}: {
  team: ReturnType<typeof useTeams>[number];
  students: ReturnType<typeof useStudents>;
  rank: number;
  useSeasonPoints: boolean;
  onAward: (id: string) => void;
  onEdit: (id: string) => void;
  onBadge: (id: string) => void;
}) {
  const router = useRouter();
  const cls = TEAM_COLOR_CLASSES[team.color as TeamColor] ?? TEAM_COLOR_CLASSES.emerald;
  const members = students.filter((s) => team.studentIds.includes(s.id));
  const goal = team.goal;
  const goalPct = goal ? Math.min(100, Math.round((goal.currentPoints / goal.targetPoints) * 100)) : 0;
  const pts = useSeasonPoints ? (team.seasonPoints ?? 0) : team.points;
  const level = getTeamLevel(pts);
  const levelCfg = TEAM_LEVEL_CONFIGS[level];
  const badges = team.badges ?? [];

  return (
    <div
      className={cn('bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden border-l-4 cursor-pointer', cls.border)}
      onClick={() => router.push(`/teams/${team.id}`)}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={cn('size-10 rounded-xl flex items-center justify-center text-xl shrink-0', cls.light)}>
              {team.emoji ?? '🏆'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-bold text-slate-900 truncate">{team.name}</h3>
                {rank <= 3 && (
                  <span className="text-xs">{rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded-md', cls.badge)}>{levelCfg.emoji} {levelCfg.label}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className={cn('flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-bold', cls.badge)}>
              <Star className="size-3.5" /> {pts}
            </div>
            {useSeasonPoints && team.points !== pts && (
              <span className="text-[10px] text-slate-400">{team.points} всего</span>
            )}
          </div>
        </div>

        {/* Members */}
        <div className="flex items-center gap-1.5 mt-3">
          <Users className="size-3.5 text-slate-400 shrink-0" />
          <span className="text-xs text-slate-500">{members.length} участник{members.length === 1 ? '' : members.length < 5 ? 'а' : 'ов'}</span>
          <div className="flex gap-1 ml-2 flex-wrap">
            {members.slice(0, 3).map((s) => (
              <span key={s.id} className="text-xs text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-md">{s.fullName.split(' ')[0]}</span>
            ))}
            {members.length > 3 && <span className="text-xs text-slate-400">+{members.length - 3}</span>}
          </div>
        </div>

        {/* Badges */}
        {badges.length > 0 && (
          <div className="flex items-center gap-1 mt-2">
            {badges.slice(-3).map((b) => (
              <span key={b.id} className="text-base" title={b.title}>{b.icon}</span>
            ))}
            {badges.length > 3 && <span className="text-xs text-slate-400">+{badges.length - 3}</span>}
          </div>
        )}
      </div>

      {/* Goal progress */}
      {goal?.status === 'active' && (
        <div className="px-5 pb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <div className="flex items-center gap-1 text-slate-500"><Target className="size-3.5" /><span className="truncate max-w-[150px]">{goal.title}</span></div>
            <span className={cn('font-semibold', cls.text)}>{goalPct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div className={cn('h-full rounded-full transition-all', cls.dot)} style={{ width: `${goalPct}%` }} />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-5 pb-4 flex gap-2" onClick={(e) => e.stopPropagation()}>
        <Link href={`/teams/${team.id}`}
          className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50">
          Открыть <ChevronRight className="size-3" />
        </Link>
        <button onClick={() => onAward(team.id)}
          className={cn('flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-medium', cls.badge, 'hover:opacity-90')}>
          <Zap className="size-3.5" /> Баллы
        </button>
        <button onClick={() => onBadge(team.id)} title="Выдать бейдж"
          className="px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-600 hover:bg-amber-50 hover:border-amber-200">
          🏅
        </button>
        <button onClick={() => onEdit(team.id)}
          className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50">
          ✏️
        </button>
      </div>
    </div>
  );
}

// ─── Main Widget ──────────────────────────────────────────────────────────────

export function TeamsList() {
  const hydrated = useHydrated();
  const teams = useTeams();
  const students = useStudents();
  const deleteTeam = useAppStore((s) => s.deleteTeam);
  const activeSeason = useActiveSeason();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'goal' | 'empty' | 'top'>('all');
  const [sort, setSort] = useState<'points' | 'season' | 'members' | 'name'>('season');
  const [useSeasonPoints, setUseSeasonPoints] = useState(true);
  const [awardTeamId, setAwardTeamId] = useState<string | null>(null);
  const [editTeamId, setEditTeamId] = useState<string | null>(null);
  const [badgeTeamId, setBadgeTeamId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showSeasonModal, setShowSeasonModal] = useState(false);
  const [showAutoModal, setShowAutoModal] = useState(false);

  const awardingTeam = teams.find((t) => t.id === awardTeamId);
  const editingTeam = teams.find((t) => t.id === editTeamId);
  const badgeTeam = teams.find((t) => t.id === badgeTeamId);

  const totalStudentsInTeams = new Set(teams.flatMap((t) => t.studentIds)).size;
  const topTeam = [...teams].sort((a, b) => (b.seasonPoints ?? 0) - (a.seasonPoints ?? 0))[0];
  const activeGoals = teams.filter((t) => t.goal?.status === 'active').length;
  const totalPoints = teams.reduce((s, t) => s + t.points, 0);

  const sortedForRanking = [...teams].sort((a, b) => {
    const sp = useSeasonPoints;
    const av = sp ? (a.seasonPoints ?? 0) : a.points;
    const bv = sp ? (b.seasonPoints ?? 0) : b.points;
    return bv - av;
  });

  const filtered = teams
    .filter((t) => {
      if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filter === 'goal') return t.goal?.status === 'active';
      if (filter === 'empty') return t.studentIds.length === 0;
      if (filter === 'top') {
        const maxPts = Math.max(...teams.map((x) => useSeasonPoints ? (x.seasonPoints ?? 0) : x.points));
        const pts = useSeasonPoints ? (t.seasonPoints ?? 0) : t.points;
        return pts >= maxPts * 0.6;
      }
      return true;
    })
    .sort((a, b) => {
      if (sort === 'members') return b.studentIds.length - a.studentIds.length;
      if (sort === 'name') return a.name.localeCompare(b.name, 'ru');
      if (sort === 'season') return (b.seasonPoints ?? 0) - (a.seasonPoints ?? 0);
      return b.points - a.points;
    });

  if (!hydrated) return (
    <div className="p-6 max-w-7xl mx-auto animate-pulse space-y-4">
      <div className="h-8 w-48 bg-slate-100 rounded-xl" />
      <div className="h-32 bg-slate-100 rounded-2xl" />
      <div className="grid grid-cols-4 gap-4">{Array(4).fill(0).map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-2xl" />)}</div>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Команды</h1>
          <p className="text-sm text-slate-500 mt-0.5">Командная мотивация, рейтинги и игры</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/teams/display"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">
            <Monitor className="size-4" /> Экран
          </Link>
          <button onClick={() => setShowAutoModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">
            <Shuffle className="size-4" /> Авто-распределение
          </button>
          <Link href="/teams/new"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700">
            <Plus className="size-4" /> Создать команду
          </Link>
        </div>
      </div>

      {/* Season card */}
      <SeasonCard onNewSeason={() => setShowSeasonModal(true)} />

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Команд', value: teams.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'В командах', value: `${totalStudentsInTeams} уч.`, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Лидер сезона', value: topTeam ? `${topTeam.emoji ?? ''} ${topTeam.name}` : '—', icon: Trophy, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Всего баллов', value: totalPoints, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
            <div className={cn('size-10 rounded-xl flex items-center justify-center', bg)}>
              <Icon className={cn('size-5', color)} />
            </div>
            <div>
              <p className="text-xs text-slate-500">{label}</p>
              <p className="font-bold text-slate-900 text-sm truncate max-w-[120px]">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Podium */}
      {teams.length >= 2 && <TeamPodium teams={teams} students={students} useSeasonPoints={useSeasonPoints} />}

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input type="text" placeholder="Поиск команды..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
        </div>
        <div className="flex rounded-xl border border-slate-200 overflow-hidden text-xs font-medium">
          {(['all', 'goal', 'empty', 'top'] as const).map((v) => (
            <button key={v} onClick={() => setFilter(v)}
              className={cn('px-3 py-2 transition-colors', filter === v ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-50')}>
              {v === 'all' ? 'Все' : v === 'goal' ? 'С целью' : v === 'empty' ? 'Пустые' : 'Лидеры'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-medium">
          <span className="text-slate-500 py-2">Рейтинг:</span>
          <button onClick={() => { setUseSeasonPoints(true); setSort('season'); }}
            className={cn('py-2 px-1', useSeasonPoints ? 'text-emerald-600 font-bold' : 'text-slate-400')}>По сезону</button>
          <span className="text-slate-200">|</span>
          <button onClick={() => { setUseSeasonPoints(false); setSort('points'); }}
            className={cn('py-2 px-1', !useSeasonPoints ? 'text-slate-700 font-bold' : 'text-slate-400')}>Всего</button>
        </div>
      </div>

      {/* Teams grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="size-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Users className="size-8 text-slate-400" />
          </div>
          <h3 className="font-semibold text-slate-700 mb-1">{teams.length === 0 ? 'Команд пока нет' : 'Ничего не найдено'}</h3>
          <p className="text-sm text-slate-400">{teams.length === 0 ? 'Создайте первую команду' : 'Попробуйте изменить фильтры'}</p>
          {teams.length === 0 && (
            <Link href="/teams/new" className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700">
              <Plus className="size-4" /> Создать команду
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((team) => {
            const rank = sortedForRanking.findIndex((t) => t.id === team.id) + 1;
            return (
              <TeamCard key={team.id} team={team} students={students} rank={rank}
                useSeasonPoints={useSeasonPoints} onAward={setAwardTeamId} onEdit={setEditTeamId} onBadge={setBadgeTeamId} />
            );
          })}
        </div>
      )}

      {/* Modals */}
      {awardTeamId && awardingTeam && <PresetAwardModal teamId={awardTeamId} teamName={awardingTeam.name} onClose={() => setAwardTeamId(null)} />}
      {editTeamId && editingTeam && (
        <EditTeamModal teamId={editTeamId} initialName={editingTeam.name}
          initialDescription={editingTeam.description} initialColor={editingTeam.color as TeamColor} onClose={() => setEditTeamId(null)} />
      )}
      {badgeTeamId && badgeTeam && <BadgeAwardModal teamId={badgeTeamId} teamName={badgeTeam.name} onClose={() => setBadgeTeamId(null)} />}
      {showSeasonModal && <SeasonModal onClose={() => setShowSeasonModal(false)} />}
      {showAutoModal && <AutoDistributionModal onClose={() => setShowAutoModal(false)} />}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Удалить команду?</h2>
            <p className="text-sm text-slate-500 mb-5">Ученики останутся в системе.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Отмена</button>
              <button onClick={() => { deleteTeam(deleteConfirm); setDeleteConfirm(null); }}
                className="flex-1 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600">Удалить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
