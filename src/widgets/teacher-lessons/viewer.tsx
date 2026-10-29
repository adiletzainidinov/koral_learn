'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bookmark, BookOpen, CheckCircle2, CircleHelp, Clock3, ExternalLink, ListVideo, Play, ShieldCheck } from 'lucide-react';
import type { TeacherLesson } from '@/entities/teacher-lesson/model/types';
import { formatLessonTime, getLessonEmbedUrl, getLessonWatchUrl } from '@/entities/teacher-lesson/model/helpers';
import { useTeacherProgress } from '@/entities/teacher-lesson/model/progress-store';
import { useTranslation } from '@/shared/i18n/use-translation';
import { cn } from '@/shared/lib/cn';

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600';

export function TeacherLessonViewer({ lesson }: { lesson: TeacherLesson }) {
  const { locale, t } = useTranslation();
  const watched = useTeacherProgress((state) => state.watched[lesson.id] ?? false);
  const bookmarkId = useTeacherProgress((state) => state.bookmarks[lesson.id]);
  const hydrated = useTeacherProgress((state) => state.hydrated);
  const setWatched = useTeacherProgress((state) => state.setWatched);
  const toggleBookmark = useTeacherProgress((state) => state.toggleBookmark);
  const [playback, setPlayback] = useState({ seconds: 0, revision: 0 });
  const videoRef = useRef<HTMLDivElement>(null);
  const bookmark = lesson.moments.find((moment) => moment.id === bookmarkId);
  const selectedMoment = lesson.moments.find((moment) => moment.seconds === playback.seconds);

  useEffect(() => { void useTeacherProgress.persist.rehydrate(); }, []);

  function jumpToVideo(seconds: number) {
    setPlayback((previous) => ({ seconds, revision: previous.revision + 1 }));
    videoRef.current?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/teacher-lessons" className={cn('mb-5 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-medium text-slate-500 hover:text-emerald-700', focusRing)}>
        <ArrowLeft className="size-4" aria-hidden="true" />{t('Все уроки')}
      </Link>

      <div className="mb-6">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">{t('Урок')} {String(lesson.number).padStart(2, '0')}</span>
          <span>{lesson.language[locale]}</span><span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1"><Clock3 className="size-3.5" aria-hidden="true" />{formatLessonTime(lesson.durationSeconds)}</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{lesson.title[locale]}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">{lesson.description[locale]}</p>
        <div className="mt-4 flex flex-wrap gap-2">{lesson.themes.map((theme, index) => <span key={index} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">{theme[locale]}</span>)}</div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 space-y-4">
          <div className={cn('flex items-start gap-3 rounded-2xl border p-4', watched ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50/70')}>
            <ShieldCheck className={cn('mt-0.5 size-5 shrink-0', watched ? 'text-emerald-700' : 'text-amber-700')} aria-hidden="true" />
            <div>
              <p className={cn('text-sm font-semibold', watched ? 'text-emerald-950' : 'text-amber-950')}>{watched ? t('Просмотр подтверждён') : t('Перед занятием обязательно посмотрите весь урок')}</p>
              <p className={cn('mt-1 text-sm leading-relaxed', watched ? 'text-emerald-800' : 'text-amber-800')}>{t('Шпаргалка помогает вспомнить материал после просмотра. Сначала изучите видео целиком.')}</p>
            </div>
          </div>

          <div ref={videoRef} id="lesson-video" className="scroll-mt-20 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="relative aspect-video min-h-[200px] bg-slate-950">
              <iframe
                key={playback.revision}
                src={getLessonEmbedUrl(lesson.youtubeId, playback.seconds, playback.revision > 0)}
                title={lesson.title[locale]}
                className="absolute inset-0 size-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <p aria-live="polite" className="min-w-0 text-xs text-slate-500">{selectedMoment ? `${t('Выбранный фрагмент:')} ${formatLessonTime(playback.seconds)} · ${selectedMoment.title[locale]}` : t('Полный урок')}</p>
              <a href={getLessonWatchUrl(lesson.youtubeId, playback.seconds)} target="_blank" rel="noopener noreferrer" className={cn('inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-1 text-sm font-semibold text-emerald-700 hover:text-emerald-900', focusRing)}>{t('Открыть на YouTube')}<ExternalLink className="size-3.5" aria-hidden="true" /></a>
            </div>
            <p className="border-t border-slate-100 px-4 py-3 text-xs leading-relaxed text-slate-400">{t('Если видео не воспроизводится здесь, откройте его на YouTube.')}</p>
          </div>

          <label className={cn('flex cursor-pointer items-start gap-3 rounded-xl border bg-white p-4', watched ? 'border-emerald-200' : 'border-slate-200')}>
            <input type="checkbox" checked={watched} disabled={!hydrated} onChange={(event) => setWatched(lesson.id, event.target.checked)} className="mt-0.5 size-5 shrink-0 cursor-pointer rounded accent-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600" />
            <span><span className="block text-sm font-semibold text-slate-800">{t('Я полностью посмотрел(а) урок')}</span><span className="mt-1 block text-xs text-slate-500">{t('Поставьте отметку только после полного просмотра.')}</span></span>
          </label>

          {bookmark && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4"><div className="flex min-w-0 items-center gap-2.5"><Bookmark className="size-4 shrink-0 fill-emerald-100 text-emerald-700" aria-hidden="true" /><div><p className="text-xs font-medium text-emerald-700">{t('Моя закладка')}</p><p className="mt-0.5 text-sm font-semibold text-slate-800">{formatLessonTime(bookmark.seconds)} · {bookmark.title[locale]}</p></div></div><button type="button" onClick={() => jumpToVideo(bookmark.seconds)} className={cn('inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100', focusRing)}><Play className="size-3.5" aria-hidden="true" />{t('Перейти к закладке')}</button></div>}
        </div>

        <aside className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white lg:sticky lg:top-20 lg:block">
          <div className="flex items-center gap-2 border-b border-slate-100 p-4"><ListVideo className="size-4 text-emerald-700" aria-hidden="true" /><h2 className="text-sm font-semibold text-slate-900">{t('План урока')}</h2></div>
          <ol className="max-h-[520px] overflow-y-auto p-2">
            {lesson.moments.map((moment) => <li key={moment.id}><button type="button" onClick={() => jumpToVideo(moment.seconds)} className={cn('flex min-h-11 w-full items-start gap-2 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-emerald-50', focusRing, playback.seconds === moment.seconds ? 'bg-emerald-50 text-emerald-800' : 'text-slate-600')}><span className="mt-0.5 shrink-0 font-mono text-[11px] tabular-nums text-emerald-700">{formatLessonTime(moment.seconds)}</span><span className="text-xs leading-relaxed">{moment.title[locale]}</span>{bookmarkId === moment.id && <Bookmark className="mt-0.5 size-3 shrink-0 text-emerald-700" aria-label={t('Моя закладка')} />}</button></li>)}
          </ol>
        </aside>
      </div>

      <section id="lesson-cheatsheet" aria-labelledby="cheatsheet-heading" className="mt-8 scroll-mt-20">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div><h2 id="cheatsheet-heading" className="flex items-center gap-2 text-xl font-bold text-slate-900"><BookOpen className="size-5 text-emerald-700" aria-hidden="true" />{t('Шпаргалка для устаза')}</h2><p className="mt-1 text-sm leading-relaxed text-slate-500">{t('Быстро вспомните суть, задайте вопрос детям и отметьте, где остановились.')}</p></div>
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500">{t('Ключевых моментов:')} {lesson.moments.length}</span>
        </div>

        <div className="grid items-start gap-4 xl:grid-cols-2">
          {lesson.moments.map((moment, index) => {
            const saved = bookmarkId === moment.id;
            return <article key={moment.id} id={`moment-${moment.id}`} className={cn('scroll-mt-20 overflow-hidden rounded-2xl border bg-white shadow-sm', saved ? 'border-emerald-400 ring-1 ring-emerald-100' : 'border-slate-200')}>
              <div className="p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-3"><span className="flex size-7 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-500">{String(index + 1).padStart(2, '0')}</span><button type="button" aria-label={`${t('Смотреть фрагмент')}: ${moment.title[locale]}, ${formatLessonTime(moment.seconds)}`} onClick={() => jumpToVideo(moment.seconds)} className={cn('inline-flex min-h-11 items-center gap-1.5 rounded-full bg-emerald-50 px-3 font-mono text-xs font-semibold tabular-nums text-emerald-800 hover:bg-emerald-100', focusRing)}><Play className="size-3" aria-hidden="true" />{formatLessonTime(moment.seconds)}</button></div>
                <h3 className="text-base font-bold leading-snug text-slate-900">{moment.title[locale]}</h3>
                <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">{moment.points[locale].map((point, pointIndex) => <li key={pointIndex} className="flex items-start gap-2"><span className="mt-2 size-1 shrink-0 rounded-full bg-emerald-400" aria-hidden="true" /><span>{point}</span></li>)}</ul>
                <div className="mt-4 rounded-xl bg-slate-50 p-3"><p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400"><CircleHelp className="size-3.5" aria-hidden="true" />{t('Вопрос детям')}</p><p className="mt-1.5 text-sm font-medium leading-relaxed text-slate-700">{moment.question[locale]}</p></div>
              </div>
              <button type="button" aria-pressed={saved} disabled={!hydrated} onClick={() => toggleBookmark(lesson.id, moment.id)} className={cn('flex min-h-12 w-full items-center justify-center gap-2 border-t px-4 py-3 text-sm font-medium transition-colors disabled:opacity-50', focusRing, saved ? 'border-emerald-100 bg-emerald-50 text-emerald-800 hover:bg-emerald-100' : 'border-slate-100 text-slate-500 hover:bg-slate-50 hover:text-emerald-700')}>
                {saved ? <CheckCircle2 className="size-4" aria-hidden="true" /> : <Bookmark className="size-4" aria-hidden="true" />}{saved ? t('Закладка сохранена · убрать') : t('Отметить, где остановился')}
              </button>
            </article>;
          })}
        </div>
        <p className="mt-5 text-xs leading-relaxed text-slate-400">{t('Отметки просмотра и закладки сохраняются в этом браузере.')}</p>
      </section>
    </div>
  );
}
