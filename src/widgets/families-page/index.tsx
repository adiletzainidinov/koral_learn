'use client';

import { useTranslation } from '@/shared/i18n/use-translation';


import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Plus, UserPlus, Home } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { cn } from '@/shared/lib/cn';
import { FamiliesTable } from './families-table';
import { RepresentativesTable } from './representatives-table';

type Tab = 'families' | 'representatives';

function FamiliesPageContent() {
  const { t: translateText } = useTranslation();

  const searchParams = useSearchParams();
  const router = useRouter();
  const raw = searchParams.get('tab');
  const tab: Tab = raw === 'representatives' ? 'representatives' : 'families';

  const [familySearch, setFamilySearch] = useState('');
  const [repSearch, setRepSearch] = useState('');

  function switchTab(t: Tab) {
    router.replace(`/families?tab=${t}`, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ── Page header ───────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{translateText("Семьи")}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{translateText("Семьи, ученики и представители")}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/families/new">
            <Button variant="outline" size="sm">
              <Home className="size-4" />
              <span className="hidden sm:inline">{translateText("Добавить семью")}</span>
              <span className="sm:hidden">{translateText("Семья")}</span>
            </Button>
          </Link>
          <Link href="/parents/new">
            <Button size="sm">
              <UserPlus className="size-4" />
              <span className="hidden sm:inline">{translateText("Добавить представителя")}</span>
              <span className="sm:hidden">{translateText("Представитель")}</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────── */}
      <div
        role="tablist"
        aria-label={translateText("Разделы")}
        className="flex items-center border-b border-slate-200 gap-0 -mb-1"
      >
        <button
          role="tab"
          aria-selected={tab === 'families'}
          aria-controls="tab-panel-families"
          id="tab-families"
          onClick={() => switchTab('families')}
          className={cn(
            'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
            tab === 'families'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          )}
        >{translateText("Семьи")}</button>
        <button
          role="tab"
          aria-selected={tab === 'representatives'}
          aria-controls="tab-panel-representatives"
          id="tab-representatives"
          onClick={() => switchTab('representatives')}
          className={cn(
            'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
            tab === 'representatives'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          )}
        >{translateText("Представители")}</button>
      </div>

      {/* ── Toolbar: shared search ─────────────────────────────────────── */}
      <div className="relative max-w-sm w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
        <Input
          placeholder={
            translateText(tab === 'families'
              ? translateText('Поиск по семье, ученику или представителю...')
              : translateText('Поиск по имени, номеру или семье...'))
          }
          value={tab === 'families' ? familySearch : repSearch}
          onChange={(e) =>
            tab === 'families'
              ? setFamilySearch(e.target.value)
              : setRepSearch(e.target.value)
          }
          className="pl-9"
        />
      </div>

      {/* ── Tab panels ────────────────────────────────────────────────── */}
      <div
        id="tab-panel-families"
        role="tabpanel"
        aria-labelledby="tab-families"
        hidden={tab !== 'families'}
      >
        {tab === 'families' && <FamiliesTable search={familySearch} />}
      </div>

      <div
        id="tab-panel-representatives"
        role="tabpanel"
        aria-labelledby="tab-representatives"
        hidden={tab !== 'representatives'}
      >
        {tab === 'representatives' && <RepresentativesTable search={repSearch} />}
      </div>
    </div>
  );
}

export function FamiliesPage() {
  return (
    <Suspense fallback={null}>
      <FamiliesPageContent />
    </Suspense>
  );
}
