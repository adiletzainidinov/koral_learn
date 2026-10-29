'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, BookOpen, CheckCircle2, Clock3, ListVideo, Play } from 'lucide-react';
import type { TeacherLesson } from '@/entities/teacher-lesson/model/types';
import { formatLessonTime } from '@/entities/teacher-lesson/model/helpers';
import { useTeacherProgress } from '@/entities/teacher-lesson/model/progress-store';
import { useTranslation } from '@/shared/i18n/use-translation';
import { PageHeader } from '@/shared/ui/page-header';

type LibraryLesson = Omit<TeacherLesson, 'moments'> & { momentCount: number };

export function TeacherLessonLibrary({ lessons }: { lessons: LibraryLesson[] }) {
  const { locale, t } = useTranslation();
  const watched = useTeacherProgress((state) => state.watched);
  const [unavailableCovers, setUnavailableCovers] = useState<string[]>([]);

  useEffect(() => { void useTeacherProgress.persist.rehydrate(); }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title={t('Уроки для устаза')} description={t('Посмотрите урок, затем используйте шпаргалку на занятии.')} />

      <div className="flex items-start gap-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 sm:p-5">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm">
          <BookOpen className="size-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-semibold text-emerald-950">{t('Сначала — полный просмотр. Затем — короткое повторение.')}</p>
          <p className="mt-1 text-sm leading-relaxed text-emerald-800">{t('У каждого урока есть видео на YouTube, ключевые моменты и личная закладка.')}</p>
        </div>
      </div>

      <section aria-label={t('Библиотека уроков')} className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {lessons.map((lesson) => (
          <Link key={lesson.id} href={`/teacher-lessons/${lesson.id}`} className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-600">
            <div className="relative aspect-video overflow-hidden bg-emerald-900">
              {!unavailableCovers.includes(lesson.id) && <Image src={`https://i.ytimg.com/vi/${lesson.youtubeId}/hqdefault.jpg`} alt="" fill unoptimized sizes="(max-width: 768px) 100vw, 420px" onError={() => setUnavailableCovers((previous) => previous.includes(lesson.id) ? previous : [...previous, lesson.id])} className="object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none" />}
              <div className="absolute inset-0 bg-linear-to-t from-slate-950/65 via-slate-950/10 to-transparent" />
              <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-slate-700">{t('Урок')} {String(lesson.number).padStart(2, '0')}</span>
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex size-13 items-center justify-center rounded-full bg-white/95 text-emerald-700 shadow-lg transition-transform group-hover:scale-105 motion-reduce:transition-none"><Play className="ml-0.5 size-5 fill-current" aria-hidden="true" /></span>
              </span>
              <span className="absolute bottom-3 right-3 rounded-md bg-slate-950/70 px-2 py-1 text-xs font-medium tabular-nums text-white">{formatLessonTime(lesson.durationSeconds)}</span>
            </div>
            <div className="flex flex-1 flex-col p-5">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">{lesson.language[locale]}</span>
                {watched[lesson.id] ? <span className="flex items-center gap-1 text-emerald-700"><CheckCircle2 className="size-3.5" aria-hidden="true" />{t('Просмотрено')}</span> : <span className="text-amber-700">{t('Обязательно к просмотру')}</span>}
              </div>
              <h2 className="text-lg font-bold leading-snug text-slate-900 group-hover:text-emerald-800">{lesson.title[locale]}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{lesson.description[locale]}</p>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><Clock3 className="size-3.5" aria-hidden="true" />{formatLessonTime(lesson.durationSeconds)}</span>
                <span className="flex items-center gap-1.5"><ListVideo className="size-3.5" aria-hidden="true" />{t('Ключевых моментов:')} {lesson.momentCount}</span>
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-sm font-semibold text-emerald-700">
                <span>{t('Открыть урок')}</span><ArrowUpRight className="size-4" aria-hidden="true" />
              </div>
            </div>
          </Link>
        ))}
      </section>

      <p className="text-xs leading-relaxed text-slate-400">{t('Отметки просмотра и закладки сохраняются в этом браузере.')}</p>
    </div>
  );
}
