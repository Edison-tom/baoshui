import { describe, it, expect } from 'vitest'
import { detectFileCategory } from '../../../src/engines/import/auto-detect'

describe('detectFileCategory', () => {
  it('detects OFD files', () => {
    expect(detectFileCategory('invoice.ofd')).toBe('invoice_original')
  })
  it('detects images as invoice originals', () => {
    expect(detectFileCategory('scan.jpg')).toBe('invoice_original')
    expect(detectFileCategory('photo.png')).toBe('invoice_original')
  })
  it('detects bank statement by headers', () => {
    expect(detectFileCategory('flow.xlsx', ['交易日期','借方金额','贷方金额','余额','对方户名'])).toBe('bank_statement')
  })
  it('detects invoice export by headers', () => {
    expect(detectFileCategory('export.xlsx', ['发票代码','发票号码','销方名称','金额'])).toBe('invoice_export')
  })
  it('detects payroll by headers', () => {
    expect(detectFileCategory('salary.xlsx', ['姓名','身份证号','应发工资','社保基数'])).toBe('payroll')
  })
  it('returns unknown for unrecognized', () => {
    expect(detectFileCategory('data.csv', ['A','B','C'])).toBe('unknown')
  })
})
