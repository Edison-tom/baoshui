import { useCallback, useState } from 'react'
import { useImportStore } from '../../stores/import'
import { detectFileCategory } from '../../engines/import/auto-detect'
import type { FileCategory } from '../../engines/import/types'
import * as XLSX from 'xlsx'

const CATEGORY_LABELS: Record<FileCategory, string> = {
  bank_statement: '🏦 银行流水', invoice_export: '🧾 发票导出',
  invoice_original: '🧾 发票原件', payroll: '👤 工资表',
  expense: '📝 费用报销', receivables_payables: '📋 应收应付',
  previous_tax_data: '📊 往期报表', unknown: '❓ 未识别',
}

export function ImportPanel() {
  const { detectedFiles, setDetectedFiles, isImportComplete } = useImportStore()
  const [dragOver, setDragOver] = useState(false)

  const processFiles = useCallback(async (fileList: FileList) => {
    const files = Array.from(fileList)

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
      return { name: file.name, category, confidence: headers ? 0.9 : 0.5, preview: [] as Record<string,string>[] }
    }))

    setDetectedFiles(detected)
  }, [setDetectedFiles])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length > 0) processFiles(e.dataTransfer.files)
  }, [processFiles])

  if (isImportComplete) {
    return (
      <div className="px-6 py-3 border-b border-slate-200 bg-green-50">
        <p className="text-sm text-green-700">✅ 数据导入完成，已自动分类 → 查看下方结果</p>
      </div>
    )
  }

  return (
    <div className="px-6 py-4 border-b border-slate-200">
      <div
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
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

      {detectedFiles.length > 0 && (
        <div className="mt-3 space-y-1">
          {detectedFiles.map((f, i) => (
            <div key={i} className="flex items-center justify-between text-sm py-1">
              <span className="text-slate-600 truncate flex-1">{f.name}</span>
              <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                f.category === 'unknown' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {CATEGORY_LABELS[f.category]}
              </span>
            </div>
          ))}
          <button
            onClick={() => {
              useImportStore.getState().setBankTransactions([])
              useImportStore.getState().setInvoices([])
              useImportStore.getState().setImportComplete(true)
            }}
            className="mt-2 w-full py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            全部确认导入
          </button>
        </div>
      )}
    </div>
  )
}
