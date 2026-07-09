import type { Money, AccountSubject } from '../types'

export interface ClassifiedEntry {
  id: string; date: string; amount: Money
  counterparty: string; summary: string
  originalType: 'bank'|'invoice_in'|'invoice_out'|'expense'
  accountSubject: AccountSubject; confidence: number
  needsConfirmation: boolean; source: string
}

export interface SpecialFlags {
  hasDeemedSales: boolean
  hasInternalTransfers: boolean
  hasTaxPayments: boolean
  hasLoans: boolean
  hasSalaryPayments: boolean
  hasSocialInsurance: boolean
  hasLoanRepayments: boolean
}

export interface ClassificationResult {
  entries: ClassifiedEntry[]
  incomeEntries: ClassifiedEntry[]
  costEntries: ClassifiedEntry[]
  expenseEntries: ClassifiedEntry[]
  transferEntries: ClassifiedEntry[]
  lowConfidenceEntries: ClassifiedEntry[]
  deemedSales: ClassifiedEntry[]
  inputTransferOut: ClassifiedEntry[]
  dutyFree: ClassifiedEntry[]
  crossPeriod: ClassifiedEntry[]
  specialFlags: SpecialFlags
  summary: {
    totalIncome: number
    totalExpense: number
  }
}
