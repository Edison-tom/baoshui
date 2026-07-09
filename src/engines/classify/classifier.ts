import type { Money, AccountSubject } from '../types'
import type { BankTransaction, InvoiceItem, ExpenseItem } from '../import/types'
import type { ClassifiedEntry, ClassificationResult } from './types'
import {
  KEYWORD_RULES, COUNTERPARTY_RULES,
  INTERNAL_TRANSFER_KEYWORDS, DEEMED_SALE_KEYWORDS,
  INPUT_TRANSFER_KEYWORDS, DUTY_FREE_KEYWORDS,
} from '../../data/rules/keywords'

let idCounter = 0
function genId(): string { return `entry_${++idCounter}` }

function matchAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase()
  return keywords.some(k => lower.includes(k.toLowerCase()))
}

function classifyByRules(summary: string, counterparty: string, amount: Money): {
  subject: AccountSubject; confidence: number
} {
  for (const rule of KEYWORD_RULES) {
    if (matchAny(summary, rule.keywords) || matchAny(counterparty, rule.keywords)) {
      return { subject: rule.subject, confidence: rule.priority / 10 }
    }
  }
  for (const rule of COUNTERPARTY_RULES) {
    if (matchAny(counterparty, rule.patterns)) {
      return { subject: rule.subject, confidence: 0.85 }
    }
  }
  if (amount > 0) return { subject: 'main_revenue', confidence: 0.5 }
  return { subject: 'mgmt_expense', confidence: 0.4 }
}

function detectSpecial(summary: string, counterparty: string, _amount: Money): {
  isInternalTransfer: boolean; isDeemedSale: boolean
  isInputTransfer: boolean; isDutyFree: boolean
} {
  const combined = summary + counterparty
  return {
    isInternalTransfer: matchAny(combined, INTERNAL_TRANSFER_KEYWORDS),
    isDeemedSale: matchAny(summary, DEEMED_SALE_KEYWORDS),
    isInputTransfer: matchAny(summary, INPUT_TRANSFER_KEYWORDS),
    isDutyFree: matchAny(combined, DUTY_FREE_KEYWORDS),
  }
}

export function classifyBankTransactions(
  transactions: BankTransaction[],
  bankAccountNumbers: string[]
): ClassificationResult {
  idCounter = 0
  const accounts = new Set(bankAccountNumbers.map(a => a.trim()))

  const entries: ClassifiedEntry[] = transactions.map(t => {
    const isInternal = t.bankAccount
      ? accounts.has(t.bankAccount.trim()) && t.amount > 0
      : false

    const special = detectSpecial(t.summary, t.counterparty, t.amount)
    const { subject, confidence } =
      isInternal || special.isInternalTransfer
        ? { subject: 'internal_transfer' as AccountSubject, confidence: 0.95 }
        : classifyByRules(t.summary, t.counterparty, t.amount)

    return {
      id: genId(), date: t.date, amount: t.amount,
      counterparty: t.counterparty, summary: t.summary,
      originalType: 'bank', accountSubject: subject,
      confidence, needsConfirmation: confidence < 0.7,
      source: t.bankAccount || 'bank',
    }
  })

  return buildResult(entries)
}

export function classifyInvoiceItems(items: InvoiceItem[]): ClassificationResult {
  idCounter = 0

  const entries: ClassifiedEntry[] = items.map(item => {
    const subject: AccountSubject = item.isPurchase ? 'main_cost' : 'main_revenue'
    return {
      id: genId(), date: item.issueDate,
      amount: item.isPurchase ? -item.totalAmount : item.totalAmount,
      counterparty: item.isPurchase ? item.sellerName : item.buyerName,
      summary: item.isPurchase ? '采购' : '销售',
      originalType: item.isPurchase ? 'invoice_in' : 'invoice_out',
      accountSubject: subject, confidence: 0.9,
      needsConfirmation: false,
      source: `发票:${item.invoiceNumber}`,
    }
  })

  return buildResult(entries)
}

export function classifyExpenses(items: ExpenseItem[]): ClassificationResult {
  idCounter = 0

  const entries: ClassifiedEntry[] = items.map(item => {
    const { subject, confidence } = classifyByRules(item.summary, item.category, -item.amount)
    return {
      id: genId(), date: item.date, amount: -item.amount,
      counterparty: item.category, summary: item.summary,
      originalType: 'expense', accountSubject: subject,
      confidence, needsConfirmation: item.isCrossPeriod,
      source: 'expense',
    }
  })

  return buildResult(entries)
}

function buildResult(entries: ClassifiedEntry[]): ClassificationResult {
  return {
    entries,
    incomeEntries: entries.filter(e => e.amount > 0 && e.accountSubject !== 'internal_transfer'),
    costEntries: entries.filter(e => e.accountSubject === 'main_cost'),
    expenseEntries: entries.filter(e =>
      ['mgmt_expense','sales_expense','finance_expense','tax_payment','social_insurance','tax_surcharge'].includes(e.accountSubject)
    ),
    transferEntries: entries.filter(e =>
      ['internal_transfer','loan_borrow','loan_repay','receivable','payable'].includes(e.accountSubject)
    ),
    lowConfidenceEntries: entries.filter(e => e.needsConfirmation),
    deemedSales: entries.filter(e => DEEMED_SALE_KEYWORDS.some(k => e.summary.includes(k))),
    inputTransferOut: entries.filter(e => INPUT_TRANSFER_KEYWORDS.some(k => e.summary.includes(k))),
    dutyFree: entries.filter(e => DUTY_FREE_KEYWORDS.some(k =>
      (e.summary + e.counterparty).includes(k)
    )),
    crossPeriod: [],
  }
}
