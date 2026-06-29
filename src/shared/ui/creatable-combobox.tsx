'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

interface Option {
  value: string;
  label: string;
}

interface CreatableComboboxProps {
  label?: string;
  placeholder?: string;
  /** Preset key when !isCustom, ignored when isCustom */
  value: string;
  /** The free-form text when user chose custom; shown in trigger when isCustom */
  customValue?: string;
  isCustom?: boolean;
  options: Option[];
  onChange: (value: string, isCustom: boolean) => void;
  error?: string;
  className?: string;
}

export function CreatableCombobox({
  label,
  placeholder = 'Выберите или введите...',
  value,
  customValue = '',
  isCustom = false,
  options,
  onChange,
  error,
  className,
}: CreatableComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayValue = isCustom ? customValue : (options.find((o) => o.value === value)?.label ?? '');

  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const trimmedQuery = query.trim();
  const queryMatchesPreset = filtered.some(
    (o) => o.label.toLowerCase() === trimmedQuery.toLowerCase()
  );
  const showCreateOption = trimmedQuery.length > 0 && !queryMatchesPreset;

  type ListItem =
    | { type: 'option'; value: string; label: string }
    | { type: 'create'; value: string; label: string }
    | { type: 'hint' };

  const listItems: ListItem[] = [
    ...filtered.map((o): ListItem => ({ type: 'option', value: o.value, label: o.label })),
    ...(showCreateOption
      ? [{ type: 'create' as const, value: trimmedQuery, label: `Использовать «${trimmedQuery}»` }]
      : [{ type: 'hint' as const }]),
  ];

  function openDropdown() {
    setOpen(true);
    setQuery('');
    setActiveIdx(-1);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function closeDropdown() {
    setOpen(false);
    setQuery('');
    setActiveIdx(-1);
  }

  function selectItem(item: ListItem) {
    if (item.type === 'hint') return;
    if (item.type === 'option') {
      onChange(item.value, false);
    } else {
      onChange(item.value, true);
    }
    closeDropdown();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const navigable = listItems.filter((i) => i.type !== 'hint');
    if (e.key === 'Escape') {
      closeDropdown();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, navigable.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const navigableItems = listItems.filter((i): i is Exclude<ListItem, { type: 'hint' }> => i.type !== 'hint');
      if (activeIdx >= 0 && navigableItems[activeIdx]) {
        selectItem(navigableItems[activeIdx]);
      } else if (trimmedQuery) {
        onChange(trimmedQuery, true);
        closeDropdown();
      }
    }
  }

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeDropdown();
      }
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange('', false);
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {label && (
        <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      )}
      <button
        type="button"
        onClick={openDropdown}
        className={cn(
          'w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm text-left bg-white transition-all',
          open
            ? 'border-emerald-500 ring-2 ring-emerald-500/20'
            : 'border-slate-200 hover:border-slate-300',
          error ? 'border-red-300' : '',
        )}
      >
        <span className={displayValue ? 'text-slate-900' : 'text-slate-400'}>
          {displayValue || placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {(value || isCustom) && (
            <span
              role="button"
              tabIndex={-1}
              onMouseDown={handleClear}
              className="text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="size-3.5" />
            </span>
          )}
          <ChevronDown
            className={cn(
              'size-4 text-slate-400 transition-transform shrink-0',
              open && 'rotate-180',
            )}
          />
        </div>
      </button>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden max-h-[260px] flex flex-col">
          <div className="p-2 border-b border-slate-100 shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActiveIdx(-1); }}
              onKeyDown={handleKeyDown}
              placeholder="Поиск..."
              className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-slate-200 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="overflow-y-auto py-1">
            {listItems.map((item, idx) => {
              if (item.type === 'hint') {
                return (
                  <div key="__hint__" className="px-3 py-2 text-xs text-slate-400 border-t border-slate-100 mt-1">
                    Введите выше для своего варианта
                  </div>
                );
              }
              const navigableIdx = listItems
                .slice(0, idx)
                .filter((i) => i.type !== 'hint').length;
              const isActive = activeIdx === navigableIdx;
              const isSelected =
                item.type === 'option' && item.value === value && !isCustom;

              return (
                <button
                  key={item.type === 'create' ? '__create__' : item.value}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); selectItem(item); }}
                  onMouseEnter={() => setActiveIdx(navigableIdx)}
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2',
                    item.type === 'create'
                      ? 'text-emerald-700 font-medium border-t border-slate-100 mt-1'
                      : 'text-slate-700',
                    isActive ? 'bg-emerald-50' : 'hover:bg-slate-50',
                  )}
                >
                  {isSelected ? (
                    <Check className="size-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <span className="size-3.5 shrink-0" />
                  )}
                  {item.label}
                </button>
              );
            })}
            {listItems.length === 0 && (
              <p className="text-center text-sm text-slate-400 py-4">Нет вариантов</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
