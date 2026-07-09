import { describe, it, expect } from 'vitest'
import {
  determineTaxObligations,
  getDueObligations,
} from '../../../src/engines/tax-obligation'
import type { TaxPeriod, EnabledModules } from '../../../src/engines/types'

const defaultModules: EnabledModules = {
  fixedAssets: false, amortization: false, rdExpense: false,
  yearEndBonus: false, intangibleAssets: false, stampDuty: false,
  simpleTax: false, dutyFreeIncome: false,
}

const marchPeriod: TaxPeriod = { year: 2026, month: 3, startDate: '2026-03-01', endDate: '2026-03-31' }
const febPeriod: TaxPeriod = { year: 2026, month: 2, startDate: '2026-02-01', endDate: '2026-02-28' }

describe('determineTaxObligations', () => {

  it('一般纳税人 — 3月需报增值税（月报）+ 企税（季末）', () => {
    const result = determineTaxObligations('general_taxpayer', marchPeriod, defaultModules)
    expect(result.find(o => o.key === 'vat')?.isDue).toBe(true)
    expect(result.find(o => o.key === 'vat')?.frequency).toBe('monthly')
    expect(result.find(o => o.key === 'cit')?.isDue).toBe(true)
    expect(result.find(o => o.key === 'cit')?.frequency).toBe('quarterly')
    expect(result.find(o => o.key === 'iit')?.isDue).toBe(true)
    expect(result.find(o => o.key === 'social')?.isDue).toBe(true)
  })

  it('一般纳税人 — 2月需报增值税（月报），但企税非季末不报', () => {
    const result = determineTaxObligations('general_taxpayer', febPeriod, defaultModules)
    expect(result.find(o => o.key === 'vat')?.isDue).toBe(true)
    expect(result.find(o => o.key === 'cit')?.isDue).toBe(false)
    expect(result.find(o => o.key === 'iit')?.isDue).toBe(true)
  })

  it('小规模纳税人 — 增值税为季报', () => {
    const result = determineTaxObligations('small_scale_taxpayer', marchPeriod, defaultModules)
    expect(result.find(o => o.key === 'vat')?.frequency).toBe('quarterly')
    expect(result.find(o => o.key === 'vat')?.isDue).toBe(true)
  })

  it('有限合伙企业 — 不交企业所得税', () => {
    const result = determineTaxObligations('limited_partnership', marchPeriod, defaultModules)
    expect(result.find(o => o.key === 'cit')?.isDue).toBe(false)
    expect(result.find(o => o.key === 'cit')?.required).toBe(false)
    // 有限合伙也有增值税
    expect(result.find(o => o.key === 'vat')?.isDue).toBe(true)
  })

  it('印花税 — 默认不启用', () => {
    const result = determineTaxObligations('small_scale_taxpayer', marchPeriod, defaultModules)
    expect(result.find(o => o.key === 'stamp')).toBeUndefined()
  })

  it('印花税 — 启用后出现在列表中', () => {
    const modules = { ...defaultModules, stampDuty: true }
    const result = determineTaxObligations('small_scale_taxpayer', marchPeriod, modules)
    expect(result.find(o => o.key === 'stamp')?.isDue).toBe(true)
  })

  it('getDueObligations 只返回本期需要申报的税种', () => {
    const due = getDueObligations('general_taxpayer', febPeriod, defaultModules)
    const cit = due.find(o => o.key === 'cit')
    expect(cit).toBeUndefined() // 2月非季末，企税不报
    expect(due.length).toBeGreaterThan(0)
    due.forEach(o => {
      expect(o.isDue).toBe(true)
    })
  })

  it('各税种有大白话说明', () => {
    const result = determineTaxObligations('small_scale_taxpayer', marchPeriod, defaultModules)
    result.forEach(o => {
      expect(o.plainExplanation.length).toBeGreaterThan(5)
    })
  })
})
