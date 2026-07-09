export type TaxpayerType =
  | 'general_taxpayer'
  | 'small_scale_taxpayer'
  | 'limited_partnership'
  | 'sole_proprietorship'
  | 'individual_business'

export type CollectionMethod = 'audit' | 'deemed' | 'fixed_amount'
export type VatQualification = 'general' | 'small_scale'
export type Province = 'hunan'

export type AccountSubject =
  | 'main_revenue' | 'other_revenue' | 'main_cost'
  | 'mgmt_expense' | 'sales_expense' | 'finance_expense'
  | 'tax_surcharge' | 'non_operating_income' | 'non_operating_expense'
  | 'receivable' | 'payable' | 'internal_transfer'
  | 'loan_borrow' | 'loan_repay' | 'salary'
  | 'social_insurance' | 'tax_payment' | 'fixed_asset'
  | 'uncategorized'

export interface TaxPeriod {
  year: number; month: number; quarter?: number
  startDate: string; endDate: string
}

export interface EnabledModules {
  fixedAssets: boolean; amortization: boolean; rdExpense: boolean
  yearEndBonus: boolean; intangibleAssets: boolean; stampDuty: boolean
  simpleTax: boolean; dutyFreeIncome: boolean
}

export interface BankAccount {
  bankName: string; accountNumber: string; accountType: 'basic'|'general'|'other'
}

export interface CompanyInfo {
  fullName: string
  taxpayerType: TaxpayerType; province: Province
  collectionMethod: CollectionMethod; vatQualification: VatQualification
  modules: EnabledModules; bankAccounts: BankAccount[]; period: TaxPeriod
}

export type Money = number
