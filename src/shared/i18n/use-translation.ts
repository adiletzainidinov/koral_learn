'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { getLocale, getServerLocale, setLocale, subscribeLocale } from './locale-store';
import { translate } from './translate';

export function useTranslation() {
  const locale = useSyncExternalStore(subscribeLocale, getLocale, getServerLocale);
  const t = useCallback(<T,>(value: T): T => translate(value, locale), [locale]);
  return { locale, t, setLocale };
}
