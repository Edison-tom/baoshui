import type { TaxPeriod } from '../types'
import type { InvoiceItem, BankTransaction } from './types'

/**
 * 解析日期字符串（"2026-03-21" 或 "2026/03/21"）→ { year, month }，失败返回 null
 */
function parseDate(dateStr: string): { year: number; month: number } | null {
  if (!dateStr) return null
  const cleaned = dateStr.replace(/\//g, '-')
  const m = cleaned.match(/^(\d{4})-(\d{1,2})-\d{1,2}$/)
  if (!m) return null
  return { year: parseInt(m[1]), month: parseInt(m[2]) }
}

/**
 * 判断某个月份是否属于当前所属期
 * @param target - 待判断的年月
 * @param period - 公司当前所属期
 * @returns true = 属于当前期
 */
export function isInCurrentPeriod(
  target: { year: number; month: number },
  period: TaxPeriod
): boolean {
  // 季度申报：判断是否在当前季度内
  if (period.quarter) {
    const qStart = period.quarter * 3 - 2  // Q1=1, Q2=4, Q3=7, Q4=10
    const qEnd = period.quarter * 3
    // 当前季度所属期 = 季度最后一月，但发票可能是季度内任何一个月
    // 例：Q2（4-6月），6月申报→4、5、6月的发票都算本期
    if (target.year !== period.year) return false
    return target.month >= qStart && target.month <= qEnd
  }

  // 月度申报：判断是否在当前月
  if (target.year !== period.year) return false
  return target.month === period.month
}

/**
 * 检查单张发票是否属于当前所属期
 */
export function checkInvoicePeriod(
  invoice: InvoiceItem,
  period: TaxPeriod
): { isCurrent: boolean; dateStr: string | null } {
  const dateStr = invoice.issueDate || invoice.date
  if (!dateStr) return { isCurrent: true, dateStr: null }

  const parsed = parseDate(dateStr)
  if (!parsed) return { isCurrent: true, dateStr }

  return {
    isCurrent: isInCurrentPeriod(parsed, period),
    dateStr,
  }
}

/**
 * 检查银行流水是否属于当前所属期
 */
export function checkTransactionPeriod(
  tx: BankTransaction,
  period: TaxPeriod
): { isCurrent: boolean; dateStr: string | null } {
  if (!tx.date) return { isCurrent: true, dateStr: null }

  const parsed = parseDate(tx.date)
  if (!parsed) return { isCurrent: true, dateStr: tx.date }

  return {
    isCurrent: isInCurrentPeriod(parsed, period),
    dateStr: tx.date,
  }
}

/**
 * 批量检查发票中非本期数量及金额
 */
export function getCrossPeriodInvoiceSummary(
  invoices: InvoiceItem[],
  period: TaxPeriod
): { count: number; totalAmount: number; items: InvoiceItem[] } {
  const crossItems = invoices.filter(inv => !checkInvoicePeriod(inv, period).isCurrent)
  return {
    count: crossItems.length,
    totalAmount: crossItems.reduce((s, i) => s + i.totalAmount, 0),
    items: crossItems,
  }
}

/**
 * 批量检查银行流水中非本期数量及金额
 */
export function getCrossPeriodTransactionSummary(
  txs: BankTransaction[],
  period: TaxPeriod
): { count: number; totalAmount: number; items: BankTransaction[] } {
  const crossItems = txs.filter(tx => !checkTransactionPeriod(tx, period).isCurrent)
  return {
    count: crossItems.length,
    totalAmount: crossItems.reduce((s, t) => s + t.amount, 0),
    items: crossItems,
  }
}
