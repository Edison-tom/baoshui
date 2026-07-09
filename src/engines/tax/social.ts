import type { PayrollEntry } from '../import/types'
import type { SocialEntry, SocialResult } from './types'

// 湖南省社保费率（2025参考）
const RATES = {
  pension: { company: 0.16, personal: 0.08 },
  medical: { company: 0.08, personal: 0.02 },
  injury: { company: 0.007, personal: 0 },
  unemployment: { company: 0.005, personal: 0.005 },
  housingFund: { company: 0.12, personal: 0.12 },
}

export function calcSocial(payroll: PayrollEntry[]): SocialResult {
  const entries: SocialEntry[] = payroll.map(e => {
    const name = e.name || e.employeeName || ''
    const base = e.socialBase || e.grossSalary || e.grossPay || 0

    return {
      name,
      base,
      pension: {
        company: Math.round(base * RATES.pension.company * 100) / 100,
        personal: Math.round(base * RATES.pension.personal * 100) / 100,
      },
      medical: {
        company: Math.round(base * RATES.medical.company * 100) / 100,
        personal: Math.round(base * RATES.medical.personal * 100) / 100,
      },
      injury: {
        company: Math.round(base * RATES.injury.company * 100) / 100,
      },
      unemployment: {
        company: Math.round(base * RATES.unemployment.company * 100) / 100,
        personal: Math.round(base * RATES.unemployment.personal * 100) / 100,
      },
      housingFund: {
        company: Math.round(base * RATES.housingFund.company * 100) / 100,
        personal: Math.round(base * RATES.housingFund.personal * 100) / 100,
      },
    }
  })

  const totalC = (e: SocialEntry) =>
    e.pension.company + e.medical.company + e.injury.company +
    e.unemployment.company + e.housingFund.company
  const totalP = (e: SocialEntry) =>
    e.pension.personal + e.medical.personal +
    e.unemployment.personal + e.housingFund.personal

  const companyTotal = entries.reduce((s, e) => s + totalC(e), 0)
  const personalTotal = entries.reduce((s, e) => s + totalP(e), 0)

  return { entries, companyTotal, personalTotal }
}
