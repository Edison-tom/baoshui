import type { TaxPeriod, TaxpayerType } from './types'

/**
 * 根据当天日期自动推算当前所属期
 * @param type - 纳税人类型（影响季度月报判断）
 * @param now  - 测试用，默认当天
 */
export function inferCurrentPeriod(
  type?: TaxpayerType,
  now: Date = new Date()
): TaxPeriod {
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  // 小规模纳税人/有限合伙企业/个体户等 → 季度申报（增值税季报）
  const isQuarterlyType =
    type === 'small_scale_taxpayer' ||
    type === 'limited_partnership' ||
    type === 'individual_business' ||
    type === 'sole_proprietorship'

  if (isQuarterlyType) {
    const quarter = Math.ceil(month / 3)
    const qStartMonth = quarter * 3 - 2
    const qEndMonth = quarter * 3
    // 季度所属期，startDate/endDate 填写申报对应起止
    return {
      year,
      month: qEndMonth, // 申报月在季度末
      quarter,
      startDate: `${year}-${String(qStartMonth).padStart(2, '0')}-01`,
      endDate: `${year}-${String(qEndMonth).padStart(2, '0')}-${new Date(year, qEndMonth, 0).getDate()}`,
    }
  }

  // 一般纳税人 → 月报
  return {
    year,
    month,
    startDate: `${year}-${String(month).padStart(2, '0')}-01`,
    endDate: `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`,
  }
}

/**
 * 获取所属期可读描述
 */
export function formatPeriod(period: TaxPeriod): string {
  if (period.quarter) return `${period.year}年第${period.quarter}季度`
  return `${period.year}年${period.month}月`
}

/**
 * 获取申报截止日描述
 */
export function getDueDateHint(period: TaxPeriod): string {
  const isQuarterly = !!period.quarter
  // 增值税一般纳税人月报 → 次月15日
  // 小规模季报 → 季度末次月15日
  return isQuarterly
    ? `申报截止日：${period.year}年${period.month + 1}月15日`
    : `申报截止日：${period.year}年${period.month + 1}月15日`
}

/**
 * 计算距离截止日还剩几天
 */
export function getDaysUntilDue(period: TaxPeriod): number {
  const dueMonth = period.month + 1
  const dueYear = dueMonth > 12 ? period.year + 1 : period.year
  const dueMonthAdjusted = dueMonth > 12 ? 1 : dueMonth
  const due = new Date(dueYear, dueMonthAdjusted - 1, 15)
  const now = new Date()
  const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return diff
}
