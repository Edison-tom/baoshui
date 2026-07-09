import { describe, it, expect } from 'vitest'
import { classifyBankTransactions } from '../../../src/engines/classify/classifier'
import type { BankTransaction } from '../../../src/engines/import/types'

const makeTxn = (overrides: Partial<BankTransaction>): BankTransaction => ({
  date: '2026-07-01', amount: 50000, counterparty: '某科技',
  summary: '货款', bankAccount: '6222', ...overrides,
})

describe('classifyBankTransactions', () => {
  it('classifies income as main_revenue', () => {
    const result = classifyBankTransactions([makeTxn({ amount: 50000, summary: '销售货款' })], [])
    expect(result.incomeEntries).toHaveLength(1)
  })

  it('classifies salary as salary subject', () => {
    const result = classifyBankTransactions([makeTxn({ amount: -28000, summary: '工资代发' })], [])
    expect(result.entries[0].accountSubject).toBe('salary')
  })

  it('detects internal transfers', () => {
    const result = classifyBankTransactions([makeTxn({ amount: 10000, summary: '转账', bankAccount: '6222' })], ['6222'])
    expect(result.entries[0].accountSubject).toBe('internal_transfer')
  })

  it('detects tax payments', () => {
    const result = classifyBankTransactions([makeTxn({ amount: -3200, summary: '缴税' })], [])
    expect(result.entries[0].accountSubject).toBe('tax_payment')
  })
})
