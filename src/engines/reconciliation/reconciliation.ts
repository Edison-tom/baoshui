import type { Money } from '../types'
import type { ClassificationResult } from '../classify/types'

export type ReconciliationStatus = 'pass' | 'warn' | 'fail'

export interface ReconciliationResult {
  status: ReconciliationStatus
  items: ReconciliationItem[]
  taxBurdenRate: number
}

export interface ReconciliationItem {
  name: string; status: 'ok' | 'warn' | 'error'
  message: string; detail: string
}

export function reconcile(
  classification: ClassificationResult,
  vatTaxableSales: Money
): ReconciliationResult {
  const bankIncome = classification.incomeEntries.reduce((s, e) => s + e.amount, 0)
  const items: ReconciliationItem[] = []

  // 收入一致性
  const incomeDiff = Math.abs(bankIncome - vatTaxableSales)
  const incomeDiffRate = vatTaxableSales > 0 ? incomeDiff / vatTaxableSales : 0
  if (incomeDiffRate < 0.05) {
    items.push({ name: '收入一致性', status: 'ok', message: '银行收入与发票销售额一致', detail: `差异率 ${(incomeDiffRate * 100).toFixed(1)}%` })
  } else if (incomeDiffRate < 0.15) {
    items.push({ name: '收入一致性', status: 'warn', message: '银行收入与发票销售额存在差异', detail: `差异 ${incomeDiff.toFixed(2)} 元 (${(incomeDiffRate * 100).toFixed(1)}%)` })
  } else {
    items.push({ name: '收入一致性', status: 'error', message: '银行收入与发票销售额差异较大', detail: `差异 ${incomeDiff.toFixed(2)} 元 (${(incomeDiffRate * 100).toFixed(1)}%)` })
  }

  // 低置信度项
  if (classification.lowConfidenceEntries.length > 0) {
    items.push({ name: '分类待确认', status: 'warn', message: `${classification.lowConfidenceEntries.length} 条交易分类可能是错的`, detail: '建议逐笔确认' })
  } else {
    items.push({ name: '分类待确认', status: 'ok', message: '所有交易已自动分类', detail: '' })
  }

  // 税负率
  const bankTotal = classification.entries.reduce((s, e) => s + Math.abs(e.amount), 0)
  const taxBurdenRate = bankTotal > 0 ? vatTaxableSales / bankTotal : 0

  const hasError = items.some(i => i.status === 'error')
  const hasWarn = items.some(i => i.status === 'warn')

  return {
    status: hasError ? 'fail' : hasWarn ? 'warn' : 'pass',
    items,
    taxBurdenRate: Math.round(taxBurdenRate * 10000) / 10000,
  }
}
