import type { InvoiceItem } from '../import/types'
import type { VatResult } from './types'

export function calcSmallScaleVat(
  invoices: InvoiceItem[],
  _quarter: number
): VatResult {
  const salesInvoices = invoices.filter(i => !i.isPurchase)
  const general = salesInvoices.filter(i => i.invoiceType === 'general')
  const special = salesInvoices.filter(i => i.invoiceType === 'special')

  const generalSales = general.reduce((s, i) => s + i.amount, 0)
  const specialSales = special.reduce((s, i) => s + i.amount, 0)

  // 普票季度<=300,000 免征
  const generalTaxable = generalSales > 300000 ? generalSales : 0
  // 专票按各自的发票税率计算
  let specialTax = 0
  for (const i of special) {
    specialTax += i.amount * i.taxRate
  }
  const generalTax = generalTaxable * 0.01
  const taxPayable = generalTax + specialTax

  return {
    taxableSales: generalSales + specialSales,
    generalInvoiceSales: generalSales,
    specialInvoiceSales: specialSales,
    outputTax: taxPayable,
    inputTax: 0,
    inputTransferOut: 0,
    deductibleInput: 0,
    taxPayable: Math.round(taxPayable * 100) / 100,
    effectiveRate: (generalSales + specialSales) > 0 ? taxPayable / (generalSales + specialSales) : 0,
  }
}

export function calcGeneralVat(
  invoices: InvoiceItem[]
): VatResult {
  const salesInvoices = invoices.filter(i => !i.isPurchase)
  const purchaseInvoices = invoices.filter(i => i.isPurchase)

  const taxableSales = salesInvoices.reduce((s, i) => s + i.amount, 0)
  const outputTax = salesInvoices.reduce((s, i) => s + i.taxAmount, 0)
  const inputTax = purchaseInvoices.reduce((s, i) => s + i.taxAmount, 0)

  return {
    taxableSales,
    generalInvoiceSales: salesInvoices.filter(i => i.invoiceType === 'general').reduce((s,i) => s+i.amount, 0),
    specialInvoiceSales: salesInvoices.filter(i => i.invoiceType === 'special').reduce((s,i) => s+i.amount, 0),
    outputTax: Math.round(outputTax * 100) / 100,
    inputTax: Math.round(inputTax * 100) / 100,
    inputTransferOut: 0,
    deductibleInput: Math.round(inputTax * 100) / 100,
    taxPayable: Math.round((outputTax - inputTax) * 100) / 100,
    effectiveRate: taxableSales > 0 ? (outputTax - inputTax) / taxableSales : 0,
  }
}
