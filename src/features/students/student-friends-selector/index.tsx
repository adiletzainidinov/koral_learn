'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, X, Users } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { formatWhatsappLink } from '@/entities/parent/model/helpers';
import type { Student } from '@/entities/student/model/types';

// ─── Selected friend card ─────────────────────────────────────────────────────

function FriendCard({ student, onRemove }: { student: Student; onRemove: () => void }) {
  const initials = student.fullName.slice(0, 2).toUpperCase();
  const contactLine = student.studentWhatsapp || student.studentPhone || student.studentTelegram;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 group">
      <div className="size-9 rounded-full overflow-hidden bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold shrink-0">
        {student.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={student.avatar} alt={student.fullName} className="size-full object-cover" />
        ) : initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900">{student.fullName}</p>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
          <span>Группа {student.group}</span>
          <span>·</span>
          <span>{student.age} лет</span>
          {contactLine && (
            <>
              <span>·</span>
              {student.studentWhatsapp ? (
                <a
                  href={formatWhatsappLink(student.studentWhatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-green-600 hover:underline"
                >
                  WA
                </a>
              ) : (
                <span>{contactLine}</span>
              )}
            </>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="size-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

// ─── Main selector ────────────────────────────────────────────────────────────

interface Props {
  value: string[];
  onChange: (ids: string[]) => void;
  allStudents: Student[];
  excludeStudentId?: string;
}

export function StudentFriendsSelector({ value, onChange, allStudents, excludeStudentId }: Props) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedStudents = useMemo(
    () => allStudents.filter((s) => value.includes(s.id)),
    [allStudents, value]
  );

  const available = useMemo(() => {
    return allStudents.filter((s) => {
      if (s.id === excludeStudentId) return false;
      if (value.includes(s.id)) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return s.fullName.toLowerCase().includes(q) || s.group.toLowerCase().includes(q);
    });
  }, [allStudents, excludeStudentId, value, search]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function addFriend(id: string) {
    if (!value.includes(id)) onChange([...value, id]);
    setSearch('');
    setIsOpen(false);
  }

  function removeFriend(id: string) {
    onChange(value.filter((i) => i !== id));
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Selected friends */}
      {selectedStudents.length > 0 && (
        <div className="flex flex-col gap-2">
          {selectedStudents.map((s) => (
            <FriendCard key={s.id} student={s} onRemove={() => removeFriend(s.id)} />
          ))}
        </div>
      )}

      {/* Search input + dropdown */}
      <div ref={containerRef} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setIsOpen(true); }}
            onFocus={() => setIsOpen(true)}
            placeholder="Поиск ученика по имени или группе..."
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
          />
        </div>

        {isOpen && (
          <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-auto max-h-52">
            {available.length === 0 ? (
              <div className="flex flex-col items-center py-4 gap-1">
                <Users className="size-4 text-slate-300" />
                <p className="text-sm text-slate-400">
                  {search ? 'Ученики не найдены' : 'Все ученики уже выбраны'}
                </p>
              </div>
            ) : (
              available.map((s) => {
                const initials = s.fullName.slice(0, 2).toUpperCase();
                return (
                  <button
                    key={s.id}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); addFriend(s.id); }}
                    className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="size-7 rounded-full overflow-hidden bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold shrink-0">
                      {s.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.avatar} alt={s.fullName} className="size-full object-cover" />
                      ) : initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{s.fullName}</p>
                      <p className="text-xs text-slate-400">
                        Группа {s.group} · {s.age} лет
                        {s.studentPhone && ` · ${s.studentPhone}`}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {selectedStudents.length > 0 && (
        <p className="text-xs text-slate-400">
          {selectedStudents.length}{' '}
          {selectedStudents.length === 1 ? 'ученик выбран' : 'ученика выбраны'}
        </p>
      )}
    </div>
  );
}
