import { create } from 'zustand';

interface AppState {
  isFormed: boolean;
  toggleFormed: () => void;
  setFormed: (formed: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  isFormed: false,
  toggleFormed: () => set((state) => ({ isFormed: !state.isFormed })),
  setFormed: (formed) => set({ isFormed: formed }),
}));
