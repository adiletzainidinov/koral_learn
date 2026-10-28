'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslation } from './use-translation';

export function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation();
  return (
    <div
      role="group"
      aria-label="Язык / Тил"
      className="shrink-0 rounded-full border border-slate-200/80 bg-slate-100/80 p-0.5 shadow-[inset_0_1px_2px_0_rgb(15_23_42/0.03)] sm:p-1"
    >
      <div className="relative isolate grid grid-cols-2">
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-0 left-0 w-1/2 rounded-full bg-linear-to-b from-emerald-500 to-emerald-600 shadow-[0_2px_5px_0_rgb(5_150_105/0.22)] transition-transform duration-200 ease-out motion-reduce:transition-none ${locale === 'ru' ? 'translate-x-full' : 'translate-x-0'}`}
        />
        {([
          { value: 'ky', label: 'Кыргызча', shortLabel: 'КЫР' },
          { value: 'ru', label: 'Русский', shortLabel: 'РУС' },
        ] as const).map(({ value, label, shortLabel }) => (
          <button
            key={value}
            type="button"
            lang={value}
            aria-label={label}
            aria-pressed={locale === value}
            onClick={() => setLocale(value)}
            className={`relative h-11 w-13 cursor-pointer rounded-full text-[13px] font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 motion-reduce:transition-none sm:h-8 sm:w-24 sm:text-sm ${locale === value ? 'text-white' : 'text-slate-500 hover:text-emerald-700'}`}
          >
            <span aria-hidden="true" className="sm:hidden">{shortLabel}</span>
            <span aria-hidden="true" className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function LanguageDocument() {
  const { locale, t } = useTranslation();
  const pathname = usePathname();
  useEffect(() => {
    document.documentElement.lang = locale;
    const updateTitle = () => {
      const suffix = ' — QuranLearn';
      const title = document.title.endsWith(suffix) ? document.title.slice(0, -suffix.length) : document.title;
      const localizedTitle = t(title) + (title === 'QuranLearn' ? '' : suffix);
      if (document.title !== localizedTitle) document.title = localizedTitle;
    };
    updateTitle();
    // Next.js can stream route metadata after the effect has already run.
    const observer = new MutationObserver(updateTitle);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [locale, pathname, t]);
  return null;
}
