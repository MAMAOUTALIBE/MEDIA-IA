"use client";

import { create } from "zustand";

interface PendingState {
  validatedIds: Set<string>;
  rejectedIds: Set<string>;
  validate: (id: string) => void;
  reject: (id: string) => void;
  reset: () => void;
}

export const usePendingStore = create<PendingState>((set) => ({
  validatedIds: new Set(),
  rejectedIds: new Set(),
  validate: (id) =>
    set((state) => ({
      validatedIds: new Set(state.validatedIds).add(id),
    })),
  reject: (id) =>
    set((state) => ({
      rejectedIds: new Set(state.rejectedIds).add(id),
    })),
  reset: () => set({ validatedIds: new Set(), rejectedIds: new Set() }),
}));
