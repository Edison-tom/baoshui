import type { Money } from '../types'

export interface VatResult {
  taxableSales: Money; generalInvoiceSales: Money; specialInvoiceSales: Money
  outputTax: Money; inputTax: Money; inputTransferOut: Money
  deductibleInput: Money; taxPayable: Money; effectiveRate: number
}

export interface SurtaxResult {
  urbanConstruction: Money; educationSurcharge: Money
  localEducationSurcharge: Money; total: Money; reduced: boolean
}

export interface IitEntry {
  name: string; idNumber: string
  cumulativeIncome: Money; cumulativeDeduction: Money
  cumulativeTaxable: Money; cumulativeTax: Money
  previouslyPaid: Money; currentPayable: Money
  taxRate: number; quickDeduction: Money
}

export interface IitResult { entries: IitEntry[]; totalPayable: Money }

export interface CitResult {
  revenue: Money; cost: Money; profit: Money; actualProfit: Money
  taxBase: Money; nominalRate: number; effectiveRate: number
  taxPayable: Money; previouslyPaid: Money; currentPayable: Money
  isSmallLowProfit: boolean; incentiveDetail: string[]
}

export interface SocialEntry {
  name: string; base: Money
  pension: { company:Money; personal:Money }
  medical: { company:Money; personal:Money }
  injury: { company:Money }
  unemployment: { company:Money; personal:Money }
  housingFund: { company:Money; personal:Money }
}

export interface SocialResult { entries: SocialEntry[]; companyTotal: Money; personalTotal: Money }

export interface StampDutyResult {
  purchaseContract: Money; salesContract: Money; leaseContract: Money
  bookkeeping: Money; total: Money; reducedTotal?: Money; reduced: boolean
}
