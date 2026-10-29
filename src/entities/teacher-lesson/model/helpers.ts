import type { LessonProgress } from './types';

function validVideoId(id: string) {
  if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) throw new Error('Invalid YouTube video ID');
  return id;
}

function secondsValue(seconds: number) {
  return Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
}

export function formatLessonTime(seconds: number): string {
  const total = secondsValue(seconds);
  const minutes = Math.floor(total / 60);
  const tail = String(total % 60).padStart(2, '0');
  if (minutes < 60) return `${String(minutes).padStart(2, '0')}:${tail}`;
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}:${tail}`;
}

export function getLessonWatchUrl(youtubeId: string, seconds = 0): string {
  const url = new URL('https://www.youtube.com/watch');
  url.searchParams.set('v', validVideoId(youtubeId));
  if (secondsValue(seconds)) url.searchParams.set('t', String(secondsValue(seconds)));
  return url.toString();
}

export function getLessonEmbedUrl(youtubeId: string, seconds = 0, autoplay = false): string {
  const url = new URL(`https://www.youtube-nocookie.com/embed/${validVideoId(youtubeId)}`);
  url.searchParams.set('rel', '0');
  url.searchParams.set('playsinline', '1');
  if (secondsValue(seconds)) url.searchParams.set('start', String(secondsValue(seconds)));
  if (autoplay) url.searchParams.set('autoplay', '1');
  return url.toString();
}

/** Ignore malformed browser data without affecting student records or the lesson catalog. */
export function parseLessonProgress(value: unknown): LessonProgress {
  const result: LessonProgress = { watched: {}, bookmarks: {} };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return result;
  const source = value as Record<string, unknown>;
  const validKey = (key: string) => /^[a-z0-9][a-z0-9-]{0,79}$/.test(key);
  if (source.watched && typeof source.watched === 'object' && !Array.isArray(source.watched)) {
    result.watched = Object.fromEntries(Object.entries(source.watched).filter(([key, item]) => validKey(key) && typeof item === 'boolean'));
  }
  if (source.bookmarks && typeof source.bookmarks === 'object' && !Array.isArray(source.bookmarks)) {
    result.bookmarks = Object.fromEntries(Object.entries(source.bookmarks).filter(([key, item]) => validKey(key) && typeof item === 'string' && validKey(item)));
  }
  return result;
}
