import type { BankTransaction } from './types'
import type { Money } from '../types'

export function parseMoney(raw: string|number|undefined|null): Money {
  if (raw === undefined || raw === null || raw === '') return 0
  const s = String(raw).replace(/,/g, '').trim()
  const n = parseFloat(s)
  return isNaN(n) ? 0 : Math.round(n * 100) / 100
}

function normalizeDate(raw: string): string {
  const d = String(raw).replace(/\//g, '-').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d
  const parts = d.split('-')
  if (parts.length === 3) {
    return `${parts[0]}-${parts[1].padStart(2,'0')}-${parts[2].padStart(2,'0')}`
  }
  return d
}

function findColumn(row: Record<string,any>|undefined, candidates: string[]): string {
  if (!row) return candidates[0]
  for (const c of candidates) { if (c in row) return c }
  const keys = Object.keys(row)
  for (const c of candidates) {
    const match = keys.find(k => k.includes(c))
    if (match) return match
  }
  return candidates[0]
}

export function parseBankExcel(rows: Record<string,any>[]): BankTransaction[] {
  if (rows.length === 0) return []
  const dateCol = findColumn(rows[0], ['交易日期','日期','Date','记账日期'])
  const debitCol = findColumn(rows[0], ['借方金额','支出金额','Debit'])
  const creditCol = findColumn(rows[0], ['贷方金额','收入金额','Credit'])
  const balanceCol = findColumn(rows[0], ['余额','Balance'])
  const counterpartyCol = findColumn(rows[0], ['对方户名','对方','Counterparty','交易对方'])
  const summaryCol = findColumn(rows[0], ['摘要','用途','Summary','备注'])

  return rows
    .filter(r => r && (r[debitCol] || r[creditCol]))
    .map(r => {
      const debit = parseMoney(r[debitCol])
      const credit = parseMoney(r[creditCol])
      return {
        date: normalizeDate(String(r[dateCol] || '')),
        amount: credit > 0 ? credit : -debit,
        counterparty: String(r[counterpartyCol] || ''),
        summary: String(r[summaryCol] || ''),
        bankAccount: String(r['账号'] || ''),
        balance: parseMoney(r[balanceCol]),
        description: String(r[summaryCol] || ''),
        accountNumber: String(r['账号'] || ''),
      }
    })
}

export function parseBankCSV(csv: string): BankTransaction[] {
  const lines = csv.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim())
  const rows = lines.slice(1).map(line => {
    const values = line.split(',')
    const row: Record<string,string> = {}
    headers.forEach((h,i) => { row[h] = values[i]?.trim() || '' })
    return row
  })
  return parseBankExcel(rows)
}
