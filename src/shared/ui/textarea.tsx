'use client';

import { forwardRef } from 'react';
import { cn } from '../lib/cn';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'min-h-[80px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors resize-none',
            'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent',
            'disabled:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60',
            error && 'border-red-400 focus:ring-red-400',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
