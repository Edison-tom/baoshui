import type { CompanyInfo } from '../types'
import type { CitResult } from '../tax/types'

export interface IncentiveResult {
  smallLowProfit: boolean
  sixTaxTwoFeeHalf: boolean
  smallScaleVatFree: boolean
  rdSuperDeduction: boolean
  fixedAssetImmediateDeduction: boolean
  details: string[]
}

export function checkIncentives(
  company: CompanyInfo,
  citResult: CitResult,
  quarterlyRevenue: number
): IncentiveResult {
  const details: string[] = []

  const smallLowProfit = citResult.isSmallLowProfit
  if (smallLowProfit) details.push('小型微利企业：企业所得税税率减至5%')

  const sixTaxTwoFeeHalf =
    company.vatQualification === 'small_scale' || smallLowProfit
  if (sixTaxTwoFeeHalf) details.push('六税两费减半：城建税/教育附加/印花税等减半征收')

  const smallScaleVatFree =
    company.vatQualification === 'small_scale' && quarterlyRevenue <= 300000
  if (smallScaleVatFree) details.push('小规模免税：季度普票收入≤30万免征增值税')

  const rdSuperDeduction = company.modules.rdExpense
  if (rdSuperDeduction) details.push('研发费用加计扣除：研发费用×100%加计扣除（可选模块）')

  const fixedAssetImmediateDeduction = company.modules.fixedAssets
  if (fixedAssetImmediateDeduction) details.push('固定资产一次性扣除：≤500万设备可当年全额扣除（可选）')

  return {
    smallLowProfit, sixTaxTwoFeeHalf, smallScaleVatFree,
    rdSuperDeduction, fixedAssetImmediateDeduction, details,
  }
}
