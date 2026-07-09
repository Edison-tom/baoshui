import type { Money } from '../types'

export interface AmortizationItem {
  description: string; totalAmount: Money
  startMonth: number; totalMonths: number
}

export interface AmortizationEntry {
  description: string; totalAmount: Money
  monthlyAmount: Money; currentMonthAmount: Money
  remainingAmount: Money; remainingMonths: number
}

export function calcAmortization(
  items: AmortizationItem[],
  currentMonth: number
): AmortizationEntry[] {
  return items.map(item => {
    const monthly = item.totalAmount / item.totalMonths
    const elapsed = currentMonth - item.startMonth + 1
    const remaining = Math.max(0, item.totalMonths - elapsed)

    return {
      description: item.description,
      totalAmount: item.totalAmount,
      monthlyAmount: Math.round(monthly * 100) / 100,
      currentMonthAmount: Math.round(monthly * 100) / 100,
      remainingAmount: Math.round(monthly * remaining * 100) / 100,
      remainingMonths: remaining,
    }
  })
}
