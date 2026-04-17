'use client';

import { forwardRef } from 'react';
import { cn } from '../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 shadow-sm',
  secondary:
    'bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-300',
  ghost:
    'bg-transparent text-slate-600 hover:bg-slate-100 active:bg-slate-200',
  danger:
    'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 shadow-sm',
  outline:
    'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-10 px-5 text-sm gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, disabled, className, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed select-none',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {loading && (
        <span className="size-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
      )}
      {children}
    </button>
  )
);

Button.displayName = 'Button';
