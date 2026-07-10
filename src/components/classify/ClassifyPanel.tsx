import { useState } from 'react'
import { useImportStore } from '../../stores/import'
import { useClassifyStore } from '../../stores/classify'
import { useCompanyStore } from '../../stores/company'
import { classifyAll } from '../../engines/classify'
import { getCrossPeriodInvoiceSummary, getCrossPeriodTransactionSummary } from '../../engines/import/period-check'
import type { ClassificationResult } from '../../engines/classify/types'
import { formatPeriod } from '../../engines/period-utils'

/** 分→元 显示 */
function formatYuan(fen: number): string {
  const abs = Math.abs(fen)
  const y = (abs / 100).toFixed(2)
  return fen < 0 ? `-¥${y}` : `¥${y}`
}

/** 科目中文名 */
function subjectLabel(s: string): string {
  const map: Record<string, string> = {
    main_revenue: '主营业务收入', other_revenue: '其他业务收入',
    main_cost: '主营业务成本', mgmt_expense: '管理费用',
    sales_expense: '销售费用', finance_expense: '财务费用',
    tax_surcharge: '税金及附加', non_operating_income: '营业外收入',
    non_operating_expense: '营业外支出', receivable: '应收账款',
    payable: '应付账款', internal_transfer: '内部转账',
    loan_borrow: '借款', loan_repay: '还款',
    salary: '工资薪金', social_insurance: '社保费用',
    tax_payment: '缴纳税款', fixed_asset: '固定资产',
    uncategorized: '未分类',
  }
  return map[s] || s
}

/** 数据来源中文名 */
function sourceLabel(s: string): string {
  const map: Record<string, string> = {
    bank: '银行流水', invoice_in: '进项发票', invoice_out: '销项发票', expense: '费用报销',
  }
  return map[s] || s
}

/* ---------- 数据概览卡片 ---------- */
function DataCard({ title, count, amount, children, color, warning }: {
  title: string; count: number; amount: string; color: string; warning?: string; children?: React.ReactNode
}) {
  if (count === 0) return null
  return (
    <div className={`border rounded-lg p-4 ${color}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-slate-800">{title}</span>
        <span className="text-sm text-slate-500">{count} 条</span>
      </div>
      <p className="text-lg font-semibold text-slate-900">{amount}</p>
      {warning && (
        <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
          ⚠️ {warning}
        </p>
      )}
      {children && <div className="mt-3 pt-3 border-t border-slate-200/60">{children}</div>}
    </div>
  )
}

function DataPreview({ items, fields }: {
  items: { label: string; value: string }[][]; fields: string[]
}) {
  if (items.length === 0) return null
  const [expanded, setExpanded] = useState(false)
  const display = expanded ? items : items.slice(0, 3)
  return (
    <div>
      <div className="text-xs text-slate-400 mb-1.5">
        {fields.join(' · ')}
      </div>
      {display.map((row, i) => (
        <div key={i} className="text-xs text-slate-500 py-0.5 flex gap-2">
          {row.map((c, j) => (
            <span key={j} className={j === row.length - 1 ? 'ml-auto font-medium' : ''}>
              {c.label}: {c.value}
            </span>
          ))}
        </div>
      ))}
      {items.length > 3 && (
        <button onClick={() => setExpanded(!expanded)}
          className="text-xs text-blue-500 hover:text-blue-700 mt-1">
          {expanded ? '收起' : `展开全部 ${items.length} 条`}
        </button>
      )}
    </div>
  )
}

/* ========== 主面板 ========== */
export function ClassifyPanel() {
  const hasImportedData = useImportStore(s => s.hasImportedData)
  const invoices = useImportStore(s => s.invoices)
  const bankTransactions = useImportStore(s => s.bankTransactions)
  const payroll = useImportStore(s => s.payroll)
  const expenses = useImportStore(s => s.expenses)
  const receivablesPayables = useImportStore(s => s.receivablesPayables)

  const result = useClassifyStore(s => s.result)
  const setResult = useClassifyStore(s => s.setResult)
  const company = useCompanyStore(s => s.company)

  const [classifying, setClassifying] = useState(false)

  if (!hasImportedData) return null

  const period = company?.period

  /* ---- 期间校验 ---- */
  const crossPeriodInvoices = period ? getCrossPeriodInvoiceSummary(invoices, period) : null
  const crossPeriodBank = period ? getCrossPeriodTransactionSummary(bankTransactions, period) : null
  const periodWarnings: string[] = []
  if (crossPeriodInvoices && crossPeriodInvoices.count > 0) {
    periodWarnings.push(`发票中有 ${crossPeriodInvoices.count} 条（${formatYuan(crossPeriodInvoices.totalAmount)}）不属于本期（${formatPeriod(period!)}）`)
  }
  if (crossPeriodBank && crossPeriodBank.count > 0) {
    periodWarnings.push(`银行流水中有 ${crossPeriodBank.count} 条不属于本期`)
  }

  /* ---- 数据统计 ---- */
  const bankIncome = bankTransactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const bankExpense = bankTransactions.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0)
  const invoiceInAmt = invoices.filter(i => i.isPurchase).reduce((s, i) => s + i.totalAmount, 0)
  const invoiceOutAmt = invoices.filter(i => !i.isPurchase).reduce((s, i) => s + i.totalAmount, 0)
  const payrollTotal = payroll.reduce((s, p) => s + (p.grossPay || p.grossSalary || 0), 0)
  const netPayTotal = payroll.reduce((s, p) => s + (p.netPay || 0), 0)
  const expenseTotal = expenses.reduce((s, e) => s + e.amount, 0)
  const rpReceivable = receivablesPayables.filter(r => r.type === 'receivable').reduce((s, r) => s + r.amount, 0)
  const rpPayable = receivablesPayables.filter(r => r.type === 'payable').reduce((s, r) => s + r.amount, 0)

  const allCount = invoices.length + bankTransactions.length + payroll.length + expenses.length + receivablesPayables.length

  /* ---- 预览数据 ---- */
  const invoicePreview = invoices.slice(0, 10).map(i => [
    { label: (i.sellerName || i.buyerName || '—').slice(-6), value: i.invoiceNumber || '' },
    { label: '金额', value: formatYuan(i.totalAmount) },
    { label: '日期', value: (i.issueDate || i.date || '').slice(5) },
  ])
  const bankPreview = bankTransactions.slice(0, 10).map(t => [
    { label: (t.counterparty || '—').slice(-6), value: t.date || '' },
    { label: '金额', value: formatYuan(t.amount) },
    { label: '类型', value: t.amount > 0 ? '收入' : '支出' },
  ])

  /* ---- 开始分类 ---- */
  const handleClassify = () => {
    setClassifying(true)
    try {
      const r: ClassificationResult = classifyAll(
        bankTransactions, invoices, payroll, expenses, receivablesPayables,
        company?.fullName, period
      )
      setResult(r)
    } catch (e) {
      console.error('[ClassifyPanel] 分类引擎异常', e)
    } finally {
      setClassifying(false)
    }
  }

  /* ==================== 未分类：数据概览 ==================== */
  if (!result) {
    return (
      <div>
        {/* 期间提示 */}
        {period && (
          <div className="mb-4 px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-600 flex items-center gap-2">
            📅 当前所属期：<strong>{formatPeriod(period)}</strong>
            {periodWarnings.length > 0 && (
              <span className="ml-auto text-amber-600 text-xs flex items-center gap-1">
                ⚠️ {periodWarnings.join('；')}
              </span>
            )}
          </div>
        )}

        {/* 数据来源卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {invoices.length > 0 && (
            <DataCard title="📄 发票" count={invoices.length}
              amount={`进项 ${formatYuan(invoiceInAmt)} / 销项 ${formatYuan(invoiceOutAmt)}`}
              color="bg-blue-50 border-blue-200"
              warning={crossPeriodInvoices && crossPeriodInvoices.count > 0
                ? `${crossPeriodInvoices.count} 条不属于本期`
                : undefined}>
              <DataPreview items={invoicePreview} fields={['对方/号码', '金额', '日期']} />
            </DataCard>
          )}
          {bankTransactions.length > 0 && (
            <DataCard title="🏦 银行流水" count={bankTransactions.length}
              amount={`收入 ${formatYuan(bankIncome)} / 支出 ${formatYuan(bankExpense)}`}
              color="bg-emerald-50 border-emerald-200"
              warning={crossPeriodBank && crossPeriodBank.count > 0
                ? `${crossPeriodBank.count} 条不属于本期`
                : undefined}>
              <DataPreview items={bankPreview} fields={['对方', '日期', '金额']} />
            </DataCard>
          )}
          {payroll.length > 0 && (
            <DataCard title="👥 工资表" count={payroll.length}
              amount={`应发 ${formatYuan(payrollTotal)} / 实发 ${formatYuan(netPayTotal)}`}
              color="bg-violet-50 border-violet-200" />
          )}
          {expenses.length > 0 && (
            <DataCard title="📋 费用报销" count={expenses.length}
              amount={formatYuan(expenseTotal)}
              color="bg-amber-50 border-amber-200" />
          )}
          {receivablesPayables.length > 0 && (
            <DataCard title="🔄 应收应付" count={receivablesPayables.length}
              amount={`应收 ${formatYuan(rpReceivable)} / 应付 ${formatYuan(rpPayable)}`}
              color="bg-rose-50 border-rose-200" />
          )}
        </div>

        {/* 开始分类按钮 */}
        <div className="text-center py-6">
          <button
            onClick={handleClassify}
            disabled={classifying}
            className={`px-10 py-3 rounded-xl text-white font-medium shadow-sm transition-all ${
              classifying
                ? 'bg-blue-400 cursor-wait'
                : 'bg-blue-600 hover:bg-blue-700 hover:shadow-md'
            }`}
          >
            {classifying ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                正在分析 {allCount} 条数据...
              </span>
            ) : (
              `开始自动分类（共 ${allCount} 条数据）`
            )}
          </button>
          <p className="text-xs text-slate-400 mt-2">
            系统将根据关键词规则自动匹配会计科目，低置信度条目需要您确认
          </p>
        </div>
      </div>
    )
  }

  /* ==================== 已分类：结果展示 ==================== */
  return (
    <div>
      {/* 统计条 */}
      <div className="flex items-center gap-6 text-sm px-6 py-3 border-b border-slate-200 bg-slate-50 rounded-t-lg">
        <span className="text-slate-600">
          共 <strong className="text-slate-900">{result.entries.length}</strong> 笔交易
        </span>
        <span className="text-green-600">
          收入 <strong>{result.incomeEntries.length}</strong> 笔
        </span>
        <span className="text-red-600">
          支出 <strong>{result.expenseEntries.length}</strong> 笔
        </span>
        {result.lowConfidenceEntries.length > 0 ? (
          <span className="text-amber-600">
            ⚠️ <strong>{result.lowConfidenceEntries.length}</strong> 笔待确认
          </span>
        ) : (
          <span className="text-green-600">✅ 全部分类已确认</span>
        )}
        {result.crossPeriod.length > 0 && (
          <span className="text-amber-600" title="非本期的交易，注意是否应计入本期">
            📅 <strong>{result.crossPeriod.length}</strong> 笔跨期
          </span>
        )}
        <span className="text-blue-600 ml-auto">
          收入合计 {formatYuan(result.summary.totalIncome)} ·
          支出合计 {formatYuan(result.summary.totalExpense)}
        </span>
      </div>

      {/* 分类明细表格 */}
      <div className="overflow-x-auto border-x border-b border-slate-200 rounded-b-lg">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-2 text-left">日期</th>
              <th className="px-4 py-2 text-left">摘要</th>
              <th className="px-4 py-2 text-left">对方</th>
              <th className="px-4 py-2 text-right">金额</th>
              <th className="px-4 py-2 text-left">会计科目</th>
              <th className="px-4 py-2 text-left">来源</th>
              <th className="px-4 py-2 text-center">置信度</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {result.entries.map((entry) => {
              const isCross = result.crossPeriod.some(c => c.id === entry.id)
              return (
                <tr key={entry.id}
                  className={`${entry.needsConfirmation ? 'bg-amber-50/60' : ''} ${isCross ? 'bg-amber-50/30' : ''} hover:bg-slate-50 transition-colors`}>
                  <td className={`px-4 py-2 whitespace-nowrap ${isCross ? 'text-amber-600' : 'text-slate-500'}`}>
                    {entry.date}{isCross ? ' 📅' : ''}
                  </td>
                  <td className="px-4 py-2 text-slate-700 max-w-[200px] truncate" title={entry.summary}>
                    {entry.summary || '—'}
                  </td>
                  <td className="px-4 py-2 text-slate-500 max-w-[120px] truncate" title={entry.counterparty}>
                    {entry.counterparty || '—'}
                  </td>
                  <td className={`px-4 py-2 text-right font-medium whitespace-nowrap ${
                    entry.amount > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatYuan(entry.amount)}
                  </td>
                  <td className="px-4 py-2 text-slate-700">
                    {subjectLabel(entry.accountSubject)}
                  </td>
                  <td className="px-4 py-2 text-slate-400 text-xs">
                    {sourceLabel(entry.originalType)}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {entry.needsConfirmation ? (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                        ⚠️ {(entry.confidence * 100).toFixed(0)}%
                      </span>
                    ) : (
                      <span className="text-xs text-green-500">✓ {(entry.confidence * 100).toFixed(0)}%</span>
                    )}
                  </td>
                </tr>
              )
            })}
            {result.entries.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  暂无分类数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 跨期提示 */}
      {result.crossPeriod.length > 0 && (
        <div className="mt-3 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          📅 有 <strong>{result.crossPeriod.length}</strong> 笔交易的日期不属于本期（{period ? formatPeriod(period) : ''}）。
          请在确认时判断是否应计入本期。例如：上期发票本期才入账 → 应计入本期；代开发票实际是上期的 → 不应计入。
        </div>
      )}

      {/* 重新分类按钮 */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={handleClassify}
          disabled={classifying}
          className="px-4 py-1.5 text-xs text-slate-500 border border-slate-300 rounded-lg
            hover:bg-slate-50 disabled:opacity-50"
        >
          {classifying ? '重新分类中...' : '🔄 重新分类'}
        </button>
      </div>
    </div>
  )
}
