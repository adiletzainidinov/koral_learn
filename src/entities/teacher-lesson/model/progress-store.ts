'use client';

import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { parseLessonProgress } from './helpers';
import type { LessonProgress } from './types';

interface TeacherProgressState extends LessonProgress {
  hydrated: boolean;
  finishHydration: () => void;
  setWatched: (lessonId: string, watched: boolean) => void;
  toggleBookmark: (lessonId: string, momentId: string) => void;
}

const safeStorage: StateStorage = {
  getItem(name) {
    try {
      const raw = window.localStorage.getItem(name);
      if (raw !== null) JSON.parse(raw);
      return raw;
    } catch { return null; }
  },
  setItem(name, value) {
    try { window.localStorage.setItem(name, value); } catch { /* Keep the current session usable. */ }
  },
  removeItem(name) {
    try { window.localStorage.removeItem(name); } catch { /* Storage can be unavailable. */ }
  },
};

export const useTeacherProgress = create<TeacherProgressState>()(
  persist(
    (set) => ({
      watched: {},
      bookmarks: {},
      hydrated: false,
      finishHydration: () => set({ hydrated: true }),
      setWatched: (lessonId, watched) => set((state) => ({ watched: { ...state.watched, [lessonId]: watched } })),
      toggleBookmark: (lessonId, momentId) => set((state) => {
        const bookmarks = { ...state.bookmarks };
        if (bookmarks[lessonId] === momentId) delete bookmarks[lessonId];
        else bookmarks[lessonId] = momentId;
        return { bookmarks };
      }),
    }),
    {
      name: 'quranlearn-teacher-lessons',
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      skipHydration: true,
      partialize: ({ watched, bookmarks }) => ({ watched, bookmarks }),
      merge: (saved, current) => ({ ...current, ...parseLessonProgress(saved) }),
      onRehydrateStorage: () => (state) => state?.finishHydration(),
    },
  ),
);
