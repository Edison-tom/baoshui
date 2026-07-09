import type { ExpenseItem } from './types'
import { parseMoney } from './bank-parser'

export function parseExpense(rows: Record<string,any>[]): ExpenseItem[] {
  return rows
    .filter(r => r['日期'] && r['金额'])
    .map(r => ({
      date: String(r['日期']).replace(/\//g, '-').trim(),
      amount: parseMoney(r['金额']),
      category: String(r['类别'] || r['费用类别'] || ''),
      summary: String(r['摘要'] || r['事由'] || ''),
      hasInvoice: String(r['是否有发票'] || '').includes('是') || String(r['发票'] || '') === '有',
      isCrossPeriod: String(r['是否跨期'] || '').includes('是'),
      crossPeriodMonths: parseInt(String(r['分摊月数'] || '0')) || undefined,
      accountSubject: r['对应科目'] ? String(r['对应科目']) : undefined,
    }))
}
