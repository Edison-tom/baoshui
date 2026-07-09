/**
 * 通用发票/银行回单文本提取器
 * 适用场景：PDF 提取的文本、图片 OCR 文本、OFD XML 文本
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
  // 先检查是否有财务关键字（金额/合计等），保留"发票"关键字严格匹配
  const hasInvoiceKeyword = text.includes('发票') || text.includes('invoice')
  const hasFinancialData = /[金总合小写][额计款]/.test(text) || /\d+[,.]?\d*\s*[元￥¥]/.test(text)
  const hasBankKeywords = /银行|转账|回单|交易|流水/.test(text)

  // 完全没有财务数据，不处理
  if (!hasInvoiceKeyword && !hasFinancialData && !hasBankKeywords) return null

  const invoiceNumber = findMatch(text, [
    /发票号码[：:]\s*(\S+)/,
    /No\s*[：:]\s*(\d+)/i,
    /凭证号[：:]\s*(\S+)/,
    /交易流水[：:]\s*(\S+)/,
  ])
  const invoiceCode = findMatch(text, [
    /发票代码[：:]\s*(\S+)/,
  ])
  const issueDate = findMatch(text, [
    /开票日期[：:]\s*(\S{10})/,
    /日期[：:]\s*(\d{4}[-/]\d{2}[-/]\d{2})/,
    /交易日期[：:]\s*(\d{4}[-/]\d{2}[-/]\d{2})/,
    /(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})日?/,
  ])
  // 额外日期匹配：从文本中提取第一个日期
  let fallbackDate = issueDate
  if (!fallbackDate) {
    const dateMatch = text.match(/(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})日?/)
    if (dateMatch) fallbackDate = `${dateMatch[1]}-${String(dateMatch[2]).padStart(2,'0')}-${String(dateMatch[3]).padStart(2,'0')}`
  }

  const sellerName = findMatch(text, [
    /销[货方][名称单位]?[：:]\s*(.+)/,
    /销售方[名称]?[：:]\s*(.+)/,
    /销售方[：:]\s*(.+)/,
    /付款人[名称]?[：:]\s*(.+)/,
    /付款方[名称]?[：:]\s*(.+)/,
  ])
  const buyerName = findMatch(text, [
    /购买方[名称]?[：:]\s*(.+)/,
    /购[货方][名称单位]?[：:]\s*(.+)/,
    /购方[名称]?[：:]\s*(.+)/,
    /收款人[名称]?[：:]\s*(.+)/,
    /收款方[名称]?[：:]\s*(.+)/,
  ])
  const amountStr = findMatch(text, [
    /金额[（(]小写[)）][：:]\s*([\d,]+\.?\d*)/,
    /金额[：:]\s*([\d,]+\.?\d*)/,
    /不含税金额[：:]\s*([\d,]+\.?\d*)/,
    /交易金额[：:]\s*([\d,]+\.?\d*)/,
    /小写金额[：:]\s*([\d,]+\.?\d*)/,
    /实付金额[：:]\s*([\d,]+\.?\d*)/,
    /([\d,]+\.\d{2})\s*$/,  // 行末金额格式
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
    /合计[（(]小写[)）][：:]\s*([\d,]+\.?\d*)/,
    /合计[：:]\s*([\d,]+\.?\d*)/,
  ])
  const typeStr = findMatch(text, [
    /发票类型[：:]\s*(.+)/,
  ])

  const amount = parseMoney(amountStr || '0')
  const taxAmount = parseMoney(taxStr || '0')
  const totalMatch = totalStr ? parseMoney(totalStr) : (amount + taxAmount)
  const totalAmount = totalMatch > 0 ? totalMatch : (amount + taxAmount)
  const invoiceType = typeStr.includes('专用') ? 'special' as const : 'general' as const
  const taxRate = amount > 0 ? parseFloat((taxAmount / amount).toFixed(4)) : 0.01

  // 最少需要识别出金额
  if (amount === 0 && !invoiceNumber) return null

  return {
    invoiceCode,
    invoiceNumber,
    issueDate: fallbackDate || (fileName ? fileName.replace(/[^0-9]/g, '').slice(0, 8) : ''),
    sellerName,
    buyerName,
    amount,
    taxAmount,
    totalAmount,
    taxRate,
    invoiceType: hasInvoiceKeyword ? invoiceType : 'general',
    isPurchase: !buyerName && !sellerName ? true : !!buyerName,
    invoiceNo: invoiceNumber,
    date: fallbackDate,
    type: invoiceType === 'special' ? 'special' as const : 'plain' as const,
    category: hasInvoiceKeyword ? '采购' : (hasBankKeywords ? '银行回单' : '其他'),
  }
}
