import { describe, it, expect } from 'vitest'
import { calcIit } from '../../../src/engines/tax/iit'
import type { PayrollEntry } from '../../../src/engines/import/types'

const makeEntry = (overrides: Partial<PayrollEntry>): PayrollEntry => ({
  name: 'Test', idNumber: '430100199001011234',
  employeeType: 'formal', grossSalary: 10000, socialBase: 10000,
  housingFundBase: 10000, childrenEdu: 0, continuingEdu: 0,
  housingLoan: 0, elderlySupport: 0, infantCare: 0,
  ...overrides,
})

describe('calcIit', () => {
  it('no tax below exemption threshold', () => {
    const result = calcIit([makeEntry({ grossSalary: 4000 })], 1)
    expect(result.entries[0].currentPayable).toBe(0)
  })

  it('calculates tax for above-threshold salary', () => {
    const result = calcIit([makeEntry({ grossSalary: 12000 })], 1)
    expect(result.entries[0].currentPayable).toBeGreaterThan(0)
  })

  it('cumulative pre-deduction works', () => {
    const r1 = calcIit([makeEntry({ grossSalary: 12000 })], 1)
    const r6 = calcIit([makeEntry({ grossSalary: 12000 })], 6)
    expect(r6.entries[0].cumulativeTax).toBeGreaterThan(r1.entries[0].cumulativeTax)
  })
})
