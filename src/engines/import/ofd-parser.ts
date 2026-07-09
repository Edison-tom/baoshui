import type { InvoiceItem } from './types'

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

export async function extractOfdInvoiceData(parsed: ParsedOfdInvoice): Promise<InvoiceItem> {
  return {
    invoiceCode: parsed.invoiceCode, invoiceNumber: parsed.invoiceNumber,
    issueDate: parsed.issueDate, sellerName: parsed.sellerName,
    buyerName: parsed.buyerName, amount: parsed.amount,
    taxAmount: parsed.taxAmount, totalAmount: parsed.totalAmount,
    taxRate: parsed.taxRate, invoiceType: parsed.invoiceType, isPurchase: true,
  }
}

export async function parseOfdFile(_file: File): Promise<InvoiceItem[]> {
  throw new Error('OFD file parsing requires browser-side JSZip. Import JSZip dynamically.')
}
