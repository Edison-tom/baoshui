import type { PayrollEntry } from '../import/types'
import type { IitResult, IitEntry } from './types'
import { MONTHLY_EXEMPTION, findBracket, calcLaborTax } from '../../data/tax-rates/iit-brackets'

export function calcIit(entries: PayrollEntry[], month: number): IitResult {
  const results: IitEntry[] = []

  for (const e of entries) {
    if (e.employeeType === 'labor') {
      const tax = calcLaborTax(e.grossSalary)
      results.push({
        name: e.name, idNumber: e.idNumber,
        cumulativeIncome: e.grossSalary, cumulativeDeduction: 0,
        cumulativeTaxable: e.grossSalary > 800 ? e.grossSalary * 0.8 : 0,
        cumulativeTax: tax, previouslyPaid: 0,
        currentPayable: Math.round(tax * 100) / 100,
        taxRate: 0.20, quickDeduction: 0,
      })
      continue
    }

    const monthlyDeduction = MONTHLY_EXEMPTION
      + (e.childrenEdu || 0) + (e.continuingEdu || 0) + (e.seriousIllness || 0)
      + (e.housingLoan || 0) + (e.housingRent || 0) + (e.elderlySupport || 0)
      + (e.infantCare || 0) + (e.personalPension || 0)
      + (e.commercialHealthIns || 0) + (e.enterpriseAnnuity || 0)

    const cumulativeIncome = e.grossSalary * month
    const cumulativeDeduction = monthlyDeduction * month
    const taxable = cumulativeIncome - cumulativeDeduction
    const cumulativeTaxable = taxable > 0 ? taxable : 0
    const bracket = findBracket(cumulativeTaxable)
    const cumulativeTax = cumulativeTaxable * bracket.rate - bracket.quickDeduction

    results.push({
      name: e.name, idNumber: e.idNumber,
      cumulativeIncome, cumulativeDeduction,
      cumulativeTaxable,
      cumulativeTax: Math.max(0, Math.round(cumulativeTax * 100) / 100),
      previouslyPaid: 0,
      currentPayable: Math.max(0, Math.round(cumulativeTax * 100) / 100),
      taxRate: bracket.rate, quickDeduction: bracket.quickDeduction,
    })
  }

  return {
    entries: results,
    totalPayable: Math.round(results.reduce((s, r) => s + r.currentPayable, 0) * 100) / 100,
  }
}
