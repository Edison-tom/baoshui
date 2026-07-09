export type FileCategory =
  | 'bank_statement'
  | 'invoice_export'
  | 'invoice_original'
  | 'payroll'
  | 'expense'
  | 'receivables_payables'
  | 'previous_tax_data'
  | 'unknown'

export interface DetectedFile {
  name: string
  category: FileCategory
  confidence: number
  preview: Record<string, string>[]
  periodInfo?: {
    isCurrentPeriod: boolean
    periodHint: string | null
  }
}

// 银行流水 — 兼容解析器输出 + 引擎所需字段
export interface BankTransaction {
  id?: string
  date: string
  amount: number
  counterparty: string
  summary?: string
  bankAccount?: string
  balance?: number
  description?: string
  accountNumber?: string
}

// 发票 — 兼容解析器输出 + 引擎所需字段
export interface InvoiceItem {
  id?: string
  invoiceNo?: string
  invoiceCode?: string
  invoiceNumber?: string
  date?: string
  issueDate?: string
  sellerName?: string
  buyerName?: string
  amount: number
  taxAmount: number
  totalAmount: number
  taxRate?: number
  type?: 'special' | 'plain' | 'export' | 'original'
  invoiceType?: 'special' | 'general'
  isPurchase?: boolean
  category?: string
}

// 工资表 — 兼容解析器输出 + 引擎所需字段
export interface PayrollEntry {
  employeeName?: string
  name?: string
  idCard?: string
  idNumber?: string
  grossPay?: number
  grossSalary?: number
  socialInsurance?: number
  socialBase?: number
  housingFund?: number
  housingFundBase?: number
  taxableIncome?: number
  taxWithheld?: number
  netPay?: number
  // 人员类型 — 引擎用 regular/temporary/outsourced，解析器用 labor/bonus/formal
  type?: 'regular' | 'temporary' | 'outsourced'
  employeeType?: string | 'regular' | 'temporary' | 'outsourced' | 'labor' | 'bonus' | 'formal'
  // 专项附加扣除
  childrenEdu?: number
  continuingEdu?: number
  seriousIllness?: number
  housingLoan?: number
  housingRent?: number
  elderlySupport?: number
  infantCare?: number
  personalPension?: number
  commercialHealthIns?: number
  enterpriseAnnuity?: number
}

// 费用报销 — 兼容解析器输出
export interface ExpenseItem {
  date: string
  amount: number
  category: string
  summary?: string
  hasInvoice?: boolean
  isCrossPeriod?: boolean
  crossPeriodMonths?: number
  accountSubject?: string
  description?: string
  receiptType?: string
  department?: string
}

// 应收应付
export interface ReceivablesPayablesItem {
  counterparty: string
  type: 'receivable' | 'payable'
  amount: number
  dueDate?: string
  date?: string
  expectedDate?: string
  summary?: string
  status?: 'pending' | 'overdue' | 'settled'
  description?: string
}

// 往期税务数据
export interface PreviousTaxData {
  period: string
  year: number
  month: number
  revenue: number
  cost: number
  profit: number
  vatPaid: number
  citPaid: number
  iitPaid: number
  socialPaid: number
  surtaxPaid: number
  balanceSheet?: Record<string, number>
}
