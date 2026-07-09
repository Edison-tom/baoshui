import { describe, it, expect } from 'vitest'
import { calcSmallScaleVat, calcGeneralVat } from '../../../src/engines/tax/vat'
import type { InvoiceItem } from '../../../src/engines/import/types'

const makeInvoice = (overrides: Partial<InvoiceItem>): InvoiceItem => ({
  invoiceCode: '123', invoiceNumber: '456', issueDate: '2026-07-01',
  sellerName: 'Seller', buyerName: 'Buyer',
  amount: 10000, taxAmount: 100, totalAmount: 10100,
  taxRate: 0.01, invoiceType: 'general', isPurchase: false,
  ...overrides,
})

describe('calcSmallScaleVat', () => {
  it('calculates VAT for general invoices only', () => {
    const invoices = [makeInvoice({ amount: 100000, taxRate: 0.01 })]
    const result = calcSmallScaleVat(invoices, 3)
    expect(result.taxPayable).toBe(0) // 季度<30万免征
  })

  it('calculates VAT when exceeding 300k quarterly', () => {
    const invoices = [makeInvoice({ amount: 400000, taxRate: 0.01 })]
    const result = calcSmallScaleVat(invoices, 3)
    expect(result.taxPayable).toBe(4000) // 400000 * 1%
  })

  it('special invoices always taxed at their rate', () => {
    const invoices = [makeInvoice({ amount: 20000, taxRate: 0.03, invoiceType: 'special' })]
    const result = calcSmallScaleVat(invoices, 3)
    expect(result.taxPayable).toBe(600) // 20000 * 3%
  })
})

describe('calcGeneralVat', () => {
  it('calculates output minus input', () => {
    const sales = makeInvoice({ amount: 100000, taxAmount: 13000, taxRate: 0.13 })
    const purchase = makeInvoice({ amount: 50000, taxAmount: 6500, taxRate: 0.13, isPurchase: true })
    const result = calcGeneralVat([sales, purchase])
    expect(result.taxPayable).toBe(6500) // 13000 - 6500
  })
})
