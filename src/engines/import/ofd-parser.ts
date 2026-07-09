/**
 * OFD 发票解析器
 * 使用 JSZip 解压 .ofd 文件，读取内部 XML 提取发票字段
 */
import type { InvoiceItem } from './types'
import { parseInvoiceText } from './invoice-text-parser'
import { parseMoney } from './bank-parser'

interface ParsedOfdInvoice {
  invoiceCode: string; invoiceNumber: string; issueDate: string
  sellerName: string; buyerName: string
  amount: number; taxAmount: number; totalAmount: number
  taxRate: number; invoiceType: 'general'|'special'
}

function parseXmlString(xml: string): Document|null {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'application/xml')
    if (doc.querySelector('parsererror')) return null
    return doc
  } catch { return null }
}

function getXmlText(doc: Document, tag: string): string {
  const el = doc.querySelector(tag)
  return el?.textContent?.trim() || ''
}

export function parseOfdInvoiceXML(xml: string): ParsedOfdInvoice|null {
  const doc = parseXmlString(xml)
  if (!doc) return null
  const amount = parseFloat(getXmlText(doc, 'AmountInfo > Amount') || '0')
  const taxAmount = parseFloat(getXmlText(doc, 'AmountInfo > TaxAmount') || '0')
  const typeStr = getXmlText(doc, 'GeneralInfo > InvoiceType')
  if (!getXmlText(doc, 'GeneralInfo > InvoiceNumber')) {
    // 尝试从文本内容直接提取
    const bodyText = doc.body?.textContent || ''
    if (bodyText) {
      return fallbackFromText(bodyText)
    }
    return null
  }
  return {
    invoiceCode: getXmlText(doc, 'GeneralInfo > InvoiceCode'),
    invoiceNumber: getXmlText(doc, 'GeneralInfo > InvoiceNumber'),
    issueDate: getXmlText(doc, 'GeneralInfo > IssueDate'),
    sellerName: getXmlText(doc, 'SellerInfo > SellerName'),
    buyerName: getXmlText(doc, 'BuyerInfo > BuyerName'),
    amount, taxAmount,
    totalAmount: parseFloat(getXmlText(doc, 'AmountInfo > TotalAmount') || '0'),
    taxRate: amount > 0 ? taxAmount / amount : 0.01,
    invoiceType: typeStr.includes('专用') ? 'special' : 'general',
  }
}

/** 如果标准 XML 路径没匹配到，回退到全文本正则提取 */
function fallbackFromText(bodyText: string): ParsedOfdInvoice|null {
  const m = parseInvoiceText(bodyText)
  if (!m) return null
  return {
    invoiceCode: m.invoiceCode || '',
    invoiceNumber: m.invoiceNumber || '',
    issueDate: m.issueDate || '',
    sellerName: m.sellerName || '',
    buyerName: m.buyerName || '',
    amount: m.amount,
    taxAmount: m.taxAmount,
    totalAmount: m.totalAmount,
    taxRate: m.taxRate || 0.01,
    invoiceType: m.invoiceType === 'special' ? 'special' : 'general',
  }
}

export async function extractOfdInvoiceData(parsed: ParsedOfdInvoice): Promise<InvoiceItem> {
  return {
    invoiceCode: parsed.invoiceCode, invoiceNumber: parsed.invoiceNumber,
    issueDate: parsed.issueDate, sellerName: parsed.sellerName,
    buyerName: parsed.buyerName, amount: parsed.amount,
    taxAmount: parsed.taxAmount, totalAmount: parsed.totalAmount,
    taxRate: parsed.taxRate, invoiceType: parsed.invoiceType, isPurchase: true,
  }
}

/**
 * 解析 OFD 文件：用 JSZip 解压后读取内部 Content.xml
 * 兼容不同 OFD 格式：Doc_0/Pages/Page_0/Content.xml 或 T_InvoiceXml
 */
export async function parseOfdFile(file: File): Promise<InvoiceItem[]> {
  let JSZip: any
  try {
    JSZip = (await import('jszip')).default
  } catch {
    throw new Error('JSZip 加载失败，请刷新页面重试')
  }

  const buffer = await file.arrayBuffer()
  const zip = await JSZip.loadAsync(buffer)

  // 尝试多种 OFD 内部路径
  const xmlPaths = [
    'Doc_0/Pages/Page_0/Content.xml',
    'Doc_0/Pages/Page_0/Content.xml',
    'T_InvoiceXml',
    'OFD.xml',
  ]

  for (const path of xmlPaths) {
    const entry = zip.files[path]
    if (entry) {
      const text = await entry.async('text')
      if (text.trim().startsWith('<')) {
        const parsed = parseOfdInvoiceXML(text)
        if (parsed) {
          return [await extractOfdInvoiceData(parsed)]
        }
      }
    }
  }

  // 最后尝试：在所有文件中搜索包含发票信息的 XML
  for (const filename of Object.keys(zip.files)) {
    if (filename.endsWith('.xml')) {
      const entry = zip.files[filename]
      if (entry && !entry.dir) {
        const text = await entry.async('text')
        if (text.includes('发票号码') || text.includes('InvoiceNumber')) {
          const parsed = parseOfdInvoiceXML(text)
          if (parsed) {
            return [await extractOfdInvoiceData(parsed)]
          }
        }
      }
    }
  }

  throw new Error('OFD 文件中未找到有效的发票 XML 数据')
}
