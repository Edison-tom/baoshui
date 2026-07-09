import type { Money } from '../types'
import type { ClassificationResult } from '../classify/types'
import type { PreviousTaxData } from '../import/types'
import type { DepreciationEntry } from '../depreciation/depreciation'
import type { AmortizationEntry } from '../amortization/amortization'
import type { BalanceSheet } from './types'

export function generateBalanceSheet(
  classification: ClassificationResult,
  previousData: PreviousTaxData | null,
  depreciation: DepreciationEntry[],
  amortization: AmortizationEntry[],
  vatPayable: Money, surtaxTotal: Money,
  iitPayable: Money, citPayable: Money,
  socialCompany: Money, stampTotal: Money
): BalanceSheet {
  const bankCash = classification.entries
    .filter(e => e.accountSubject !== 'internal_transfer')
    .reduce((s, e) => s + e.amount, 0)

  const receivables = classification.entries
    .filter(e => e.accountSubject === 'receivable')
    .reduce((s, e) => s + e.amount, 0)

  const payables = classification.entries
    .filter(e => e.accountSubject === 'payable')
    .reduce((s, e) => s + Math.abs(e.amount), 0)

  const totalDepreciation = depreciation.reduce((s, d) => s + d.accumulatedDepreciation, 0)
  const fixedAssetsOriginal = depreciation.reduce((s, d) => s + d.originalValue, 0)
  const fixedAssetsNet = fixedAssetsOriginal - totalDepreciation

  const longTermPrepaid = amortization.reduce((s, a) => s + a.remainingAmount, 0)
  const employeePayPayable = classification.entries
    .filter(e => e.accountSubject === 'salary')
    .reduce((s, e) => s + Math.abs(e.amount), 0) + socialCompany

  const taxesPayable = vatPayable + surtaxTotal + iitPayable + citPayable + stampTotal

  const prevEquity = previousData?.balanceSheet || {}
  const paidInCapital = prevEquity['实收资本'] || 0
  const capitalReserve = prevEquity['资本公积'] || 0
  const prevRetained = prevEquity['未分配利润'] || 0

  const cash = bankCash
  const inventory = 0
  const otherPayables = 0
  const netProfit = classification.incomeEntries.reduce((s,e)=>s+e.amount,0)
    - classification.costEntries.reduce((s,e)=>s+Math.abs(e.amount),0)
    - classification.expenseEntries.reduce((s,e)=>s+Math.abs(e.amount),0)

  const retainedEarnings = prevRetained + netProfit

  const totalAssets = cash + receivables + inventory + fixedAssetsNet + longTermPrepaid
  const totalLiabilities = payables + employeePayPayable + taxesPayable + otherPayables
  const totalEquity = paidInCapital + capitalReserve + retainedEarnings

  return {
    cashAndEquivalents: Math.round(cash * 100) / 100,
    receivables: Math.round(receivables * 100) / 100,
    inventory, fixedAssetsOriginal: Math.round(fixedAssetsOriginal * 100) / 100,
    accumulatedDepreciation: Math.round(totalDepreciation * 100) / 100,
    fixedAssetsNet: Math.round(fixedAssetsNet * 100) / 100,
    longTermPrepaid: Math.round(longTermPrepaid * 100) / 100,
    totalAssets: Math.round(totalAssets * 100) / 100,
    payables: Math.round(payables * 100) / 100,
    employeePayPayable: Math.round(employeePayPayable * 100) / 100,
    taxesPayable: Math.round(taxesPayable * 100) / 100,
    otherPayables, totalLiabilities: Math.round(totalLiabilities * 100) / 100,
    paidInCapital: Math.round(paidInCapital * 100) / 100,
    capitalReserve: Math.round(capitalReserve * 100) / 100,
    retainedEarnings: Math.round(retainedEarnings * 100) / 100,
    totalEquity: Math.round(totalEquity * 100) / 100,
    optionalItems: {},
  }
}
