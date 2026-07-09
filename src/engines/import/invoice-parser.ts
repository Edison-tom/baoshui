import type { InvoiceItem } from './types'
import type { Money } from '../types'

function parseMoney(s: string|number|undefined|null): Money {
  if (!s) return 0
  const n = parseFloat(String(s).replace(/,/g, ''))
  return isNaN(n) ? 0 : Math.round(n * 100) / 100
}

function parseRate(raw: string): number {
  const match = String(raw).match(/(\d+)%/)
  return match ? parseInt(match[1]) / 100 : 0.01
}

function normalizeDate(raw: string): string {
  return String(raw).replace(/\//g, '-').trim()
}

export function parseInvoiceExport(rows: Record<string,any>[], _companyName?: string): InvoiceItem[] {
  return rows
    .filter(r => r['发票号码'] || r['发票代码'])
    .map(r => {
      const direction = String(r['进/销'] || r['方向'] || r['购销标志'] || '')
      const isPurchase = direction.includes('进') || direction.includes('购')
      const typeStr = String(r['发票类型'] || r['类型'] || '')
      const invoiceType = typeStr.includes('专用') ? 'special' as const : 'general' as const

      return {
        invoiceCode: String(r['发票代码'] || ''),
        invoiceNumber: String(r['发票号码'] || ''),
        issueDate: normalizeDate(String(r['开票日期'] || r['日期'] || '')),
        sellerName: String(r['销方名称'] || ''),
        buyerName: String(r['购方名称'] || ''),
        amount: parseMoney(r['金额'] || r['不含税金额']),
        taxAmount: parseMoney(r['税额'] || r['增值税额']),
        totalAmount: parseMoney(r['价税合计'] || r['含税金额']),
        taxRate: parseRate(String(r['税率'] || '1%')),
        invoiceType,
        isPurchase,
      }
    })
}
