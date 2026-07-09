import { create } from 'zustand'
import type { CompanyInfo, TaxPeriod } from '../engines/types'

interface CompanyState {
  company: CompanyInfo | null
  isRegistered: boolean
  register: (info: Omit<CompanyInfo, 'period'>) => void
  setPeriod: (period: TaxPeriod) => void
  clearCompany: () => void
}

const defaultPeriod: TaxPeriod = {
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
  startDate: new Date().toISOString().slice(0, 7) + '-01',
  endDate: new Date().toISOString().slice(0, 10),
}

export const useCompanyStore = create<CompanyState>((set) => ({
  company: null,
  isRegistered: false,
  register: (info) => set({ company: { ...info, period: defaultPeriod }, isRegistered: true }),
  setPeriod: (period) => set(s => ({
    company: s.company ? { ...s.company, period } : null,
  })),
  clearCompany: () => set({ company: null, isRegistered: false }),
}))
