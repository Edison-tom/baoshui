import type { BankTransaction, InvoiceItem, PayrollEntry, ExpenseItem, ReceivablesPayablesItem } from '../import/types'
import type { ClassifiedEntry, ClassificationResult } from './types'
import {
  KEYWORD_RULES,
  INTERNAL_TRANSFER_KEYWORDS,
  TAX_PAYMENT_KEYWORDS,
  LOAN_KEYWORDS,
  SALARY_KEYWORDS,
  SOCIAL_INSURANCE_KEYWORDS,
  LOAN_REPAYMENT_KEYWORDS,
} from '../../data/rules/keywords'
import type { AccountSubject } from '../types'
import type { Money } from '../types'

function matchAny(text: string, patterns: string[]): boolean {
  return patterns.some(p => text.includes(p))
}

function classifyByRules(summary: string, counterparty: string, amount: Money): { subject: AccountSubject; confidence: number } {
  // 先检查特殊类型
  if (matchAny(summary, INTERNAL_TRANSFER_KEYWORDS)) {
    return { subject: 'internal_transfer' as AccountSubject, confidence: 0.9 }
  }
  if (matchAny(summary, TAX_PAYMENT_KEYWORDS)) {
    return { subject: 'tax_payment' as AccountSubject, confidence: 0.9 }
  }
  if (matchAny(summary, SALARY_KEYWORDS)) {
    return { subject: 'salary' as AccountSubject, confidence: 0.9 }
  }
  if (matchAny(summary, SOCIAL_INSURANCE_KEYWORDS)) {
    return { subject: 'social_insurance' as AccountSubject, confidence: 0.9 }
  }
  if (matchAny(summary, LOAN_KEYWORDS)) {
    return { subject: 'loan_borrow' as AccountSubject, confidence: 0.9 }
  }
  if (matchAny(summary, LOAN_REPAYMENT_KEYWORDS)) {
    return { subject: 'loan_repay' as AccountSubject, confidence: 0.9 }
  }

  // 再检查普通规则
  for (const rule of KEYWORD_RULES) {
    if (matchAny(summary, rule.keywords) || matchAny(counterparty, rule.keywords)) {
      return { subject: rule.subject, confidence: 0.7 }
    }
  }
  if (amount > 0) return { subject: 'main_revenue' as AccountSubject, confidence: 0.4 }
  return { subject: 'mgmt_expense' as AccountSubject, confidence: 0.4 }
}

export function classifyBankTransactions(transactions: BankTransaction[]): ClassifiedEntry[] {
  return transactions.map(tx => {
    const summary = tx.summary || tx.description || ''
    const counterparty = tx.counterparty || ''
    const { subject, confidence } = classifyByRules(summary, counterparty, tx.amount)
    return {
      id: tx.id || '',
      date: tx.date || '',
      amount: tx.amount,
      counterparty: counterparty,
      summary,
      originalType: 'bank' as const,
      accountSubject: subject,
      confidence,
      needsConfirmation: confidence < 0.7,
      source: summary || counterparty,
    }
  })
}

export function classifyInvoiceItems(_invoices: InvoiceItem[]): ClassifiedEntry[] {
  return []
}

export function classifyInvoices(invoices: InvoiceItem[]): ClassifiedEntry[] {
  return invoices.map(inv => {
    const isPurchase = inv.isPurchase === true
    return {
      id: inv.id || '',
      date: inv.issueDate || inv.date || '',
      amount: inv.amount,
      counterparty: isPurchase ? (inv.sellerName || '') : (inv.buyerName || ''),
      summary: `发票 ${inv.invoiceCode || ''} ${inv.invoiceNumber || ''}`,
      originalType: isPurchase ? ('invoice_in' as const) : ('invoice_out' as const),
      accountSubject: isPurchase ? ('main_cost' as const) : ('main_revenue' as const),
      confidence: 0.9,
      needsConfirmation: false,
      source: `发票 ${inv.invoiceCode || ''}${inv.invoiceNumber || ''}`,
    }
  })
}

export function classifyExpenses(_expenses: ExpenseItem[]): ClassifiedEntry[] {
  return []
}

export function classifyAll(
  bankTransactions: BankTransaction[],
  invoices: InvoiceItem[],
  _payroll: PayrollEntry[],
  _expenses: ExpenseItem[],
  _rp: ReceivablesPayablesItem[]
): ClassificationResult {
  const bankEntries = classifyBankTransactions(bankTransactions)
  const invoiceEntries = classifyInvoices(invoices)
  const allEntries = [...bankEntries, ...invoiceEntries]

  const incomeEntries = allEntries.filter(e => e.amount > 0)
  const expenseEntries = allEntries.filter(e => e.amount < 0)

  return {
    entries: allEntries,
    incomeEntries,
    costEntries: allEntries.filter(e => e.accountSubject === 'main_cost'),
    expenseEntries,
    transferEntries: allEntries.filter(e => e.accountSubject === 'internal_transfer'),
    lowConfidenceEntries: allEntries.filter(e => e.needsConfirmation),
    deemedSales: [],
    inputTransferOut: [],
    dutyFree: [],
    crossPeriod: [],
    specialFlags: {
      hasDeemedSales: false, hasInternalTransfers: false,
      hasTaxPayments: false, hasLoans: false,
      hasSalaryPayments: false, hasSocialInsurance: false, hasLoanRepayments: false,
    },
    summary: {
      totalIncome: incomeEntries.reduce((s, e) => s + e.amount, 0),
      totalExpense: expenseEntries.reduce((s, e) => s + Math.abs(e.amount), 0),
    },
  }
}
