import type { PayrollEntry } from '../import/types'
import type { SocialResult, SocialEntry } from './types'
import type { ProvinceConfig } from '../../data/provinces/hunan'

export function calcSocial(
  payroll: PayrollEntry[],
  config: ProvinceConfig
): SocialResult {
  const s = config.social
  const entries: SocialEntry[] = []

  for (const p of payroll) {
    if (p.employeeType !== 'formal') continue

    let base = p.socialBase || p.grossSalary
    base = Math.max(base, s.baseLower)
    base = Math.min(base, s.baseUpper)

    const hfBase = Math.min(p.housingFundBase || base, s.baseUpper * s.housingFundUpperMultiplier)

    entries.push({
      name: p.name,
      base,
      pension: {
        company: Math.round(base * s.pension.company * 100) / 100,
        personal: Math.round(base * s.pension.personal * 100) / 100,
      },
      medical: {
        company: Math.round(base * s.medical.company * 100) / 100,
        personal: Math.round(base * s.medical.personal * 100) / 100,
      },
      injury: { company: Math.round(base * s.injury.company * 100) / 100 },
      unemployment: {
        company: Math.round(base * s.unemployment.company * 100) / 100,
        personal: Math.round(base * s.unemployment.personal * 100) / 100,
      },
      housingFund: {
        company: Math.round(hfBase * s.housingFund.company * 100) / 100,
        personal: Math.round(hfBase * s.housingFund.personal * 100) / 100,
      },
    })
  }

  return {
    entries,
    companyTotal: Math.round(entries.reduce((s, e) =>
      s + e.pension.company + e.medical.company + e.injury.company
      + e.unemployment.company + e.housingFund.company, 0
    ) * 100) / 100,
    personalTotal: Math.round(entries.reduce((s, e) =>
      s + e.pension.personal + e.medical.personal + e.unemployment.personal
      + e.housingFund.personal, 0
    ) * 100) / 100,
  }
}
