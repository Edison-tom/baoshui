import { useMemo } from 'react'
import { useCompanyStore } from '../../stores/company'
import { useWorkbenchStore } from '../../stores/workbench'
import { useTaxStore } from '../../stores/tax'
import { useClassifyStore } from '../../stores/classify'
import { getDueObligations } from '../../engines/tax-obligation'

export function Workbench() {
  return (
    <div className="flex flex-col lg:flex-row min-h-[70vh]">
      <div className="lg:w-2/5 border-r border-slate-200">
        <LeftPanel />
      </div>
      <div className="lg:w-3/5">
        <RightPanel />
      </div>
    </div>
  )
}

function LeftPanel() {
  const company = useCompanyStore(s => s.company)
  const tax = useTaxStore(s => s)
  const result = useClassifyStore(s => s.result)
  const currentTab = useWorkbenchStore(s => s.currentTab)
  const setTab = useWorkbenchStore(s => s.setTab)

  // 当期应报税种
  const obligations = useMemo(() => {
    if (!company) return []
    return getDueObligations(company.taxpayerType, company.period, company.modules)
  }, [company])

  // 分类统计
  const stats = useMemo(() => {
    if (!result) return null
    return {
      total: result.entries.length,
      income: result.incomeEntries.length,
      expense: result.expenseEntries.length,
      incomeTotal: result.incomeEntries.reduce((s, e) => s + e.amount, 0),
      expenseTotal: result.expenseEntries.reduce((s, e) => s + e.amount, 0),
    }
  }, [result])

  // 总纳税估算
  const totalTax = useMemo(() => {
    let total = 0
    if (tax.vat) total += tax.vat.taxPayable
    if (tax.surtax) total += tax.surtax.total
    if (tax.iit) total += tax.iit.totalPayable
    if (tax.cit) total += tax.cit.currentPayable
    if (tax.social) total += tax.social.companyTotal
    return total
  }, [tax])

  return (
    <div className="p-6 space-y-6">
      {/* 公司信息 */}
      {company && (
        <div>
          <h2 className="text-base font-semibold text-slate-900">{company.fullName}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {company.shortName} · {company.taxpayerType === 'general_taxpayer' ? '一般纳税人' : '小规模纳税人'}
            {' · '}所属期：{company.period.startDate} 至 {company.period.endDate}
          </p>
        </div>
      )}

      {/* 收支概览 */}
      {stats && (
        <div className="bg-slate-50 rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">总收入</span>
            <span className="font-mono text-green-700 font-medium">¥{stats.incomeTotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">总支出</span>
            <span className="font-mono text-red-700 font-medium">¥{stats.expenseTotal.toLocaleString()}</span>
          </div>
          <div className="border-t border-slate-200 pt-2 flex justify-between text-sm">
            <span className="text-slate-600">估算应纳税合计</span>
            <span className="font-mono text-blue-700 font-semibold">¥{totalTax.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* 本期应报税种 */}
      <div>
        <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
          当期应报税种
        </h3>
        <div className="space-y-1">
          {obligations.length === 0 && (
            <p className="text-xs text-slate-400">本期无需申报</p>
          )}
          {obligations.map(ob => (
            <button
              key={ob.key}
              onClick={() => setTab(ob.key)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                currentTab === ob.key
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{ob.name}</span>
                <span className={`text-xs ${
                  tax[ob.key as keyof typeof tax]
                    ? 'text-blue-500'
                    : 'text-slate-300'
                }`}>
                  {tax[ob.key as keyof typeof tax] ? '✓ 已计算' : ob.frequency === 'monthly' ? '月报' : '季报'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 leading-tight">{ob.plainExplanation}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function RightPanel() {
  const company = useCompanyStore(s => s.company)
  const tax = useTaxStore(s => s)
  const currentTab = useWorkbenchStore(s => s.currentTab)
  const setClosing = useWorkbenchStore(s => s.setClosing)

  // 当期应报税种
  const obligations = useMemo(() => {
    if (!company) return []
    return getDueObligations(company.taxpayerType, company.period, company.modules)
  }, [company])

  const currentObligation = obligations.find(o => o.key === currentTab)

  return (
    <div className="p-6 space-y-6">
      {/* 当前税种标题 */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          {currentObligation?.name || '增值税'}
        </h2>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
            {currentObligation?.frequency === 'monthly' ? '月报' : currentObligation?.frequency === 'quarterly' ? '季报' : '年报'}
          </span>
          <span className="text-xs text-slate-400">
            截止日：{currentObligation?.dueDate || '次月15日'}
          </span>
        </div>
        {currentObligation && (
          <p className="text-xs text-slate-400 mt-2 bg-slate-50 p-3 rounded-lg leading-relaxed">
            💡 {currentObligation.plainExplanation}
          </p>
        )}
      </div>

      {/* 计算数据区 */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4">
          {currentTab === 'vat' && tax.vat && (
            <div className="space-y-2">
              <p className="font-medium text-slate-700 mb-3">增值税及附加税费申报表</p>
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-sm text-slate-600">第7栏 销售额（不含税）</span>
                  <span className="font-mono text-sm text-green-700 bg-green-50 px-2 rounded">
                    🟢 ¥{tax.vat.taxableSales.toLocaleString()}
                  </span>
                </div>
                {tax.vat.deductibleInput > 0 && (
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-sm text-slate-600">第12栏 进项税额</span>
                    <span className="font-mono text-sm text-green-700 bg-green-50 px-2 rounded">
                      🟢 ¥{tax.vat.deductibleInput.toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-b border-slate-100 font-semibold">
                  <span className="text-sm">第15栏 应纳税额</span>
                  <span className="font-mono text-sm text-blue-700 bg-blue-50 px-2 rounded">
                    ¥{tax.vat.taxPayable.toLocaleString()}
                  </span>
                </div>
                {tax.surtax && (
                  <>
                    <div className="border-t border-slate-100 pt-2 mt-2">
                      <p className="text-xs font-medium text-slate-500 mb-2">附加税</p>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-sm text-slate-600">城建税</span>
                      <span className="font-mono text-sm">¥{tax.surtax.urbanConstruction.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-sm text-slate-600">教育费附加</span>
                      <span className="font-mono text-sm">¥{tax.surtax.educationSurcharge.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-sm text-slate-600">地方教育附加</span>
                      <span className="font-mono text-sm">¥{tax.surtax.localEducationSurcharge.toLocaleString()}</span>
                    </div>
                    {tax.surtax.reduced && (
                      <div className="flex justify-between py-1">
                        <span className="text-xs text-amber-600">⚠️ 六税两费减半优惠已享受</span>
                      </div>
                    )}
                    <div className="flex justify-between py-1 font-semibold">
                      <span className="text-sm">附加税合计</span>
                      <span className="font-mono text-sm text-blue-700">¥{tax.surtax.total.toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          {currentTab === 'vat' && !tax.vat && (
            <p className="text-sm text-slate-400 text-center py-8">
              暂无增值税数据，请先导入银行流水和发票
            </p>
          )}

          {currentTab === 'iit' && tax.iit && (
            <div className="space-y-2">
              <p className="font-medium text-slate-700 mb-3">扣缴个人所得税报告表</p>
              <div className="divide-y divide-slate-100">
                {tax.iit.entries.map((e, i) => (
                  <div key={i} className="flex justify-between py-2 text-sm">
                    <span className="text-slate-600">{e.name}</span>
                    <span className="font-mono">
                      累计应税 ¥{e.cumulativeTaxable.toLocaleString()}
                      {' · '}应扣 ¥{e.currentPayable.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between py-2 border-t border-slate-200 font-semibold text-sm mt-2">
                <span>合计应扣缴税额</span>
                <span className="font-mono text-blue-700 bg-blue-50 px-2 rounded">
                  ¥{tax.iit.totalPayable.toLocaleString()}
                </span>
              </div>
            </div>
          )}
          {currentTab === 'iit' && !tax.iit && (
            <p className="text-sm text-slate-400 text-center py-8">
              暂无个税数据，请导入工资表
            </p>
          )}

          {currentTab === 'cit' && tax.cit && (
            <div className="space-y-2">
              <p className="font-medium text-slate-700 mb-3">企业所得税月（季）度预缴纳税申报表（A类）</p>
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-sm text-slate-600">营业收入</span>
                  <span className="font-mono text-sm">¥{tax.cit.revenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-sm text-slate-600">营业成本</span>
                  <span className="font-mono text-sm">¥{tax.cit.cost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-sm text-slate-600">利润总额</span>
                  <span className="font-mono text-sm">¥{tax.cit.profit.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 font-semibold">
                  <span className="text-sm">
                    应纳所得税额
                    {tax.cit.isSmallLowProfit && <span className="text-xs text-amber-600 ml-1">（小型微利 5%）</span>}
                  </span>
                  <span className="font-mono text-sm text-blue-700 bg-blue-50 px-2 rounded">
                    ¥{tax.cit.taxPayable.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-2 text-sm">
                  <span className="text-slate-600">已预缴所得税</span>
                  <span className="font-mono">¥{tax.cit.previouslyPaid.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 text-sm font-semibold border-t border-slate-200">
                  <span>本期应补（退）所得税额</span>
                  <span className="font-mono text-blue-700">¥{tax.cit.currentPayable.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
          {currentTab === 'cit' && !tax.cit && (
            <p className="text-sm text-slate-400 text-center py-8">
              暂无企税数据，请先导入收入和成本数据
            </p>
          )}

          {currentTab === 'social' && tax.social && (
            <div className="space-y-2">
              <p className="font-medium text-slate-700 mb-3">社会保险费申报表</p>
              {tax.social.entries.map((e, i) => (
                <div key={i} className="border-b border-slate-100 pb-2 mb-2">
                  <p className="text-xs font-medium text-slate-700 mb-1">{e.name}</p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>养老（单位{e.pension.company.toLocaleString()} / 个人{e.pension.personal.toLocaleString()}）</span>
                      <span className="font-mono">¥{(e.pension.company + e.pension.personal).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>医疗（单位{e.medical.company.toLocaleString()} / 个人{e.medical.personal.toLocaleString()}）</span>
                      <span className="font-mono">¥{(e.medical.company + e.medical.personal).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex justify-between py-2 font-semibold border-t border-slate-200 mt-2">
                <span className="text-sm">单位承担合计</span>
                <span className="font-mono text-sm text-blue-700">¥{tax.social.companyTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 text-sm text-slate-500">
                <span>个人承担合计（从工资代扣）</span>
                <span className="font-mono">¥{tax.social.personalTotal.toLocaleString()}</span>
              </div>
            </div>
          )}
          {currentTab === 'social' && !tax.social && (
            <p className="text-sm text-slate-400 text-center py-8">
              暂无社保数据，请导入工资表
            </p>
          )}

          {currentTab === 'stamp' && tax.stamp && (
            <div className="space-y-2">
              <p className="font-medium text-slate-700 mb-3">印花税申报表</p>
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-sm text-slate-600">购销合同</span>
                  <span className="font-mono text-sm">¥{tax.stamp.purchaseContract.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-sm text-slate-600">销售合同</span>
                  <span className="font-mono text-sm">¥{tax.stamp.salesContract.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-sm text-slate-600">租赁合同</span>
                  <span className="font-mono text-sm">¥{tax.stamp.leaseContract.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 font-semibold">
                  <span className="text-sm">合计</span>
                  <span className="font-mono text-sm text-blue-700">¥{tax.stamp.total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {!tax.vat && !tax.iit && !tax.cit && !tax.social && !tax.stamp && (
            <p className="text-sm text-slate-400 text-center py-8">
              暂无数据，请先导入文件
            </p>
          )}

          {/* 特例勾选 */}
          {currentTab === 'vat' && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <p className="text-xs font-medium text-slate-500 mb-2">特殊情况（有则勾选）</p>
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input type="checkbox" className="rounded border-slate-300" />
                有进项税额转出
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-600 mt-1">
                <input type="checkbox" className="rounded border-slate-300" />
                有未开票收入
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-600 mt-1">
                <input type="checkbox" className="rounded border-slate-300" />
                有固定资产抵扣
              </label>
            </div>
          )}
        </div>
      </div>

      {/* 操作指引 */}
      <div className="bg-amber-50 rounded-xl p-4">
        <h4 className="text-xs font-medium text-amber-800 mb-1">📝 填报指引</h4>
        <p className="text-xs text-amber-700 leading-relaxed">
          左边是系统算好的数据，右边对应税务局电子税务局申报表的填写位置。
          打开电子税务局 → 找到{currentObligation?.name || '增值税'}申报表 → 对照左边的数字逐项填入。
        </p>
      </div>

      {/* 结账按钮 */}
      <div className="text-center pt-4 border-t border-slate-200">
        <button
          onClick={() => setClosing(true)}
          className="px-6 py-2.5 text-sm font-medium bg-slate-800 text-white rounded-lg hover:bg-slate-900"
        >
          完成申报 · 安全销毁数据
        </button>
        <p className="text-xs text-slate-400 mt-2">
          点击后所有财务数据将从浏览器中清除，保护隐私
        </p>
      </div>
    </div>
  )
}

Workbench.LeftPanel = LeftPanel
Workbench.RightPanel = RightPanel
