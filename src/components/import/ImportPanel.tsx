import { logger } from '../../utils/logger'
import { useCallback, useState, useMemo, useRef } from 'react'
import { useCompanyStore } from '../../stores/company'
import { useImportStore } from '../../stores/import'
import { useWorkbenchStore } from '../../stores/workbench'
import { detectFileCategory } from '../../engines/import/auto-detect'
import { determineTaxObligations } from '../../engines/tax-obligation'
import { downloadTemplate } from '../../engines/template-generator'
import { parseBankExcel } from '../../engines/import/bank-parser'
import { parseInvoiceExport } from '../../engines/import/invoice-parser'
import { parsePayroll } from '../../engines/import/payroll-parser'
import { parseExpense } from '../../engines/import/expense-parser'
import { parseReceivablesPayables } from '../../engines/import/rp-parser'
import { parseOfdFile } from '../../engines/import/ofd-parser'
import { parsePdfInvoice } from '../../engines/import/pdf-invoice-parser'
import { parseImageInvoice } from '../../engines/import/image-invoice-parser'
import type { FileCategory, InvoiceItem, BankTransaction, PayrollEntry, ExpenseItem, ReceivablesPayablesItem } from '../../engines/import/types'
import * as XLSX from 'xlsx'

const CATEGORY_LABELS: Record<FileCategory, string> = {
  bank_statement: '🏦 银行流水',
  invoice_export: '🧾 发票导出',
  invoice_original: '🧾 发票原件',
  payroll: '👤 工资表',
  expense: '📝 费用报销',
  receivables_payables: '📋 应收应付',
  previous_tax_data: '📊 往期报表',
  unknown: '❓ 未识别',
}

const TEMPLATES: { key: 'payroll' | 'expense' | 'rp' | 'bank'; label: string; desc: string }[] = [
  { key: 'payroll', label: '📄 工资表模板', desc: '姓名、身份证号、应发工资、专项附加扣除等' },
  { key: 'expense', label: '📄 费用报销模板', desc: '日期、类别、金额、摘要、发票情况等' },
  { key: 'rp', label: '📄 应收应付款模板', desc: '类型、对方名称、金额、发生日期、预计日期' },
  { key: 'bank', label: '📄 银行流水模板', desc: '交易日期、收入/支出金额、对方户名、摘要' },
]

async function readExcelRows(file: File): Promise<Record<string,any>[]> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  return XLSX.utils.sheet_to_json(sheet, { defval: '' })
}

function checkPeriodRelevance(
  fileName: string,
  companyYear: number,
  companyMonth: number
): { isCurrentPeriod: boolean; periodHint: string | null } {
  const nameLower = fileName.toLowerCase()
  const yearStr = String(companyYear)
  const monthStr = String(companyMonth).padStart(2, '0')
  const periodPatterns = [
    `${yearStr}年${monthStr}月`, `${yearStr}-${monthStr}`, `${yearStr}${monthStr}`,
  ]
  for (const p of periodPatterns) {
    if (nameLower.includes(p)) return { isCurrentPeriod: true, periodHint: `${companyYear}年${companyMonth}月` }
  }
  const prevYear = companyMonth === 1 ? companyYear - 1 : companyYear
  const prevMonth = companyMonth === 1 ? 12 : companyMonth - 1
  const prevPatterns = [
    `${prevYear}年${String(prevMonth).padStart(2, '0')}月`,
    `${prevYear}-${String(prevMonth).padStart(2, '0')}`,
    `${prevYear}${String(prevMonth).padStart(2, '0')}`,
  ]
  for (const p of prevPatterns) {
    if (nameLower.includes(p)) return { isCurrentPeriod: false, periodHint: `${prevYear}年${prevMonth}月` }
  }
  return { isCurrentPeriod: true, periodHint: null }
}

interface ParsedFile {
  name: string
  category: FileCategory
  periodInfo: { isCurrentPeriod: boolean; periodHint: string | null }
  parsedCount: number
  error?: string
}

export function ImportPanel() {
  const { setDetectedFiles, appendBankTransactions, appendInvoices, appendPayroll, appendExpenses, appendReceivablesPayables, markImported, hasImportedData } = useImportStore()
  const [dragOver, setDragOver] = useState(false)
  const [parsedFiles, setParsedFiles] = useState<ParsedFile[]>([])
  const [parsing, setParsing] = useState(false)
  const existingInvoices = useImportStore(s => s.invoices)
  const existingBank = useImportStore(s => s.bankTransactions)
  const existingPayroll = useImportStore(s => s.payroll)
  const existingExpenses = useImportStore(s => s.expenses)
  const existingRp = useImportStore(s => s.receivablesPayables)
  const company = useCompanyStore(s => s.company)
  const period = company?.period
  const fileStoreRef = useRef<{ invoices: InvoiceItem[]; bank: BankTransaction[]; payroll: PayrollEntry[]; expenses: ExpenseItem[]; rp: ReceivablesPayablesItem[] }>({
    invoices: [], bank: [], payroll: [], expenses: [], rp: [],
  })

  const obligations = useMemo(() => {
    if (!company) return []
    return determineTaxObligations(company.taxpayerType, company.period, company.modules)
  }, [company])

  const totalParsed = parsedFiles.reduce((s, f) => s + f.parsedCount, 0)

  const processFiles = useCallback(async (fileList: FileList) => {
    const files = Array.from(fileList)
    setParsing(true)
    setParsedFiles([])
    fileStoreRef.current = { invoices: [], bank: [], payroll: [], expenses: [], rp: [] }

    const companyYear = period?.year || new Date().getFullYear()
    const companyMonth = period?.month || new Date().getMonth() + 1

    const allInvoices: InvoiceItem[] = []
    const allBank: BankTransaction[] = []
    const allPayroll: PayrollEntry[] = []
    const allExpenses: ExpenseItem[] = []
    const allRp: ReceivablesPayablesItem[] = []
    const detected: ParsedFile[] = []
    const storeDetected: { name: string; category: FileCategory; confidence: number; preview: Record<string,string>[]; periodInfo: { isCurrentPeriod: boolean; periodHint: string | null } }[] = []

    for (const file of files) {
      const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
      const isExcel = ['.xlsx', '.xls', '.csv'].includes(ext)

      let headers: string[] | undefined
      let rows: Record<string,any>[] = []

      if (isExcel) {
        try {
          if (ext === '.csv') {
            try {
              rows = await readExcelRows(file)
            } catch (csvErr: any) {
              logger.error("Import", "CSV 解析失败", csvErr)
              // XLSX CSV 解析失败，尝试手动解析
              const text = await new Promise<string>((res, rej) => {
                const reader = new FileReader()
                reader.onload = () => res(reader.result as string)
                reader.onerror = () => rej(reader.error)
                reader.readAsText(file)
              })
              const lines = text.trim().split('\n')
              if (lines.length >= 2) {
                const hdrs = lines[0].split(',').map(h => h.trim())
                rows = lines.slice(1).map(line => {
                  const vals = line.split(',').map(v => v.trim())
                  const row: Record<string,any> = {}
                  hdrs.forEach((h, i) => { row[h] = vals[i] || '' })
                  return row
                }).filter(r => Object.values(r).some(v => v))
              }
            }
          } else {
            try {
              rows = await readExcelRows(file)
            } catch (xlsxErr: any) {
              logger.error("Import", "XLSX 解析失败", xlsxErr)
              // 非CSV文件解析失败
            }
          }
          if (rows.length > 0) headers = Object.keys(rows[0])
        } catch (e: any) {
          logger.error("Import", "文件读取失败: " + file.name, e)
          detected.push({ name: file.name, category: 'unknown', periodInfo: { isCurrentPeriod: true, periodHint: null }, parsedCount: 0, error: '无法读取文件' })
          continue
        }
      }

      const category = detectFileCategory(file.name, headers)
      const periodInfo = checkPeriodRelevance(file.name, companyYear, companyMonth)
      let parsedCount = 0
      let error: string | undefined

      try {
        if (category === 'invoice_export' && rows.length > 0) {
          const invoices = parseInvoiceExport(rows, company?.fullName)
          allInvoices.push(...invoices)
          parsedCount = invoices.length
          if (invoices.length === 0) error = '未识别到发票数据'
        } else if (category === 'bank_statement' && rows.length > 0) {
          const txns = parseBankExcel(rows)
          allBank.push(...txns)
          parsedCount = txns.length
          if (txns.length === 0) error = '未识别到银行流水'
        } else if (category === 'payroll' && rows.length > 0) {
          const payroll = parsePayroll(rows)
          allPayroll.push(...payroll)
          parsedCount = payroll.length
          if (payroll.length === 0) error = '未识别到工资数据'
        } else if (category === 'expense' && rows.length > 0) {
          const expenses = parseExpense(rows)
          allExpenses.push(...expenses)
          parsedCount = expenses.length
          if (expenses.length === 0) error = '未识别到费用报销数据'
        } else if (category === 'receivables_payables' && rows.length > 0) {
          const rp = parseReceivablesPayables(rows)
          allRp.push(...rp)
          parsedCount = rp.length
          if (rp.length === 0) error = '未识别到应收应付数据'
        } else if (category === 'invoice_original') {
          const isOfd = ext === '.ofd'
          const isImage = ['.jpg', '.jpeg', '.png', '.bmp', '.webp'].includes(ext)
          const isPdf = ext === '.pdf'
          if (isOfd) {
            const ofdInvoices = await parseOfdFile(file)
            allInvoices.push(...ofdInvoices)
            parsedCount = ofdInvoices.length
          } else if (isPdf) {
            const pdfInvoices = await parsePdfInvoice(file)
            allInvoices.push(...pdfInvoices)
            parsedCount = pdfInvoices.length
          } else if (isImage) {
            try {
              const imageInvoices = await parseImageInvoice(file)
              allInvoices.push(...imageInvoices)
              parsedCount = imageInvoices.length
              if (imageInvoices.length === 0) error = 'OCR 未识别到发票信息，请确保图片清晰'
            } catch (ocrErr: any) {
              logger.error("Import", "OCR 识别失败: " + file.name, ocrErr)
              error = 'OCR 识别失败，建议导出为 Excel 格式导入'
            }
          } else {
            error = '暂不支持此格式'
          }
          if (parsedCount === 0 && !error) error = '未识别到发票信息'
        }
      } catch (e: any) {
        const msg = e?.message || (typeof e === 'object' ? JSON.stringify(e) : String(e)) || '未知错误'
        logger.error("Import", `解析出错: ${file.name} — ${msg}`, e)
        error = `解析出错：${msg}`
        if (e?.stack) error += " (详情见调试面板)"
      }

      detected.push({ name: file.name, category, periodInfo, parsedCount, error })
      storeDetected.push({
        name: file.name, category, confidence: rows.length > 0 ? 0.9 : 0.5, preview: rows.slice(0, 3), periodInfo,
      })
    }

    fileStoreRef.current = { invoices: allInvoices, bank: allBank, payroll: allPayroll, expenses: allExpenses, rp: allRp }
    setDetectedFiles(storeDetected)
    setParsedFiles(detected)
    setParsing(false)
  }, [period, company, setDetectedFiles])

  /** 遍历文件夹获取所有文件（递归） */
  async function collectFilesFromItems(items: DataTransferItemList): Promise<File[]> {
    const files: File[] = []
    const entries: FileSystemEntry[] = []
    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry()
      if (entry) entries.push(entry)
    }
    for (const entry of entries) {
      await traverseEntry(entry, files)
    }
    return files
  }

  async function traverseEntry(entry: FileSystemEntry, files: File[]): Promise<void> {
    if (entry.isFile) {
      const fileEntry = entry as FileSystemFileEntry
      return new Promise((resolve) => {
        fileEntry.file((f) => { files.push(f); resolve() }, () => resolve())
      })
    }
    if (entry.isDirectory) {
      const dirEntry = entry as FileSystemDirectoryEntry
      const reader = dirEntry.createReader()
      const entries = await new Promise<FileSystemEntry[]>((resolve) => {
        reader.readEntries((results) => resolve(results))
      })
      for (const child of entries) {
        await traverseEntry(child, files)
      }
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const dt = e.dataTransfer
    if (dt.items && dt.items.length > 0 && dt.items[0].kind === 'file') {
      // 支持文件夹拖入
      collectFilesFromItems(dt.items).then((files) => {
        if (files.length > 0) {
          const dt2 = new DataTransfer()
          files.forEach(f => dt2.items.add(f))
          processFiles(dt2.files)
        }
      })
    } else if (dt.files.length > 0) {
      processFiles(dt.files)
    }
  }, [processFiles])

  const setStage = useWorkbenchStore(s => s.setStage)

  const handleConfirmImport = () => {
    const store = fileStoreRef.current
    if (store.invoices.length > 0) appendInvoices(store.invoices)
    if (store.bank.length > 0) appendBankTransactions(store.bank)
    if (store.payroll.length > 0) appendPayroll(store.payroll)
    if (store.expenses.length > 0) appendExpenses(store.expenses)
    if (store.rp.length > 0) appendReceivablesPayables(store.rp)
    markImported()
    setStage('classify')
  }

  return (
    <div className="space-y-4">
      {company && obligations.filter(o => o.isDue).length > 0 && (
        <div className="bg-blue-50 rounded-xl p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">
            📋 本期（{period?.year || '—'}年{period?.month || '—'}月）需要申报的税种
          </h3>
          <div className="flex flex-wrap gap-2">
            {obligations.filter(o => o.isDue).map(ob => (
              <span key={ob.key}
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700"
                title={ob.plainExplanation}
              >
                {ob.name}
                {ob.frequency === 'monthly' && <span className="ml-1 text-blue-400">·月报</span>}
                {ob.frequency === 'quarterly' && <span className="ml-1 text-blue-400">·季报</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6 bg-amber-50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-amber-800">📥 先下载模板填写数据</h3>
          <span className="text-xs text-amber-500">填好后拖入下方区域即可识别</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TEMPLATES.map(t => (
            <button key={t.key} onClick={() => downloadTemplate(t.key)}
              className="text-left px-3 py-2.5 rounded-lg bg-white border border-amber-200
                hover:border-amber-400 hover:bg-amber-50 transition-colors text-xs"
            >
              <span className="font-medium text-slate-800 block">{t.label}</span>
              <span className="text-slate-400 block mt-0.5 leading-tight">{t.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          dragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-300'
        }`}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <p className="text-sm text-slate-500">
          📁 把文件夹或多文件拖入，自动识别类型
        </p>
        <p className="text-xs text-slate-400 mt-1">
          支持 CSV / Excel / PDF / OFD / JPG / PNG
        </p>
        <label className="mt-3 inline-block px-4 py-1.5 text-sm rounded-lg border border-slate-300 cursor-pointer hover:bg-slate-50">
          选择文件
          <input type="file" multiple className="hidden"
            onChange={e => e.target.files && processFiles(e.target.files)} />
        </label>
      </div>

      {parsing && (
        <div className="text-center py-4">
          <p className="text-sm text-blue-600">⏳ 正在解析文件...</p>
        </div>
      )}

      {parsedFiles.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">
              已解析 {parsedFiles.length} 个文件
            </span>
            <span className="text-xs text-blue-600">
              本次识别 {totalParsed} 条数据{hasImportedData ? "（追加）" : ""}
            </span>
          </div>
          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {parsedFiles.map((f, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {f.error ? (
                    <span className="text-amber-500 shrink-0" title={f.error}>⚠️</span>
                  ) : f.parsedCount > 0 ? (
                    <span className="text-green-500 shrink-0">✓</span>
                  ) : (
                    <span className="text-slate-300 shrink-0">○</span>
                  )}
                  <span className="text-slate-600 truncate">{f.name}</span>
                  {f.parsedCount > 0 && (
                    <span className="text-xs text-slate-400 shrink-0">{f.parsedCount} 条</span>
                  )}
                  {f.error && (
                    <span className="text-xs text-amber-500 shrink-0 max-w-[200px] truncate" title={f.error}>{f.error}</span>
                  )}
                </div>
                <span className={`ml-2 px-2 py-0.5 rounded text-xs shrink-0 ${
                  f.category === 'unknown' ? 'bg-yellow-100 text-yellow-700' :
                  f.error ? 'bg-amber-50 text-amber-600' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {CATEGORY_LABELS[f.category]}
                  {f.error && ' ⚠'}
                </span>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-slate-100 space-y-2">
            {parsedFiles.some(f => f.error) && (
              <p className="text-xs text-amber-600">
                ⚠️ 部分文件未能自动解析。发票原件（OFD/PDF/图片）建议先从税务系统导出为 Excel 格式再导入。
              </p>
            )}
            <button onClick={handleConfirmImport}
              className="w-full py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm"
            >
              {totalParsed > 0
                ? `全部确认导入（${totalParsed} 条数据）→`
                : '跳过，暂无可用数据 →'}
            </button>
          </div>
        </div>
      )}

      {hasImportedData && parsedFiles.length === 0 && (
        <div className="bg-green-50 rounded-xl p-4 text-center mb-4">
          <p className="text-sm text-green-700 font-medium">✅ 数据已导入完成</p>
          <p className="text-xs text-green-600 mt-1">
            已导入 {existingInvoices.length + existingBank.length + existingPayroll.length + existingExpenses.length + existingRp.length} 条数据
            {existingInvoices.length > 0 && `（发票 ${existingInvoices.length}）`}
            {existingBank.length > 0 && `（银行 ${existingBank.length}）`}
            {existingPayroll.length > 0 && `（工资 ${existingPayroll.length}）`}
            {existingExpenses.length > 0 && `（费用 ${existingExpenses.length}）`}
            {existingRp.length > 0 && `（应收应付 ${existingRp.length}）`}
          </p>
          <p className="text-xs text-green-500 mt-2">如需补充文件，直接拖入下方区域</p>
        </div>
      )}

    </div>
  )
}

