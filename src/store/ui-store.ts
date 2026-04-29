'use client';

import { create } from 'zustand';

interface UIState {
  selectedStudentIds: string[];
  setSelectedStudentIds: (ids: string[]) => void;
  removeStudentId: (id: string) => void;
  clearSelectedStudentIds: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedStudentIds: [],
  setSelectedStudentIds: (ids) => set({ selectedStudentIds: ids }),
  removeStudentId: (id) =>
    set((state) => ({ selectedStudentIds: state.selectedStudentIds.filter((x) => x !== id) })),
  clearSelectedStudentIds: () => set({ selectedStudentIds: [] }),
}));
