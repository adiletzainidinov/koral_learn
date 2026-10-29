import type { Locale } from '@/shared/i18n/locale-store';

export type LessonText = Record<Locale, string>;

export interface LessonMoment {
  id: string;
  seconds: number;
  title: LessonText;
  points: Record<Locale, string[]>;
  question: LessonText;
}

export interface TeacherLesson {
  id: string;
  number: number;
  youtubeId: string;
  durationSeconds: number;
  language: LessonText;
  title: LessonText;
  description: LessonText;
  themes: LessonText[];
  moments: LessonMoment[];
}

export interface LessonProgress {
  watched: Record<string, boolean>;
  bookmarks: Record<string, string>;
}
