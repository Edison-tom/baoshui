import { create } from 'zustand'
import type {
  BankTransaction, InvoiceItem, PayrollEntry,
  ExpenseItem, ReceivablesPayablesItem, DetectedFile, PreviousTaxData
} from '../engines/import/types'

interface ImportState {
  detectedFiles: DetectedFile[]
  bankTransactions: BankTransaction[]
  invoices: InvoiceItem[]
  payroll: PayrollEntry[]
  expenses: ExpenseItem[]
  receivablesPayables: ReceivablesPayablesItem[]
  previousData: PreviousTaxData | null
  hasImportedData: boolean
  setDetectedFiles: (f: DetectedFile[]) => void
  setBankTransactions: (t: BankTransaction[]) => void
  appendBankTransactions: (t: BankTransaction[]) => void
  setInvoices: (i: InvoiceItem[]) => void
  appendInvoices: (i: InvoiceItem[]) => void
  setPayroll: (p: PayrollEntry[]) => void
  appendPayroll: (p: PayrollEntry[]) => void
  setExpenses: (e: ExpenseItem[]) => void
  appendExpenses: (e: ExpenseItem[]) => void
  setReceivablesPayables: (r: ReceivablesPayablesItem[]) => void
  appendReceivablesPayables: (r: ReceivablesPayablesItem[]) => void
  setPreviousData: (d: PreviousTaxData | null) => void
  markImported: () => void
  clearAll: () => void
}

export const useImportStore = create<ImportState>((set) => ({
  detectedFiles: [], bankTransactions: [], invoices: [],
  payroll: [], expenses: [], receivablesPayables: [],
  previousData: null, hasImportedData: false,
  setDetectedFiles: (f) => set({ detectedFiles: f }),
  setBankTransactions: (t) => set({ bankTransactions: t }),
  appendBankTransactions: (t) => set(s => ({ bankTransactions: [...s.bankTransactions, ...t] })),
  setInvoices: (i) => set({ invoices: i }),
  appendInvoices: (i) => set(s => ({ invoices: [...s.invoices, ...i] })),
  setPayroll: (p) => set({ payroll: p }),
  appendPayroll: (p) => set(s => ({ payroll: [...s.payroll, ...p] })),
  setExpenses: (e) => set({ expenses: e }),
  appendExpenses: (e) => set(s => ({ expenses: [...s.expenses, ...e] })),
  setReceivablesPayables: (r) => set({ receivablesPayables: r }),
  appendReceivablesPayables: (r) => set(s => ({ receivablesPayables: [...s.receivablesPayables, ...r] })),
  setPreviousData: (d) => set({ previousData: d }),
  markImported: () => set({ hasImportedData: true }),
  clearAll: () => set({
    detectedFiles: [], bankTransactions: [], invoices: [],
    payroll: [], expenses: [], receivablesPayables: [],
    previousData: null, hasImportedData: false,
  }),
}))
