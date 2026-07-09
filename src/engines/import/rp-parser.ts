import type { ReceivablesPayablesItem } from './types'
import { parseMoney } from './bank-parser'

export function parseReceivablesPayables(rows: Record<string,any>[]): ReceivablesPayablesItem[] {
  return rows
    .filter(r => r['类型'] && r['对方名称'] && r['金额'])
    .map(r => {
      const date = String(r['发生日期'] || r['日期'] || '').replace(/\//g, '-').trim()
      const expectedDate = String(r['预计收回'] || r['预计支付'] || r['预计日期'] || '').replace(/\//g, '-').trim()
      return {
        type: String(r['类型']).includes('应付') ? 'payable' as const : 'receivable' as const,
        counterparty: String(r['对方名称']),
        amount: parseMoney(r['金额']),
        date,
        expectedDate,
        summary: String(r['摘要'] || ''),
        dueDate: expectedDate || date,
        status: 'pending' as const,
      }
    })
}
