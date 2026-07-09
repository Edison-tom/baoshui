/**
 * 通用发票文本正则提取器
 * 适用场景：PDF 提取的文本、图片 OCR 文本、OFD XML 文本
 * 兼容各电子发票平台格式（航信、百旺、税务UKey）
 */
import type { InvoiceItem } from './types'
import { parseMoney } from './bank-parser'

function findMatch(text: string, patterns: RegExp[]): string {
  for (const p of patterns) {
    const m = text.match(p)
    if (m && m[1]) return m[1].trim()
  }
  return ''
}

export function parseInvoiceText(text: string, fileName?: string): InvoiceItem | null {
  // 必须包含发票基本标识
  if (!text.includes('发票') && !text.includes('invoice')) return null

  const invoiceNumber = findMatch(text, [
    /发票号码[：:]\s*(\S+)/,
    /No\s*[：:]\s*(\d+)/i,
  ])
  const invoiceCode = findMatch(text, [
    /发票代码[：:]\s*(\S+)/,
  ])
  const issueDate = findMatch(text, [
    /开票日期[：:]\s*(\S{10})/,
    /日期[：:]\s*(\d{4}[-/]\d{2}[-/]\d{2})/,
  ])
  const sellerName = findMatch(text, [
    /销[货方][名称单位]?[：:]\s*(.+)/,
    /销售方[名称]?[：:]\s*(.+)/,
    /销售方[：:]\s*(.+)/,
  ])
  const buyerName = findMatch(text, [
    /购买方[名称]?[：:]\s*(.+)/,
    /购[货方][名称单位]?[：:]\s*(.+)/,
    /购方[名称]?[：:]\s*(.+)/,
  ])
  const amountStr = findMatch(text, [
    /金额[：:]\s*([\d,]+\.?\d*)/,
    /不含税金额[：:]\s*([\d,]+\.?\d*)/,
  ])
  const taxStr = findMatch(text, [
    /税额[：:]\s*([\d,]+\.?\d*)/,
    /增值税额[：:]\s*([\d,]+\.?\d*)/,
  ])
  const totalStr = findMatch(text, [
    /价税合计[（(]大写[)）][^：:]*[：:]\s*[\d,]+\.?\d*/,
    /价税合计[（(]小写[)）][：:]\s*([\d,]+\.?\d*)/,
    /价税合计[：:]\s*([\d,]+\.?\d*)/,
    /含税金额[：:]\s*([\d,]+\.?\d*)/,
  ])
  const typeStr = findMatch(text, [
    /发票类型[：:]\s*(.+)/,
  ])

  const amount = parseMoney(amountStr || '0')
  const taxAmount = parseMoney(taxStr || '0')
  // 如果价税合计没匹配到，从金额+税额算
  const totalMatch = totalStr ? parseMoney(totalStr) : (amount + taxAmount)
  const totalAmount = totalMatch > 0 ? totalMatch : (amount + taxAmount)
  const invoiceType = typeStr.includes('专用') ? 'special' as const : 'general' as const
  const taxRate = amount > 0 ? parseFloat((taxAmount / amount).toFixed(4)) : 0.01

  // 最少需要发票号码或金额
  if (!invoiceNumber && amount === 0) return null

  return {
    invoiceCode,
    invoiceNumber,
    issueDate: issueDate || (fileName ? fileName.replace(/[^0-9]/g, '').slice(0, 8) : ''),
    sellerName,
    buyerName,
    amount,
    taxAmount,
    totalAmount,
    taxRate,
    invoiceType,
    isPurchase: true,
    invoiceNo: invoiceNumber,
    date: issueDate,
    type: invoiceType === 'special' ? 'special' as const : 'plain' as const,
    category: '采购',
  }
}
