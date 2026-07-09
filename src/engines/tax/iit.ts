import type { PayrollEntry } from '../import/types'
import type { IitResult, IitEntry } from './types'
import type { Money } from '../types'

const TAX_BRACKETS: { min: number; max: number; rate: number; quickDeduction: number }[] = [
  { min: 0, max: 36000, rate: 0.03, quickDeduction: 0 },
  { min: 36000, max: 144000, rate: 0.10, quickDeduction: 2520 },
  { min: 144000, max: 300000, rate: 0.20, quickDeduction: 16920 },
  { min: 300000, max: 420000, rate: 0.25, quickDeduction: 31920 },
  { min: 420000, max: 660000, rate: 0.30, quickDeduction: 52920 },
  { min: 660000, max: 960000, rate: 0.35, quickDeduction: 85920 },
  { min: 960000, max: Infinity, rate: 0.45, quickDeduction: 181920 },
]

function calcTax(income: Money): { tax: Money; rate: number; quickDeduction: Money } {
  for (const b of TAX_BRACKETS) {
    if (income > b.min && income <= b.max) {
      return { tax: income * b.rate - b.quickDeduction, rate: b.rate, quickDeduction: b.quickDeduction }
    }
  }
  return { tax: 0, rate: 0, quickDeduction: 0 }
}

export function calcIit(payroll: PayrollEntry[], prevMonths: number): IitResult {
  const entries: IitEntry[] = payroll.map(e => {
    const name = e.name || e.employeeName || ''
    const idNumber = e.idNumber || e.idCard || ''
    const grossSalary = e.grossSalary || e.grossPay || 0
    const socialBase = e.socialBase || 0
    const housingFundBase = e.housingFundBase || e.housingFund || 0

    const cumulativeMonths = prevMonths + 1
    const basicDeduction = 5000 * cumulativeMonths
    const socialTotal = socialBase * 0.08 + socialBase * 0.02 + socialBase * 0.005
    const housingFundTotal = housingFundBase * 0.12
    const socialDeduction = (socialTotal + housingFundTotal) * cumulativeMonths

    const specialDeductions = [
      e.childrenEdu || 0, e.continuingEdu || 0,
      e.seriousIllness || 0, e.housingLoan || 0,
      e.housingRent || 0, e.elderlySupport || 0,
      e.infantCare || 0, e.personalPension || 0,
      e.commercialHealthIns || 0, e.enterpriseAnnuity || 0,
    ].reduce((a, b) => a + b, 0) * cumulativeMonths

    const cumulativeDeduction = basicDeduction + socialDeduction + specialDeductions
    const cumulativeIncome = grossSalary * cumulativeMonths
    const cumulativeTaxable = Math.max(0, cumulativeIncome - cumulativeDeduction)
    const { tax: cumulativeTax, rate, quickDeduction } = calcTax(cumulativeTaxable)
    const previouslyPaid = prevMonths > 0 ? (cumulativeTax / cumulativeMonths) * prevMonths : 0
    const currentPayable = cumulativeTax - previouslyPaid

    return {
      name, idNumber,
      cumulativeIncome, cumulativeDeduction, cumulativeTaxable,
      cumulativeTax, previouslyPaid: Math.max(0, previouslyPaid),
      currentPayable: Math.max(0, currentPayable),
      taxRate: rate, quickDeduction,
    }
  })

  const totalPayable = entries.reduce((s, e) => s + e.currentPayable, 0)
  return { entries, totalPayable }
}
