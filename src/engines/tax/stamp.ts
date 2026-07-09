import type { Money } from '../types'
import type { ClassificationResult } from '../classify/types'
import type { StampDutyResult } from './types'
import type { ProvinceConfig } from '../../data/provinces/hunan'

export function calcStampDuty(
  classification: ClassificationResult,
  leaseAmount: Money = 0,
  config: ProvinceConfig
): StampDutyResult {
  const revenue = classification.incomeEntries.reduce((s, e) => s + e.amount, 0)
  const cost = classification.costEntries.reduce((s, e) => s + Math.abs(e.amount), 0)

  const sd = config.stampDuty
  const purchase = cost * sd.purchaseContract
  const sales = revenue * sd.salesContract
  const lease = leaseAmount * sd.leaseContract
  const bookkeeping = 0  // 营业账簿默认0
  const total = purchase + sales + lease + bookkeeping

  const result: StampDutyResult = {
    purchaseContract: Math.round(purchase * 100) / 100,
    salesContract: Math.round(sales * 100) / 100,
    leaseContract: Math.round(lease * 100) / 100,
    bookkeeping, total: Math.round(total * 100) / 100,
    reduced: false,
  }

  if (sd.halfReduction) {
    result.reducedTotal = Math.round(total * 50) / 100
    result.reduced = true
  }

  return result
}
