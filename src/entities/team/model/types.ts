// ─── Team levels ─────────────────────────────────────────────────────────────

export type TeamLevel = 'newbies' | 'trying' | 'strong' | 'huffaz';

export interface TeamLevelConfig {
  label: string;
  emoji: string;
  min: number;
  max: number;
}

export const TEAM_LEVEL_CONFIGS: Record<TeamLevel, TeamLevelConfig> = {
  newbies: { label: 'Новички',         emoji: '🌱', min: 0,   max: 99  },
  trying:  { label: 'Старающиеся',     emoji: '💪', min: 100, max: 299 },
  strong:  { label: 'Сильная команда', emoji: '🔥', min: 300, max: 599 },
  huffaz:  { label: 'Команда хафизов', emoji: '🏆', min: 600, max: Infinity },
};

export function getTeamLevel(points: number): TeamLevel {
  if (points >= 600) return 'huffaz';
  if (points >= 300) return 'strong';
  if (points >= 100) return 'trying';
  return 'newbies';
}

export function getNextLevelInfo(points: number): {
  currentLevel: TeamLevel;
  nextLevel: TeamLevel | null;
  progress: number;
  pointsToNext: number;
} {
  const currentLevel = getTeamLevel(points);
  const config = TEAM_LEVEL_CONFIGS[currentLevel];
  const levels: TeamLevel[] = ['newbies', 'trying', 'strong', 'huffaz'];
  const currentIdx = levels.indexOf(currentLevel);
  const nextLevel: TeamLevel | null = currentIdx < levels.length - 1 ? levels[currentIdx + 1] : null;
  if (!nextLevel) return { currentLevel, nextLevel: null, progress: 100, pointsToNext: 0 };
  const nextConfig = TEAM_LEVEL_CONFIGS[nextLevel];
  const rangeSize = nextConfig.min - config.min;
  const pointsInRange = points - config.min;
  const progress = Math.min(100, Math.round((pointsInRange / rangeSize) * 100));
  const pointsToNext = nextConfig.min - points;
  return { currentLevel, nextLevel, progress, pointsToNext };
}

// ─── Badge types ──────────────────────────────────────────────────────────────

export type TeamBadgeType =
  | 'most_active_week' | 'best_discipline' | 'best_recitation'
  | 'all_on_time' | 'helped_younger' | 'tajweed_no_mistakes' | 'team_of_week';

export const TEAM_BADGE_META: Record<TeamBadgeType, { title: string; icon: string; description: string }> = {
  most_active_week:    { title: 'Самая активная',    icon: '🔥', description: 'Самая активная команда недели' },
  best_discipline:     { title: 'Лучшая дисциплина', icon: '🕌', description: 'Лучшая дисциплина' },
  best_recitation:     { title: 'Лучшее чтение',     icon: '📖', description: 'Лучшее чтение Корана' },
  all_on_time:         { title: 'Все вовремя',        icon: '⏰', description: 'Все пришли вовремя' },
  helped_younger:      { title: 'Помогли младшим',    icon: '🤝', description: 'Помогли младшим ученикам' },
  tajweed_no_mistakes: { title: 'Таджвид без ошибок', icon: '🌟', description: 'Без ошибок в таджвиде' },
  team_of_week:        { title: 'Команда недели',     icon: '🏆', description: 'Команда недели' },
};

export interface TeamBadge {
  id: string;
  teamId: string;
  type: TeamBadgeType;
  title: string;
  description?: string;
  icon: string;
  awardedAt: string;
}

// ─── Season ───────────────────────────────────────────────────────────────────

export interface TeamSeason {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  status: 'active' | 'finished';
  winnerTeamId?: string | null;
  createdAt: string;
}

// ─── Rich goal ────────────────────────────────────────────────────────────────

export type RichTeamGoalType = 'points' | 'attendance' | 'quran' | 'discipline' | 'tajweed';

export const RICH_GOAL_TYPE_LABELS: Record<RichTeamGoalType, string> = {
  points: 'Баллы', attendance: 'Посещаемость', quran: 'Коран', discipline: 'Дисциплина', tajweed: 'Таджвид',
};

export const RICH_GOAL_TYPE_ICONS: Record<RichTeamGoalType, string> = {
  points: '⭐', attendance: '📅', quran: '📖', discipline: '🕌', tajweed: '✨',
};

export interface RichTeamGoal {
  id: string;
  teamId: string;
  seasonId?: string | null;
  type: RichTeamGoalType;
  title: string;
  description?: string;
  targetValue: number;
  currentValue: number;
  reward?: string;
  deadline?: string;
  status: 'active' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string | null;
}

// ─── Point presets ────────────────────────────────────────────────────────────

export interface TeamPointPreset {
  id: string;
  label: string;
  points: number;
  source: 'discipline' | 'recitation' | 'homework' | 'game' | 'help' | 'manual' | 'penalty';
  icon: string;
}

export const TEAM_POINT_PRESETS: TeamPointPreset[] = [
  { id: 'pp1',  label: 'Пришли вовремя',      points:  5,  source: 'discipline', icon: '⏰' },
  { id: 'pp2',  label: 'Хорошая дисциплина',  points: 10,  source: 'discipline', icon: '🕌' },
  { id: 'pp3',  label: 'Все сделали домашку',  points: 15,  source: 'homework',   icon: '📚' },
  { id: 'pp4',  label: 'Хорошее чтение',       points: 20,  source: 'recitation', icon: '📖' },
  { id: 'pp5',  label: 'Помогли младшим',       points: 25,  source: 'help',       icon: '🤝' },
  { id: 'pp6',  label: 'Активность на уроке',   points: 10,  source: 'manual',     icon: '🌟' },
  { id: 'pp7',  label: 'Хорошее повторение',    points: 15,  source: 'recitation', icon: '🔄' },
  { id: 'pp8',  label: 'Таджвид без ошибок',    points: 20,  source: 'recitation', icon: '✨' },
  { id: 'pp9',  label: 'Шумели',                points: -5,  source: 'penalty',    icon: '🔇' },
  { id: 'pp10', label: 'Нарушали правила',       points: -10, source: 'penalty',    icon: '⚠️' },
];

// ─── Reward ───────────────────────────────────────────────────────────────────

export type TeamRewardType =
  | 'certificate' | 'parent_praise' | 'choose_game' | 'extra_star'
  | 'sweet_gift' | 'instagram_photo' | 'team_of_week';

export const TEAM_REWARD_LABELS: Record<TeamRewardType, string> = {
  certificate:     'Сертификат',
  parent_praise:   'Похвала перед родителями',
  choose_game:     'Выбор игры',
  extra_star:      'Дополнительная звёздочка',
  sweet_gift:      'Сладкий подарок',
  instagram_photo: 'Фото в Instagram',
  team_of_week:    'Команда недели',
};

export interface TeamReward {
  id: string;
  teamId?: string | null;
  goalId?: string | null;
  title: string;
  description?: string;
  type: TeamRewardType;
  awardedAt?: string | null;
}

// ─── Core types (updated for backward compat) ─────────────────────────────────

export interface TeamGoal {
  id: string;
  title: string;
  targetPoints: number;
  currentPoints: number;
  reward?: string;
  deadline?: string;
  status: 'active' | 'completed';
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  color: TeamColor;
  emoji?: string;
  studentIds: string[];
  points: number;
  seasonPoints?: number;
  badges?: TeamBadge[];
  createdAt: string;
  goal?: TeamGoal;
  captainId?: string;
  assistantCaptainId?: string;
  disciplineResponsibleId?: string;
  revisionResponsibleId?: string;
}

export interface TeamPointHistory {
  id: string;
  teamId: string;
  seasonId?: string | null;
  points: number;
  reason: string;
  createdAt: string;
  source: 'manual' | 'preset' | 'goal' | 'game' | 'badge' | 'attendance' | 'assignment' | 'penalty';
  relatedGameId?: string | null;
  relatedGoalId?: string | null;
}

export interface TeamGame {
  id: string;
  title: string;
  description?: string;
  teamIds: string[];
  pointsForWinner: number;
  status: 'planned' | 'active' | 'finished';
  winnerTeamId?: string | null;
  createdAt: string;
  finishedAt?: string | null;
}

// ─── Colors ───────────────────────────────────────────────────────────────────

export type TeamColor =
  | 'red' | 'blue' | 'green' | 'amber' | 'purple'
  | 'indigo' | 'emerald' | 'rose' | 'orange' | 'teal'
  | 'violet' | 'cyan';

export const TEAM_COLORS: TeamColor[] = [
  'emerald', 'blue', 'amber', 'red', 'purple',
  'indigo', 'rose', 'orange', 'teal', 'violet', 'cyan', 'green',
];

export const TEAM_COLOR_CLASSES: Record<TeamColor, {
  dot: string; light: string; text: string; border: string; badge: string; header: string; ring: string;
}> = {
  red:     { dot: 'bg-red-500',     light: 'bg-red-50',     text: 'text-red-700',     border: 'border-l-red-400',     badge: 'bg-red-100 text-red-700',     header: 'bg-red-500',     ring: 'ring-red-300' },
  blue:    { dot: 'bg-blue-500',    light: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-l-blue-400',    badge: 'bg-blue-100 text-blue-700',    header: 'bg-blue-500',    ring: 'ring-blue-300' },
  green:   { dot: 'bg-green-500',   light: 'bg-green-50',   text: 'text-green-700',   border: 'border-l-green-400',   badge: 'bg-green-100 text-green-700',   header: 'bg-green-500',   ring: 'ring-green-300' },
  amber:   { dot: 'bg-amber-500',   light: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-l-amber-400',   badge: 'bg-amber-100 text-amber-700',   header: 'bg-amber-500',   ring: 'ring-amber-300' },
  purple:  { dot: 'bg-purple-500',  light: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-l-purple-400',  badge: 'bg-purple-100 text-purple-700',  header: 'bg-purple-500',  ring: 'ring-purple-300' },
  indigo:  { dot: 'bg-indigo-500',  light: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-l-indigo-400',  badge: 'bg-indigo-100 text-indigo-700',  header: 'bg-indigo-500',  ring: 'ring-indigo-300' },
  emerald: { dot: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-l-emerald-400', badge: 'bg-emerald-100 text-emerald-700', header: 'bg-emerald-500', ring: 'ring-emerald-300' },
  rose:    { dot: 'bg-rose-500',    light: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-l-rose-400',    badge: 'bg-rose-100 text-rose-700',    header: 'bg-rose-500',    ring: 'ring-rose-300' },
  orange:  { dot: 'bg-orange-500',  light: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-l-orange-400',  badge: 'bg-orange-100 text-orange-700',  header: 'bg-orange-500',  ring: 'ring-orange-300' },
  teal:    { dot: 'bg-teal-500',    light: 'bg-teal-50',    text: 'text-teal-700',    border: 'border-l-teal-400',    badge: 'bg-teal-100 text-teal-700',    header: 'bg-teal-500',    ring: 'ring-teal-300' },
  violet:  { dot: 'bg-violet-500',  light: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-l-violet-400',  badge: 'bg-violet-100 text-violet-700',  header: 'bg-violet-500',  ring: 'ring-violet-300' },
  cyan:    { dot: 'bg-cyan-500',    light: 'bg-cyan-50',    text: 'text-cyan-700',    border: 'border-l-cyan-400',    badge: 'bg-cyan-100 text-cyan-700',    header: 'bg-cyan-500',    ring: 'ring-cyan-300' },
};

// ─── Labels ───────────────────────────────────────────────────────────────────

export const TEAM_SOURCE_LABELS: Record<TeamPointHistory['source'], string> = {
  manual:     'Вручную',
  preset:     'Быстрое начисление',
  goal:       'Цель',
  game:       'Игра',
  badge:      'Бейдж',
  attendance: 'Посещаемость',
  assignment: 'Задание',
  penalty:    'Штраф',
};

export const TEAM_GAME_STATUS_LABELS: Record<TeamGame['status'], string> = {
  planned:  'Запланирована',
  active:   'Идёт',
  finished: 'Завершена',
};

// ─── Input types ──────────────────────────────────────────────────────────────

export type CreateTeamInput = {
  name: string;
  description?: string;
  color: TeamColor;
  emoji?: string;
  studentIds: string[];
  goal?: { title: string; targetPoints: number; reward?: string; deadline?: string };
};

export type UpdateTeamInput = Partial<Pick<Team, 'name' | 'description' | 'color' | 'emoji'>>;

export type CreateTeamGameInput = {
  title: string;
  description?: string;
  teamIds: string[];
  pointsForWinner: number;
  status: 'planned' | 'active';
};

export type CreateRichTeamGoalInput = {
  teamId: string;
  seasonId?: string | null;
  type: RichTeamGoalType;
  title: string;
  description?: string;
  targetValue: number;
  reward?: string;
  deadline?: string;
};

export type TeamMemberRole = 'captain' | 'assistant' | 'discipline' | 'revision' | 'member';

export const TEAM_MEMBER_ROLE_LABELS: Record<TeamMemberRole, string> = {
  captain:    'Капитан',
  assistant:  'Пом. капитана',
  discipline: 'Ответ. за дисциплину',
  revision:   'Ответ. за повторение',
  member:     'Участник',
};
