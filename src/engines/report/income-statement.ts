import type { Money } from '../types'
import type { ClassificationResult } from '../classify/types'
import type { IncomeStatement } from './types'

export function generateIncomeStatement(
  classification: ClassificationResult,
  depreciationAmount: Money = 0,
  amortizationAmount: Money = 0
): IncomeStatement {
  const revenue = classification.incomeEntries.reduce((s, e) => s + e.amount, 0)
  const cost = classification.costEntries.reduce((s, e) => s + Math.abs(e.amount), 0)

  const taxSurcharge = classification.entries
    .filter(e => e.accountSubject === 'tax_surcharge')
    .reduce((s, e) => s + Math.abs(e.amount), 0)

  const mgmtExpense = classification.entries
    .filter(e => e.accountSubject === 'mgmt_expense')
    .reduce((s, e) => s + Math.abs(e.amount), 0)
    + depreciationAmount + amortizationAmount

  const salesExpense = classification.entries
    .filter(e => e.accountSubject === 'sales_expense')
    .reduce((s, e) => s + Math.abs(e.amount), 0)

  const financeExpense = classification.entries
    .filter(e => e.accountSubject === 'finance_expense')
    .reduce((s, e) => s + Math.abs(e.amount), 0)

  const nonOpIncome = classification.entries
    .filter(e => e.accountSubject === 'non_operating_income')
    .reduce((s, e) => s + e.amount, 0)

  const nonOpExpense = classification.entries
    .filter(e => e.accountSubject === 'non_operating_expense')
    .reduce((s, e) => s + Math.abs(e.amount), 0)

  const operatingProfit = revenue - cost - taxSurcharge - salesExpense - mgmtExpense - financeExpense
  const totalProfit = operatingProfit + nonOpIncome - nonOpExpense
  const incomeTax = totalProfit > 0 ? totalProfit * 0.05 : 0  // 小型微利默认
  const netProfit = totalProfit - incomeTax

  return {
    revenue: Math.round(revenue * 100) / 100,
    cost: Math.round(cost * 100) / 100,
    taxSurcharge: Math.round(taxSurcharge * 100) / 100,
    salesExpense: Math.round(salesExpense * 100) / 100,
    mgmtExpense: Math.round(mgmtExpense * 100) / 100,
    financeExpense: Math.round(financeExpense * 100) / 100,
    operatingProfit: Math.round(operatingProfit * 100) / 100,
    nonOperatingIncome: Math.round(nonOpIncome * 100) / 100,
    nonOperatingExpense: Math.round(nonOpExpense * 100) / 100,
    totalProfit: Math.round(totalProfit * 100) / 100,
    incomeTax: Math.round(incomeTax * 100) / 100,
    netProfit: Math.round(netProfit * 100) / 100,
  }
}
