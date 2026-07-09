import type { AccountSubject } from '../../engines/types'

export interface KeywordRule {
  keywords: string[]; subject: AccountSubject; priority: number
}

export const KEYWORD_RULES: KeywordRule[] = [
  { keywords: ['货款','销售收入','服务费','营业收入','销货款'], subject: 'main_revenue', priority: 10 },
  { keywords: ['其他业务收入','废料收入'], subject: 'other_revenue', priority: 9 },
  { keywords: ['采购','进货','购货款','原料','材料款'], subject: 'main_cost', priority: 10 },
  { keywords: ['房租','租赁','物业','水电','办公用品','差旅','快递','维修'],
    subject: 'mgmt_expense', priority: 8 },
  { keywords: ['广告','推广','宣传','招待','佣金','展览'], subject: 'sales_expense', priority: 8 },
  { keywords: ['利息','手续费','汇兑'], subject: 'finance_expense', priority: 8 },
  { keywords: ['缴税','税金','税务局','税务'], subject: 'tax_payment', priority: 9 },
  { keywords: ['工资','薪酬','代发'], subject: 'salary', priority: 10 },
  { keywords: ['社保','保险费','公积金'], subject: 'social_insurance', priority: 10 },
  { keywords: ['罚款','滞纳金','赔偿','违约金'], subject: 'non_operating_expense', priority: 7 },
  { keywords: ['政府补贴','补助','奖励'], subject: 'non_operating_income', priority: 8 },
  { keywords: ['借款','贷款','借出','借入'], subject: 'loan_borrow', priority: 7 },
  { keywords: ['还款','还贷'], subject: 'loan_repay', priority: 7 },
  { keywords: ['设备','机器','电脑','固定资产','车辆'], subject: 'fixed_asset', priority: 4 },
  { keywords: ['赠送','样品','福利发放','领用'], subject: 'mgmt_expense', priority: 5 },
]

export const COUNTERPARTY_RULES: { patterns: string[]; subject: AccountSubject }[] = [
  { patterns: ['税务','税务局'], subject: 'tax_payment' },
  { patterns: ['社保','公积金'], subject: 'social_insurance' },
  { patterns: ['物业','物业公司'], subject: 'mgmt_expense' },
  { patterns: ['银行','贷款','信贷'], subject: 'finance_expense' },
]

export const INTERNAL_TRANSFER_KEYWORDS = ['转账','划转','转存','同名','本行','同户']
export const DEEMED_SALE_KEYWORDS = ['赠送','样品','福利','试用','捐赠']
export const INPUT_TRANSFER_KEYWORDS = ['福利','个人消费','集体福利','个人','餐饮']
export const DUTY_FREE_KEYWORDS = ['免税','出口','境外','保税']

export const TAX_PAYMENT_KEYWORDS = ['税务','税务局','缴税','税款','增值税','所得税']
export const LOAN_KEYWORDS = ['贷款','借款','信贷','贷入']
export const SALARY_KEYWORDS = ['工资','薪金','薪酬','劳务费']
export const SOCIAL_INSURANCE_KEYWORDS = ['社保','养老保险','医疗保险','失业保险','工伤保险','生育保险','公积金']
export const LOAN_REPAYMENT_KEYWORDS = ['还贷','还款','偿还','归还贷款']
