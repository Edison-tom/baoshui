import { create } from 'zustand'
import type { VatResult, SurtaxResult, IitResult, CitResult, SocialResult, StampDutyResult } from '../engines/tax/types'

interface TaxState {
  vat: VatResult | null
  surtax: SurtaxResult | null
  iit: IitResult | null
  cit: CitResult | null
  social: SocialResult | null
  stamp: StampDutyResult | null
  setVat: (r: VatResult) => void
  setSurtax: (r: SurtaxResult) => void
  setIit: (r: IitResult) => void
  setCit: (r: CitResult) => void
  setSocial: (r: SocialResult) => void
  setStamp: (r: StampDutyResult) => void
  clearTaxes: () => void
}

export const useTaxStore = create<TaxState>((set) => ({
  vat: null, surtax: null, iit: null, cit: null, social: null, stamp: null,
  setVat: (r) => set({ vat: r }),
  setSurtax: (r) => set({ surtax: r }),
  setIit: (r) => set({ iit: r }),
  setCit: (r) => set({ cit: r }),
  setSocial: (r) => set({ social: r }),
  setStamp: (r) => set({ stamp: r }),
  clearTaxes: () => set({ vat: null, surtax: null, iit: null, cit: null, social: null, stamp: null }),
}))
