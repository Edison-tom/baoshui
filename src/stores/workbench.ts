import { create } from 'zustand'

interface WorkbenchState {
  currentStep: number
  currentTab: string
  setStep: (s: number) => void
  setTab: (t: string) => void
  isClosing: boolean
  setClosing: (v: boolean) => void
}

export const useWorkbenchStore = create<WorkbenchState>((set) => ({
  currentStep: 0,
  currentTab: 'vat',
  isClosing: false,
  setStep: (s) => set({ currentStep: s }),
  setTab: (t) => set({ currentTab: t }),
  setClosing: (v) => set({ isClosing: v }),
}))
