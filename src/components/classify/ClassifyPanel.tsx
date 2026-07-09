import { useImportStore } from '../../stores/import'
import { useClassifyStore } from '../../stores/classify'

export function ClassifyPanel() {
  const isImportComplete = useImportStore(s => s.isImportComplete)
  const result = useClassifyStore(s => s.result)

  if (!isImportComplete || !result) return null

  const totalCount = result.entries.length
  const incomeCount = result.incomeEntries.length
  const expenseCount = result.expenseEntries.length
  const lowConfCount = result.lowConfidenceEntries.length

  return (
    <div className="px-6 py-3 border-b border-slate-200 bg-slate-50">
      <div className="flex items-center gap-6 text-sm">
        <span className="text-slate-600">
          共 <strong className="text-slate-900">{totalCount}</strong> 笔交易
        </span>
        <span className="text-green-600">
          收入 <strong>{incomeCount}</strong> 笔
        </span>
        <span className="text-red-600">
          支出 <strong>{expenseCount}</strong> 笔
        </span>
        {lowConfCount > 0 && (
          <span className="text-amber-600">
            ⚠️ <strong>{lowConfCount}</strong> 笔待确认
          </span>
        )}
        {lowConfCount === 0 && (
          <span className="text-green-600">✅ 全部分类已确认</span>
        )}
      </div>
    </div>
  )
}
