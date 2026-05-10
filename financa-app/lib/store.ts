'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface FilterState {
  month: number
  year: number
  setMonth: (month: number) => void
  setYear: (year: number) => void
}

export const useFilterStore = create<FilterState>()(
  persist(
    (set) => ({
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      setMonth: (month) => set({ month }),
      setYear: (year) => set({ year }),
    }),
    { name: 'financa-filters' }
  )
)

interface DescriptionHistoryState {
  history: string[]
  addDescription: (desc: string) => void
}

export const useDescriptionHistory = create<DescriptionHistoryState>()(
  persist(
    (set) => ({
      history: [],
      addDescription: (desc) =>
        set((state) => ({
          history: [desc, ...state.history.filter((d) => d !== desc)].slice(0, 10),
        })),
    }),
    { name: 'financa-desc-history' }
  )
)
