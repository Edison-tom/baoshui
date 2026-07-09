import type { Money } from '../types'

export interface BalanceSheet {
  cashAndEquivalents: Money; receivables: Money; inventory: Money
  fixedAssetsOriginal: Money; accumulatedDepreciation: Money
  fixedAssetsNet: Money; longTermPrepaid: Money; totalAssets: Money
  payables: Money; employeePayPayable: Money; taxesPayable: Money
  otherPayables: Money; totalLiabilities: Money
  paidInCapital: Money; capitalReserve: Money
  retainedEarnings: Money; totalEquity: Money
  optionalItems: Record<string,Money>
}

export interface IncomeStatement {
  revenue: Money; cost: Money; taxSurcharge: Money
  salesExpense: Money; mgmtExpense: Money; financeExpense: Money
  operatingProfit: Money; nonOperatingIncome: Money
  nonOperatingExpense: Money; totalProfit: Money
  incomeTax: Money; netProfit: Money
}
