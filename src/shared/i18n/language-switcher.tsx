'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Languages } from 'lucide-react';
import { useTranslation } from './use-translation';

export function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation();
  return (
    <label className="flex min-w-0 shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-slate-600">
      <Languages className="hidden min-[380px]:block size-4 shrink-0" aria-hidden="true" />
      <select
        aria-label="Язык / Тил"
        value={locale}
        onChange={(event) => setLocale(event.target.value === 'ky' ? 'ky' : 'ru')}
        className="h-11 sm:h-8 w-23 min-w-0 cursor-pointer border-0 bg-transparent text-xs sm:text-sm focus-visible:outline-2 focus-visible:outline-emerald-600"
      >
        <option value="ky">Кыргызча</option>
        <option value="ru">Русский</option>
      </select>
    </label>
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
