import { create } from 'zustand';
import { User } from './auth';

interface AppState {
  user: User | null;
  setUser: (u: User | null) => void;
  updateUser: (u: Partial<User>) => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  updateUser: (updates) => set((s) => ({ user: s.user ? { ...s.user, ...updates } : null })),
}));
