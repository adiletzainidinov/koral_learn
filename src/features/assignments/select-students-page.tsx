'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, Check, Users } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/shared/ui/button';
import { useStudents } from '@/store/app-store';
import { useUIStore } from '@/store/ui-store';

function pluralStudents(n: number) {
  if (n === 0) return 'Никто не выбран';
  if (n % 10 === 1 && n % 100 !== 11) return `${n} ученик`;
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return `${n} ученика`;
  return `${n} учеников`;
}

export function SelectStudentsPage() {
  const router = useRouter();
  const students = useStudents();
  const { selectedStudentIds, setSelectedStudentIds } = useUIStore();

  // initialise from store so "back" preserves selection
  const [selected, setSelected] = useState<string[]>(selectedStudentIds);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState<string>('all');

  const activeStudents = students.filter((s) => s.isActive);
  const groups = [...new Set(activeStudents.map((s) => String(s.group)))].sort();

  const visibleStudents = activeStudents
    .filter((s) => groupFilter === 'all' || String(s.group) === groupFilter)
    .filter((s) => !search || s.fullName.toLowerCase().includes(search.toLowerCase()));

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function selectAll() {
    setSelected(visibleStudents.map((s) => s.id));
  }

  function clearAll() {
    setSelected([]);
  }

  function handleNext() {
    if (selected.length === 0) return;
    setSelectedStudentIds(selected);
    router.push('/assignments/create');
  }

  return (
    <>
      <div className="flex flex-col gap-6 pb-28">
        {/* breadcrumb */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/assignments">
            <Button variant="ghost" size="sm" className="size-8 p-0">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <Link href="/assignments" className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
            Задания
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-sm font-medium text-slate-900">Выберите учеников</span>
        </div>

        {/* header */}
        <div>
          <h1 className="text-xl font-bold text-slate-900">Выберите учеников</h1>
          <p className="text-sm text-slate-500 mt-1">Задание будет создано для каждого выбранного ученика</p>
        </div>

        <div className="max-w-2xl flex flex-col gap-4">
          {/* search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по имени..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors bg-white"
            />
          </div>

          {/* group filter */}
          {groups.length > 1 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setGroupFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  groupFilter === 'all'
                    ? 'bg-slate-800 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Все группы
              </button>
              {groups.map((g) => (
                <button
                  key={g}
                  onClick={() => setGroupFilter(g)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    groupFilter === g
                      ? 'bg-slate-800 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Группа {g}
                </button>
              ))}
            </div>
          )}

          {/* quick actions */}
          {visibleStudents.length > 1 && (
            <div className="flex items-center gap-3">
              <button
                onClick={selectAll}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium cursor-pointer"
              >
                Выбрать всех
              </button>
              {selected.length > 0 && (
                <>
                  <span className="text-slate-300">·</span>
                  <button
                    onClick={clearAll}
                    className="text-sm text-slate-500 hover:text-slate-700 cursor-pointer"
                  >
                    Снять выбор
                  </button>
                </>
              )}
            </div>
          )}

          {/* student list */}
          {activeStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Users className="size-8 text-slate-300" />
              <p className="text-sm text-slate-500">Нет активных учеников</p>
              <Link href="/students/new">
                <Button variant="outline" size="sm">Добавить ученика</Button>
              </Link>
            </div>
          ) : visibleStudents.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-12">Ученики не найдены</p>
          ) : (
            <div className="flex flex-col gap-1">
              {visibleStudents.map((s) => {
                const isSelected = selected.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggle(s.id)}
                    className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'bg-emerald-50 border border-emerald-200'
                        : 'bg-white border border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {/* checkbox */}
                    <div className={`size-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                      isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 bg-white'
                    }`}>
                      {isSelected && <Check className="size-3 text-white" strokeWidth={3} />}
                    </div>

                    {/* avatar */}
                    <div className={`size-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${
                      isSelected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {s.fullName.slice(0, 2).toUpperCase()}
                    </div>

                    {/* info */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isSelected ? 'text-emerald-900' : 'text-slate-900'}`}>
                        {s.fullName}
                      </p>
                      <p className="text-xs text-slate-400">Группа {s.group}</p>
                    </div>

                    {isSelected && (
                      <span className="text-xs text-emerald-600 font-medium shrink-0">Выбран</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-slate-200 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium transition-colors ${
              selected.length > 0 ? 'text-emerald-600' : 'text-slate-400'
            }`}>
              {selected.length > 0 ? `Выбрано: ${pluralStudents(selected.length)}` : 'Никто не выбран'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/assignments">
              <Button variant="outline">Отмена</Button>
            </Link>
            <Button onClick={handleNext} disabled={selected.length === 0}>
              Далее →
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
