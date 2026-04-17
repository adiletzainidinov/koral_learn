'use client';

import { forwardRef } from 'react';
import { cn } from '../lib/cn';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={inputId}
          className={cn(
            'h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 transition-colors appearance-none cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent',
            'disabled:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60',
            error && 'border-red-400 focus:ring-red-400',
            className
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
