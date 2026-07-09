import type { Money } from '../types'
import type { SurtaxResult } from './types'
import type { ProvinceConfig } from '../../data/provinces/hunan'

export function calcSurtax(vatPayable: Money, config: ProvinceConfig): SurtaxResult {
  const uc = vatPayable * config.surtax.urbanConstruction
  const es = vatPayable * config.surtax.educationSurcharge
  const les = vatPayable * config.surtax.localEducationSurcharge
  const total = uc + es + les

  if (config.surtax.halfReduction) {
    return {
      urbanConstruction: Math.round(uc * 50) / 100,
      educationSurcharge: Math.round(es * 50) / 100,
      localEducationSurcharge: Math.round(les * 50) / 100,
      total: Math.round(total * 50) / 100,
      reduced: true,
    }
  }

  return {
    urbanConstruction: Math.round(uc * 100) / 100,
    educationSurcharge: Math.round(es * 100) / 100,
    localEducationSurcharge: Math.round(les * 100) / 100,
    total: Math.round(total * 100) / 100,
    reduced: false,
  }
}
