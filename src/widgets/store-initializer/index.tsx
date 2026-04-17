'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store/app-store';

export function StoreInitializer() {
  const seed = useAppStore((s) => s._seed);
  const seeded = useAppStore((s) => s._seeded);

  useEffect(() => {
    if (!seeded) {
      seed();
    }
  }, [seed, seeded]);

  return null;
}
