export const hunanConfig = {
  province: 'hunan' as const,
  name: '湖南省',
  surtax: {
    urbanConstruction: 0.07,
    educationSurcharge: 0.03,
    localEducationSurcharge: 0.02,
    halfReduction: true,
  },
  social: {
    pension: { company: 0.16, personal: 0.08 },
    medical: { company: 0.08, personal: 0.02 },
    injury: { company: 0.004, personal: 0 },
    unemployment: { company: 0.007, personal: 0.003 },
    housingFund: { company: 0.07, personal: 0.07 },
    baseLower: 4052,
    baseUpper: 20259,
    housingFundUpperMultiplier: 3,
  },
  stampDuty: {
    purchaseContract: 0.0003,
    salesContract: 0.0003,
    leaseContract: 0.001,
    bookkeeping: 0.00025,
    halfReduction: true,
  },
}

export type ProvinceConfig = typeof hunanConfig
