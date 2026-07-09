import { useCallback, useState, useMemo } from 'react'
import { useCompanyStore } from '../../stores/company'
import { useImportStore } from '../../stores/import'
import { detectFileCategory } from '../../engines/import/auto-detect'
import { determineTaxObligations } from '../../engines/tax-obligation'
import { downloadTemplate } from '../../engines/template-generator'
import type { FileCategory } from '../../engines/import/types'
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

/** 检查文件名或内容是否包含当期年份/月份 */
function checkPeriodRelevance(
  fileName: string,
  headers: string[] | undefined,
  companyYear: number,
  companyMonth: number
): { isCurrentPeriod: boolean; periodHint: string | null } {
  const nameLower = fileName.toLowerCase()
  const yearStr = String(companyYear)
  const monthStr = String(companyMonth).padStart(2, '0')

  const periodPatterns = [
    `${yearStr}年${monthStr}月`,
    `${yearStr}-${monthStr}`,
    `${yearStr}${monthStr}`,
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

  if (headers) {
    const dateHeaders = headers.filter(h =>
      /日期|日期|时间|date|期间|所属期|年月/i.test(h)
    )
    if (dateHeaders.length > 0) {
      return { isCurrentPeriod: true, periodHint: null }
    }
  }

  return { isCurrentPeriod: true, periodHint: null }
}

export function ImportPanel() {
  const { detectedFiles, setDetectedFiles, isImportComplete } = useImportStore()
  const [dragOver, setDragOver] = useState(false)
  const company = useCompanyStore(s => s.company)
  const period = company?.period

  // 当期应报税种
  const obligations = useMemo(() => {
    if (!company) return []
    return determineTaxObligations(company.taxpayerType, company.period, company.modules)
  }, [company])

  // 统计文件期间信息
  const periodSummary = useMemo(() => {
    if (detectedFiles.length === 0) return null
    const currentPeriod = detectedFiles.filter((f: any) => f.periodInfo?.isCurrentPeriod !== false).length
    return {
      total: detectedFiles.length,
      currentPeriod,
      notCurrent: detectedFiles.length - currentPeriod,
    }
  }, [detectedFiles])

  const processFiles = useCallback(async (fileList: FileList) => {
    const files = Array.from(fileList)
    const companyYear = period?.year || new Date().getFullYear()
    const companyMonth = period?.month || new Date().getMonth() + 1

    const detected = await Promise.all(files.map(async (file) => {
      let headers: string[] | undefined
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
        try {
          const buffer = await file.arrayBuffer()
          const workbook = XLSX.read(buffer, { type: 'array' })
          const sheet = workbook.Sheets[workbook.SheetNames[0]]
          const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 })
          headers = (rows[0] as string[])?.map(String) || []
        } catch {}
      }

      const category = detectFileCategory(file.name, headers)
      const periodInfo = checkPeriodRelevance(file.name, headers, companyYear, companyMonth)
      return {
        name: file.name,
        category,
        confidence: headers ? 0.9 : 0.5,
        preview: [] as Record<string, string>[],
        periodInfo,
      }
    }))

    setDetectedFiles(detected)
  }, [period, setDetectedFiles])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length > 0) processFiles(e.dataTransfer.files)
  }, [processFiles])

  if (isImportComplete) {
    return (
      <div className="bg-green-50 rounded-xl p-4">
        <p className="text-sm text-green-700">✅ 数据导入完成</p>
      </div>
    )
  }

  return (
    <div>
      {/* 当期应报税种提示 */}
      {obligations.filter(o => o.isDue).length > 0 && (
        <div className="mb-6 bg-blue-50 rounded-xl p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">
            📋 本期（{period?.year || '—'}年{period?.month || '—'}月）需要申报的税种
          </h3>
          <div className="flex flex-wrap gap-2">
            {obligations.filter(o => o.isDue).map(ob => (
              <span
                key={ob.key}
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

      {/* 模板下载区 */}
      <div className="mb-6 bg-amber-50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-amber-800">📥 先下载模板填写数据</h3>
          <span className="text-xs text-amber-500">填好后拖入下方区域即可识别</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TEMPLATES.map(t => (
            <button
              key={t.key}
              onClick={() => downloadTemplate(t.key)}
              className="text-left px-3 py-2.5 rounded-lg bg-white border border-amber-200
                hover:border-amber-400 hover:bg-amber-50 transition-colors text-xs"
            >
              <span className="font-medium text-slate-800 block">{t.label}</span>
              <span className="text-slate-400 block mt-0.5 leading-tight">{t.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 拖入区域 */}
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

      {/* 文件列表 */}
      {detectedFiles.length > 0 && (
        <div className="mt-4 bg-white rounded-xl border border-slate-200">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">
              已识别 {detectedFiles.length} 个文件
            </span>
            {periodSummary && periodSummary.notCurrent > 0 && (
              <span className="text-xs text-amber-600">
                ⚠️ {periodSummary.notCurrent} 个文件可能不是当期数据
              </span>
            )}
          </div>
          <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
            {detectedFiles.map((f: any, i: number) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {f.periodInfo && !f.periodInfo.isCurrentPeriod ? (
                    <span className="text-amber-500 shrink-0" title={`文件可能属于 ${f.periodInfo.periodHint || '其他期间'}`}>⚠️</span>
                  ) : (
                    <span className="text-green-500 shrink-0">✓</span>
                  )}
                  <span className="text-slate-600 truncate">{f.name}</span>
                </div>
                <span className={`ml-2 px-2 py-0.5 rounded text-xs shrink-0 ${
                  f.category === 'unknown' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {CATEGORY_LABELS[f.category as FileCategory]}
                </span>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-slate-100">
            <button
              onClick={() => {
                useImportStore.getState().setBankTransactions([])
                useImportStore.getState().setInvoices([])
                useImportStore.getState().setImportComplete(true)
              }}
              className="w-full py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm">
              全部确认导入 →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
