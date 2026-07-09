import type { TaxpayerType, TaxPeriod, EnabledModules } from './types'

export interface TaxObligation {
  key: string
  name: string
  frequency: 'monthly' | 'quarterly' | 'annual'
  dueDate: string // e.g. "当月15日" or "季度末15日"
  isDue: boolean  // Whether it needs to be filed THIS period
  required: boolean // Always needed vs optional
  plainExplanation: string
}

/**
 * 根据纳税人类型和当期所属期，自动判断需要申报哪些税种
 */
export function determineTaxObligations(
  taxpayerType: TaxpayerType,
  period: TaxPeriod,
  modules: EnabledModules
): TaxObligation[] {
  const obligations: TaxObligation[] = []
  const { month } = period
  

  // 判断是否是季度末
  const isQuarterEnd = month % 3 === 0
  // 判断是否是季度初（企税在季度末申报，此处 isDue = true 表示"本期需要申报"）
  const isCitQuarter = month === 3 || month === 6 || month === 9 || month === 12

  // 增值税（一般纳税人月报，小规模季报）
  if (taxpayerType === 'general_taxpayer') {
    obligations.push({
      key: 'vat', name: '增值税', frequency: 'monthly',
      dueDate: '次月15日前', isDue: true,
      required: true,
      plainExplanation: '卖东西收的钱要交的税。一般纳税人每月都要报，可以用进货的发票抵减。',
    })
  } else if (taxpayerType === 'small_scale_taxpayer') {
    obligations.push({
      key: 'vat', name: '增值税', frequency: 'quarterly',
      dueDate: '季度末次月15日前', isDue: true,
      required: true,
      plainExplanation: '小规模纳税人按季度报，税率较低，但不能用进货发票抵税。',
    })
  } else if (taxpayerType === 'limited_partnership') {
    // 有限合伙企业如果是一般纳税人则月报，小规模季报，默认按季度
    obligations.push({
      key: 'vat', name: '增值税', frequency: 'quarterly',
      dueDate: '季度末次月15日前', isDue: true,
      required: false,
      plainExplanation: '有限合伙企业如果有经营收入也需要申报增值税。',
    })
  }

  // 附加税（跟随增值税）
  const hasVat = obligations.some(o => o.key === 'vat' && o.isDue)
  if (hasVat) {
    obligations.push({
      key: 'surtax', name: '附加税（城建税+教育费附加）', frequency: 'monthly',
      dueDate: '随增值税申报日', isDue: true,
      required: true,
      plainExplanation: '交了增值税就要交附加税，跟着增值税一起报。',
    })
  }

  // 个人所得税（工资薪金，月报）
  obligations.push({
    key: 'iit', name: '个人所得税（工资薪金）', frequency: 'monthly',
    dueDate: '次月15日前', isDue: true,
    required: true,
    plainExplanation: '从员工工资里代扣的个税，每个月都要在扣缴端申报。',
  })

  // 企业所得税（有限责任公司季报，有限合伙企业不交企税）
  if (taxpayerType === 'general_taxpayer' || taxpayerType === 'small_scale_taxpayer') {
    obligations.push({
      key: 'cit', name: '企业所得税', frequency: 'quarterly',
      dueDate: '季度末次月15日前', isDue: isCitQuarter,
      required: true,
      plainExplanation: '公司赚了钱要交的税。按季度预缴，年末汇算清缴。',
    })
  } else if (taxpayerType === 'limited_partnership') {
    // 有限合伙企业"先分后税"，合伙人自行申报，企业本身不交企税
    obligations.push({
      key: 'cit', name: '企业所得税', frequency: 'quarterly',
      dueDate: '—', isDue: false,
      required: false,
      plainExplanation: '有限合伙企业不交企业所得税。利润分给合伙人后，由合伙人自行申报。',
    })
  }

  // 社保费（月报，有员工就需要）
  obligations.push({
    key: 'social', name: '社保费', frequency: 'monthly',
    dueDate: '当月25日前', isDue: true,
    required: true,
    plainExplanation: '公司为员工交的五险（养老/医疗/失业/工伤/生育）。',
  })

  // 印花税（按次或按季）
  if (modules.stampDuty) {
    obligations.push({
      key: 'stamp', name: '印花税', frequency: 'quarterly',
      dueDate: '季度末次月15日前', isDue: isQuarterEnd,
      required: false,
      plainExplanation: '签订合同、账簿等要交的税，金额很小但别忘了。',
    })
  }

  return obligations
}

/**
 * 获取当期需要申报的税种列表（isDue = true）
 */
export function getDueObligations(
  taxpayerType: TaxpayerType,
  period: TaxPeriod,
  modules: EnabledModules
): TaxObligation[] {
  return determineTaxObligations(taxpayerType, period, modules).filter(o => o.isDue)
}

/**
 * 生成进度指引步骤
 */
export interface ProgressStage {
  key: string
  label: string
  description: string
}

export const ALL_STAGES: ProgressStage[] = [
  { key: 'register', label: '基础信息', description: '登记公司基本信息' },
  { key: 'import', label: '导入数据', description: '拖入银行流水、发票、工资表等' },
  { key: 'classify', label: '分类确认', description: '确认收入和支出分类是否正确' },
  { key: 'declare', label: '申报计算', description: '查看各税种计算结果并填报' },
  { key: 'closing', label: '结账销毁', description: '完成申报后销毁本地数据' },
]
