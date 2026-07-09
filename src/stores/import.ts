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
  isImportComplete: boolean
  setDetectedFiles: (f: DetectedFile[]) => void
  setBankTransactions: (t: BankTransaction[]) => void
  setInvoices: (i: InvoiceItem[]) => void
  setPayroll: (p: PayrollEntry[]) => void
  setExpenses: (e: ExpenseItem[]) => void
  setReceivablesPayables: (r: ReceivablesPayablesItem[]) => void
  setPreviousData: (d: PreviousTaxData | null) => void
  setImportComplete: (v: boolean) => void
  clearAll: () => void
}

export const useImportStore = create<ImportState>((set) => ({
  detectedFiles: [], bankTransactions: [], invoices: [],
  payroll: [], expenses: [], receivablesPayables: [],
  previousData: null, isImportComplete: false,
  setDetectedFiles: (f) => set({ detectedFiles: f }),
  setBankTransactions: (t) => set({ bankTransactions: t }),
  setInvoices: (i) => set({ invoices: i }),
  setPayroll: (p) => set({ payroll: p }),
  setExpenses: (e) => set({ expenses: e }),
  setReceivablesPayables: (r) => set({ receivablesPayables: r }),
  setPreviousData: (d) => set({ previousData: d }),
  setImportComplete: (v) => set({ isImportComplete: v }),
  clearAll: () => set({
    detectedFiles: [], bankTransactions: [], invoices: [],
    payroll: [], expenses: [], receivablesPayables: [],
    previousData: null, isImportComplete: false,
  }),
}))
