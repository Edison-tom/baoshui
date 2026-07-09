import type { Money } from '../types'

export interface FixedAsset {
  name: string; originalValue: Money
  purchaseDate: string; usefulLifeYears: number
  residualRate?: number  // 残值率 默认 5%
}

export interface DepreciationEntry {
  name: string; originalValue: Money
  monthlyDepreciation: Money; accumulatedDepreciation: Money
  currentMonthDepreciation: Money; netValue: Money
}

export const DEFAULT_DEPRECIATION_YEARS: Record<string, number> = {
  '房屋建筑物': 20, '机器设备': 10, '电子设备': 3,
  '运输工具': 4, '办公家具': 5, '其他': 5,
}

export function calcDepreciation(
  assets: FixedAsset[],
  currentMonth: number
): DepreciationEntry[] {
  return assets.map(a => {
    const residualRate = a.residualRate ?? 0.05
    const residualValue = a.originalValue * residualRate
    const depreciableValue = a.originalValue - residualValue
    const monthlyDep = depreciableValue / (a.usefulLifeYears * 12)
    const roundedMonthly = Math.round(monthlyDep * 100) / 100
    const accumulated = roundedMonthly * currentMonth
    const netValue = a.originalValue - accumulated

    return {
      name: a.name, originalValue: a.originalValue,
      monthlyDepreciation: roundedMonthly,
      accumulatedDepreciation: Math.round(accumulated * 100) / 100,
      currentMonthDepreciation: roundedMonthly,
      netValue: Math.max(0, Math.round(netValue * 100) / 100),
    }
  })
}
