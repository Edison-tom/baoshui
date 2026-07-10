import type { BankTransaction, InvoiceItem, PayrollEntry, ExpenseItem, ReceivablesPayablesItem } from '../import/types'
import type { ClassifiedEntry, ClassificationResult } from './types'
import { checkInvoicePeriod } from '../import/period-check'
import {
  KEYWORD_RULES,
  INTERNAL_TRANSFER_KEYWORDS,
  TAX_PAYMENT_KEYWORDS,
  LOAN_KEYWORDS,
  SALARY_KEYWORDS,
  SOCIAL_INSURANCE_KEYWORDS,
  LOAN_REPAYMENT_KEYWORDS,
} from '../../data/rules/keywords'
import type { AccountSubject, TaxPeriod } from '../types'
import type { Money } from '../types'

function matchAny(text: string, patterns: string[]): boolean {
  return patterns.some(p => text.includes(p))
}

function classifyByRules(summary: string, counterparty: string, amount: Money): { subject: AccountSubject; confidence: number } {
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

/**
 * 判断发票是否与本公司相关
 * 销项发票：购方名称应包含公司名
 * 进项发票：销方名称里不应该有本公司（但实际购方才应该是本公司）
 * 简化判断：公司和对方名称至少有一方能匹配上
 */
function isInvoiceRelevant(inv: InvoiceItem, companyName: string): boolean {
  if (!companyName) return true // 无公司名时不判断
  // 提取公司名核心部分（去掉"有限公司""有限责任公司"等后缀匹配）
  const core = companyName.replace(/[（(].*[)）]/g, '').trim()
  const buyer = inv.buyerName || ''
  const seller = inv.sellerName || ''
  // 销项（我方开票）：购方不应是本公司的名称
  // 进项（对方开票）：购方应包含本公司名称
  if (inv.isPurchase) {
    // 采购发票：我方是购方→购方应含公司名
    return buyer.includes(companyName) || buyer.includes(core) || companyName.includes(buyer) || core.includes(buyer)
  } else {
    // 销售发票：我方是销方→销方应含公司名
    return seller.includes(companyName) || seller.includes(core) || companyName.includes(seller) || core.includes(seller)
  }
}

/**
 * 根据发票类型/税率/金额判断更精确的会计科目
 */
function classifyInvoiceSubject(inv: InvoiceItem): AccountSubject {
  if (inv.isPurchase) {
    // 进项发票 → 成本（也可进一步细分：税率13%多为货物采购，6%多为服务）
    return 'main_cost'
  }
  // 销项发票 → 收入
  return 'main_revenue'
}

export function classifyInvoices(
  invoices: InvoiceItem[],
  companyName?: string,
  period?: TaxPeriod
): ClassifiedEntry[] {
  return invoices.map(inv => {
    const isPurchase = inv.isPurchase === true
    const counterparty = isPurchase ? (inv.sellerName || '') : (inv.buyerName || '')
    const date = inv.issueDate || inv.date || ''
    const amount = inv.isPurchase ? -(inv.totalAmount || inv.amount || 0) : (inv.totalAmount || inv.amount || 0)

    let confidence = 0.9
    let notRelevant = false
    if (companyName && !isInvoiceRelevant(inv, companyName)) {
      notRelevant = true
      confidence = 0.3
    }

    // 所属期检查
    if (period && date) {
      const cp = checkInvoicePeriod(inv, period)
      if (!cp.isCurrent) {
        if (confidence > 0.7) confidence = 0.7
      }
    }

    const subject = classifyInvoiceSubject(inv)
    const needsConfirm = confidence < 0.7 || notRelevant

    return {
      id: inv.id || inv.invoiceNumber || '',
      date,
      amount,
      counterparty,
      summary: `发票 ${inv.invoiceCode || ''}${inv.invoiceNumber || ''} ${inv.isPurchase ? '采购' : '销售'}`,
      originalType: isPurchase ? ('invoice_in' as const) : ('invoice_out' as const),
      accountSubject: subject,
      confidence,
      needsConfirmation: needsConfirm,
      source: `发票 ${inv.invoiceCode || ''}${inv.invoiceNumber || ''}`,
    }
  })
}

export function classifyExpenses(
  expenses: ExpenseItem[],
  _companyName?: string
): ClassifiedEntry[] {
  return expenses.map((exp, i) => {
    const cat = exp.category || exp.accountSubject || ''
    return {
      id: exp.date + '-' + i,
      date: exp.date || '',
      amount: -(exp.amount || 0),
      counterparty: '',
      summary: exp.summary || exp.description || cat,
      originalType: 'expense' as const,
      accountSubject: (cat as AccountSubject) || 'mgmt_expense',
      confidence: cat ? 0.8 : 0.4,
      needsConfirmation: !cat,
      source: exp.summary || cat,
    }
  })
}

export function classifyAll(
  bankTransactions: BankTransaction[],
  invoices: InvoiceItem[],
  _payroll: PayrollEntry[],
  expenses: ExpenseItem[],
  _rp: ReceivablesPayablesItem[],
  companyName?: string,
  period?: TaxPeriod
): ClassificationResult {
  const bankEntries = classifyBankTransactions(bankTransactions)
  const invoiceEntries = classifyInvoices(invoices, companyName, period)
  const expenseEntries = classifyExpenses(expenses)
  const allEntries = [...bankEntries, ...invoiceEntries, ...expenseEntries]

  const incomeEntries = allEntries.filter(e => e.amount > 0)
  const expenseEntriesFiltered = allEntries.filter(e => e.amount < 0)

  return {
    entries: allEntries,
    incomeEntries,
    costEntries: allEntries.filter(e => e.accountSubject === 'main_cost'),
    expenseEntries: expenseEntriesFiltered,
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
      totalExpense: expenseEntriesFiltered.reduce((s, e) => s + Math.abs(e.amount), 0),
    },
  }
}
