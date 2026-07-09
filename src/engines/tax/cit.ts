import type { Money } from '../types'
import type { ClassificationResult } from '../classify/types'
import type { CitResult } from './types'

export function calcCit(
  classification: ClassificationResult,
  previouslyPaid: Money = 0,
  employeeCount: number = 1
): CitResult {
  const revenue = classification.incomeEntries.reduce((s, e) => s + e.amount, 0)
  const cost = classification.costEntries.reduce((s, e) => s + Math.abs(e.amount), 0)
  const expenses = classification.expenseEntries.reduce((s, e) => s + Math.abs(e.amount), 0)
  const profit = revenue - cost - expenses

  const isSmallLowProfit = profit <= 3000000 && employeeCount < 300
  const effectiveRate = isSmallLowProfit ? 0.05 : 0.25
  const nominalRate = 0.25

  const taxPayable = Math.max(0, profit * effectiveRate)
  const currentPayable = Math.max(0, taxPayable - previouslyPaid)

  return {
    revenue, cost, profit, actualProfit: profit,
    taxBase: Math.max(0, profit),
    nominalRate, effectiveRate,
    taxPayable: Math.round(taxPayable * 100) / 100,
    previouslyPaid,
    currentPayable: Math.round(currentPayable * 100) / 100,
    isSmallLowProfit,
    incentiveDetail: isSmallLowProfit
      ? ['小型微利企业优惠：年利润≤300万，税率减至5%']
      : [],
  }
}
