import type { BalanceSheet, IncomeStatement } from '../report/types'

export interface ClosingResult {
  retainedEarningsCarryForward: number
  nextPeriodOpening: Partial<BalanceSheet>
  summary: string[]
}

export function performClosing(
  balanceSheet: BalanceSheet,
  incomeStatement: IncomeStatement
): ClosingResult {
  const newRetained = balanceSheet.retainedEarnings + incomeStatement.netProfit

  const summary = [
    `本期净利润 ${incomeStatement.netProfit >= 0 ? '+' : ''}${incomeStatement.netProfit.toFixed(2)} 元`,
    `结转至未分配利润，期末未分配利润 ${newRetained.toFixed(2)} 元`,
    `固定资产折旧：累计折旧 ${balanceSheet.accumulatedDepreciation.toFixed(2)} 元`,
    '下期期初数据已就绪',
    '⚠️ 所有本期数据已从内存清除',
  ]

  return {
    retainedEarningsCarryForward: newRetained,
    nextPeriodOpening: {
      cashAndEquivalents: balanceSheet.cashAndEquivalents,
      receivables: balanceSheet.receivables,
      inventory: balanceSheet.inventory,
      fixedAssetsOriginal: balanceSheet.fixedAssetsOriginal,
      accumulatedDepreciation: balanceSheet.accumulatedDepreciation,
      longTermPrepaid: balanceSheet.longTermPrepaid,
      payables: balanceSheet.payables,
      paidInCapital: balanceSheet.paidInCapital,
      capitalReserve: balanceSheet.capitalReserve,
      retainedEarnings: newRetained,
    },
    summary,
  }
}
