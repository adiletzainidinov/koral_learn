import { cn } from '../lib/cn';
import type { AssignmentStatus, AssignmentType } from '@/entities/assignment/model/types';
import type { AttendanceStatus } from '@/entities/attendance/model/types';
import type { StudentLevel } from '@/entities/student/model/types';

type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'purple'
  | 'emerald'
  | 'slate';

interface BadgeProps {
  variant?: BadgeVariant;
  className?: string;
  children: React.ReactNode;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 text-slate-600',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  slate: 'bg-slate-200 text-slate-700',
};

export function Badge({ variant = 'default', className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function AssignmentStatusBadge({ status }: { status: AssignmentStatus }) {
  const config: Record<AssignmentStatus, { label: string; variant: BadgeVariant }> = {
    pending: { label: 'На проверке', variant: 'warning' },
    not_done: { label: 'Не сделано', variant: 'danger' },
    done: { label: 'Сделано', variant: 'info' },
    good: { label: 'Хорошо', variant: 'success' },
    excellent: { label: 'Отлично', variant: 'emerald' },
  };
  const { label, variant } = config[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function AssignmentTypeBadge({ type }: { type: AssignmentType }) {
  const config: Record<AssignmentType, { label: string; variant: BadgeVariant }> = {
    intermediate: { label: 'Промежуточная', variant: 'info' },
    homework: { label: 'Домашняя', variant: 'purple' },
  };
  const { label, variant } = config[type];
  return <Badge variant={variant}>{label}</Badge>;
}

export function AttendanceStatusBadge({ status }: { status: AttendanceStatus }) {
  const config: Record<AttendanceStatus, { label: string; variant: BadgeVariant }> = {
    present: { label: 'Присутствовал', variant: 'success' },
    late: { label: 'Опоздал', variant: 'warning' },
    absent: { label: 'Отсутствовал', variant: 'danger' },
    excused: { label: 'Уваж. причина', variant: 'info' },
  };
  const { label, variant } = config[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function LevelBadge({ level }: { level: StudentLevel }) {
  const config: Record<StudentLevel, { label: string; variant: BadgeVariant }> = {
    beginner: { label: 'Начинающий', variant: 'slate' },
    intermediate: { label: 'Средний', variant: 'info' },
    advanced: { label: 'Продвинутый', variant: 'purple' },
  };
  const { label, variant } = config[level];
  return <Badge variant={variant}>{label}</Badge>;
}

export function PointsBadge({ points }: { points: number }) {
  return (
    <Badge variant={points > 0 ? 'emerald' : points < 0 ? 'danger' : 'slate'}>
      {points > 0 ? `+${points}` : points} б.
    </Badge>
  );
}
