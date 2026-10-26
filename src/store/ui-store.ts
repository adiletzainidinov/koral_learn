'use client';

import { create } from 'zustand';

interface UIState {
  mobileNavigationOpen: boolean;
  setMobileNavigationOpen: (open: boolean) => void;
  selectedStudentIds: string[];
  setSelectedStudentIds: (ids: string[]) => void;
  removeStudentId: (id: string) => void;
  clearSelectedStudentIds: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  mobileNavigationOpen: false,
  setMobileNavigationOpen: (open) => set({ mobileNavigationOpen: open }),
  selectedStudentIds: [],
  setSelectedStudentIds: (ids) => set({ selectedStudentIds: ids }),
  removeStudentId: (id) =>
    set((state) => ({ selectedStudentIds: state.selectedStudentIds.filter((x) => x !== id) })),
  clearSelectedStudentIds: () => set({ selectedStudentIds: [] }),
}));
