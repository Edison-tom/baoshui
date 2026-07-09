import { create } from 'zustand'
import type { ClassificationResult } from '../engines/classify/types'

interface ClassifyState {
  result: ClassificationResult | null
  setResult: (r: ClassificationResult) => void
  clearResult: () => void
}

export const useClassifyStore = create<ClassifyState>((set) => ({
  result: null,
  setResult: (r) => set({ result: r }),
  clearResult: () => set({ result: null }),
}))
