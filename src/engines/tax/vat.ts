import type { InvoiceItem } from '../import/types'
import type { VatResult } from './types'

export function calcSmallScaleVat(invoices: InvoiceItem[], consecutiveMonths: number): VatResult {
  const salesInvoices = invoices.filter(i => i.isPurchase !== true)
  const taxableSales = salesInvoices.reduce((s, i) => s + i.amount, 0)
  const specialInvoiceSales = salesInvoices
    .filter(i => i.invoiceType === 'special')
    .reduce((s, i) => s + i.amount, 0)
  const generalInvoiceSales = taxableSales - specialInvoiceSales

  const threshold = 300000
  const isQuarterly = consecutiveMonths >= 3
  const specialRate = salesInvoices.find(i => i.invoiceType === 'special')?.taxRate || 0.01
  const specialTax = specialInvoiceSales * specialRate

  let generalTax = 0
  if (isQuarterly && taxableSales > threshold) {
    const generalRate = salesInvoices.find(i => i.invoiceType !== 'special')?.taxRate || 0.01
    generalTax = generalInvoiceSales * generalRate
  }

  const outputTax = specialTax + generalTax
  const taxPayable = outputTax

  return {
    taxableSales, generalInvoiceSales, specialInvoiceSales,
    outputTax, inputTax: 0, inputTransferOut: 0,
    deductibleInput: 0, taxPayable,
    effectiveRate: taxableSales > 0 ? taxPayable / taxableSales : 0,
  }
}

export function calcGeneralVat(invoices: InvoiceItem[]): VatResult {
  const sales = invoices.filter(i => i.isPurchase !== true)
  const purchases = invoices.filter(i => i.isPurchase === true)

  const taxableSales = sales.reduce((s, i) => s + i.amount, 0)
  const specialInvoiceSales = sales
    .filter(i => i.invoiceType === 'special')
    .reduce((s, i) => s + i.amount, 0)
  const generalInvoiceSales = taxableSales - specialInvoiceSales

  const outputTax = sales.reduce((s, i) => s + (i.taxAmount || 0), 0)
  const inputTax = purchases
    .filter(i => i.invoiceType === 'special')
    .reduce((s, i) => s + (i.taxAmount || 0), 0)

  const deductibleInput = inputTax
  const taxPayable = outputTax - deductibleInput

  return {
    taxableSales, generalInvoiceSales, specialInvoiceSales,
    outputTax, inputTax, inputTransferOut: 0,
    deductibleInput, taxPayable: taxPayable < 0 ? 0 : taxPayable,
    effectiveRate: taxableSales > 0 ? taxPayable / taxableSales : 0,
  }
}
