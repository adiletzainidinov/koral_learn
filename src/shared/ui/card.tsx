import { cn } from '../lib/cn';

interface CardProps {
  className?: string;
  children: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

export function Card({ className, children, padding = 'md' }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-slate-200 shadow-sm',
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </div>
  );
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card padding="none" className={className}>
      <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="p-5">{children}</div>
    </Card>
  );
}

export function StatCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent?: 'emerald' | 'blue' | 'amber' | 'purple';
}) {
  const iconBg: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  const accentKey = accent ?? 'emerald';

  return (
    <Card className="flex items-center gap-4">
      <div className={cn('size-11 rounded-xl flex items-center justify-center shrink-0', iconBg[accentKey])}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 truncate">{label}</p>
        <p className="text-2xl font-bold text-slate-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </Card>
  );
}
