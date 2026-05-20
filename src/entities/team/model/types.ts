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
  createdAt: string;
  goal?: TeamGoal;
}

export interface TeamPointHistory {
  id: string;
  teamId: string;
  points: number;
  reason: string;
  createdAt: string;
  source: 'manual' | 'goal' | 'game' | 'attendance' | 'assignment';
}

export interface TeamGame {
  id: string;
  title: string;
  description?: string;
  teamIds: string[];
  pointsForWinner: number;
  status: 'planned' | 'active' | 'finished';
  winnerTeamId?: string;
  createdAt: string;
}

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

export const TEAM_SOURCE_LABELS: Record<TeamPointHistory['source'], string> = {
  manual: 'Вручную',
  goal: 'Цель',
  game: 'Игра',
  attendance: 'Посещаемость',
  assignment: 'Задание',
};

export const TEAM_GAME_STATUS_LABELS: Record<TeamGame['status'], string> = {
  planned: 'Запланирована',
  active: 'Идёт',
  finished: 'Завершена',
};

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
