import type { Money } from '../types'

export type FileCategory =
  | 'bank_statement' | 'invoice_export' | 'invoice_original'
  | 'payroll' | 'expense' | 'receivables_payables'
  | 'previous_tax_data' | 'unknown'

export interface DetectedFile {
  name: string; category: FileCategory
  confidence: number; preview: Record<string,string>[]
}

export interface BankTransaction {
  date: string; amount: Money; counterparty: string
  summary: string; bankAccount: string; balance?: Money
}

export interface InvoiceItem {
  invoiceCode: string; invoiceNumber: string; issueDate: string
  sellerName: string; buyerName: string
  amount: Money; taxAmount: Money; totalAmount: Money
  taxRate: number; invoiceType: 'general'|'special'
  isPurchase: boolean
}

export interface PayrollEntry {
  name: string; idNumber: string
  employeeType: 'formal'|'labor'|'bonus'
  grossSalary: Money; socialBase: Money; housingFundBase: Money
  childrenEdu?: Money; continuingEdu?: Money; seriousIllness?: Money
  housingLoan?: Money; housingRent?: Money; elderlySupport?: Money
  infantCare?: Money; personalPension?: Money
  commercialHealthIns?: Money; enterpriseAnnuity?: Money
}

export interface ExpenseItem {
  date: string; amount: Money; category: string; summary: string
  hasInvoice: boolean; isCrossPeriod: boolean
  crossPeriodMonths?: number; accountSubject?: string
}

export interface ReceivablesPayablesItem {
  type: 'receivable'|'payable'; counterparty: string
  amount: Money; date: string; expectedDate: string; summary: string
}

export interface PreviousTaxData {
  period: string; balanceSheet: Record<string,Money>
  incomeStatement: Record<string,Money>
}
