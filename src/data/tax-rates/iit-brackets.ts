export interface IitBracket {
  upper: number; rate: number; quickDeduction: number
}

export const IIT_BRACKETS: IitBracket[] = [
  { upper: 36000, rate: 0.03, quickDeduction: 0 },
  { upper: 144000, rate: 0.10, quickDeduction: 2520 },
  { upper: 300000, rate: 0.20, quickDeduction: 16920 },
  { upper: 420000, rate: 0.25, quickDeduction: 31920 },
  { upper: 660000, rate: 0.30, quickDeduction: 52920 },
  { upper: 960000, rate: 0.35, quickDeduction: 85920 },
  { upper: Infinity, rate: 0.45, quickDeduction: 181920 },
]

export const MONTHLY_EXEMPTION = 5000
export const ANNUAL_EXEMPTION = 60000
export const LABOR_THRESHOLD = 800
export const LABOR_RATE_1 = 0.20
export const LABOR_RATE_2 = 0.30
export const LABOR_RATE_3 = 0.40
export const LABOR_LEVEL_2 = 20000
export const LABOR_LEVEL_3 = 50000

export function findBracket(taxableIncome: number): IitBracket {
  for (const b of IIT_BRACKETS) {
    if (taxableIncome <= b.upper) return b
  }
  return IIT_BRACKETS[IIT_BRACKETS.length - 1]
}

export function calcLaborTax(amount: number): number {
  if (amount <= LABOR_THRESHOLD) return 0
  const taxable = amount > 4000 ? amount * 0.8 : amount - LABOR_THRESHOLD
  if (amount <= LABOR_LEVEL_2) return taxable * LABOR_RATE_1
  if (amount <= LABOR_LEVEL_3) return taxable * LABOR_RATE_2 - 2000
  return taxable * LABOR_RATE_3 - 7000
}
