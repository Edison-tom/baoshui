import { create } from 'zustand'
import type { CompanyInfo, TaxPeriod } from '../engines/types'
import { inferCurrentPeriod } from '../engines/period-utils'

interface CompanyState {
  company: CompanyInfo | null
  isRegistered: boolean
  register: (info: Omit<CompanyInfo, 'period'>) => void
  setPeriod: (period: TaxPeriod) => void
  clearCompany: () => void
}

export const useCompanyStore = create<CompanyState>((set) => ({
  company: null,
  isRegistered: false,
  register: (info) => {
    const period = inferCurrentPeriod(info.taxpayerType)
    set({ company: { ...info, period }, isRegistered: true })
  },
  setPeriod: (period) => set(s => ({
    company: s.company ? { ...s.company, period } : null,
  })),
  clearCompany: () => set({ company: null, isRegistered: false }),
}))
