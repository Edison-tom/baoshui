import { useImportStore } from '../../stores/import'
import { useClassifyStore } from '../../stores/classify'
import { useCompanyStore } from '../../stores/company'
import { useTaxStore } from '../../stores/tax'
import { useWorkbenchStore } from '../../stores/workbench'
import { classifyBankTransactions } from '../../engines/classify'
import { calcSmallScaleVat, calcGeneralVat, calcSurtax, calcIit, calcCit, calcSocial, calcStampDuty } from '../../engines/tax'
import { hunanConfig } from '../../data/provinces/hunan'
import { useEffect } from 'react'

export const Workbench = {
  LeftPanel: function LeftPanel() {
    const company = useCompanyStore(s => s.company)
    const { bankTransactions, invoices, payroll } = useImportStore()
    const result = useClassifyStore(s => s.result)
    const tax = useTaxStore()
    const { setTab } = useWorkbenchStore()

    const isCalcReady = bankTransactions.length > 0 || invoices.length > 0

    useEffect(() => {
      if (!isCalcReady || !company || result) return

      // Classify all data
      const classification = classifyBankTransactions(bankTransactions, company.bankAccounts.map(a => a.accountNumber))
      useClassifyStore.getState().setResult(classification)

      // Calculate taxes
      if (company.vatQualification === 'small_scale') {
        tax.setVat(calcSmallScaleVat(invoices, company.period.quarter || 1))
      } else if (invoices.length > 0) {
        tax.setVat(calcGeneralVat(invoices))
      }

      if (tax.vat) {
        tax.setSurtax(calcSurtax(tax.vat.taxPayable, hunanConfig))
        tax.setStamp(calcStampDuty(classification, 0, hunanConfig))
      }

      if (payroll.length > 0) {
        tax.setIit(calcIit(payroll, company.period.month))
        tax.setSocial(calcSocial(payroll, hunanConfig))
      }

      if (classification.incomeEntries.length > 0) {
        tax.setCit(calcCit(classification, 0, payroll.length))
      }
    }, [isCalcReady, company])

    const tabs = [
      { id: 'vat', label: '增值税', amount: tax.vat?.taxPayable },
      { id: 'surtax', label: '附加税', amount: tax.surtax?.total },
      { id: 'iit', label: '个税', amount: tax.iit?.totalPayable },
      { id: 'cit', label: '企税', amount: tax.cit?.currentPayable },
      { id: 'social', label: '社保', amount: tax.social?.companyTotal },
      { id: 'stamp', label: '印花税', amount: tax.stamp?.reducedTotal },
    ].filter(t => t.amount !== undefined && t.amount !== null)

    return (
      <div className="p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">本期计算结果</h2>
        <div className="space-y-2">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="w-full text-left flex justify-between items-center p-3 rounded-lg border border-slate-200 hover:border-blue-300 transition-colors">
              <span className="text-sm text-slate-700">{t.label}</span>
              <span className="text-sm font-mono font-semibold text-slate-900">
                ¥{t.amount?.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </span>
            </button>
          ))}
        </div>
        <div className="text-xs text-slate-400 pt-2 border-t border-slate-100">
          左侧数字 = 引擎算出的结果<br />
          右边表单 = 税务局申报表对应位置<br />
          照着填就行
        </div>
      </div>
    )
  },

  RightPanel: function RightPanel() {
    const { currentTab } = useWorkbenchStore()
    const tax = useTaxStore()
    const company = useCompanyStore(s => s.company)

    return (
      <div className="p-6">
        <h2 className="font-semibold text-slate-900 mb-4">税务局申报表（1:1 模拟）</h2>
        <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-500 min-h-[400px]">
          {currentTab === 'vat' && tax.vat && (
            <div className="space-y-2">
              <p className="font-medium text-slate-700">增值税申报表</p>
              <p className="text-xs text-slate-400">所属期：{company?.period.startDate} 至 {company?.period.endDate}</p>
              <div className="space-y-1 mt-3">
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span>第7栏 销售额</span>
                  <span className="font-mono text-green-700 bg-green-50 px-2 rounded">🟢 ¥{tax.vat.taxableSales.toLocaleString()}</span>
                </div>
                {tax.vat.deductibleInput > 0 && (
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span>第12栏 进项税额</span>
                    <span className="font-mono text-green-700 bg-green-50 px-2 rounded">🟢 ¥{tax.vat.deductibleInput.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 border-b border-slate-200 font-semibold">
                  <span>第15栏 应纳税额</span>
                  <span className="font-mono text-blue-700 bg-blue-50 px-2 rounded">¥{tax.vat.taxPayable.toLocaleString()}</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-3">
                大白话：销售额 = 你卖东西收的钱（不含税）。打开税务局网站找增值税申报表，把上面的数字抄进去。
              </p>
            </div>
          )}
          {currentTab === 'iit' && tax.iit && (
            <div className="space-y-2">
              <p className="font-medium text-slate-700">个税扣缴报告表</p>
              {tax.iit.entries.map((e, i) => (
                <div key={i} className="flex justify-between py-1 border-b border-slate-200 text-xs">
                  <span>{e.name}</span>
                  <span className="font-mono">本月应扣 ¥{e.currentPayable.toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between py-1 border-b border-slate-200 font-semibold text-sm">
                <span>合计</span>
                <span className="font-mono text-blue-700 bg-blue-50 px-2 rounded">¥{tax.iit.totalPayable.toLocaleString()}</span>
              </div>
              <p className="text-xs text-slate-400 mt-3">
                大白话：累计预扣 = 不是按月单独算，而是从1月累到本月一起算，再减掉前几个月已扣的。
              </p>
            </div>
          )}
          {currentTab === 'cit' && tax.cit && (
            <div className="space-y-2">
              <p className="font-medium text-slate-700">企业所得税预缴申报表（A类）</p>
              <div className="space-y-1 mt-3">
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span>营业收入</span>
                  <span className="font-mono">¥{tax.cit.revenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span>营业成本</span>
                  <span className="font-mono">¥{tax.cit.cost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span>利润总额</span>
                  <span className="font-mono">¥{tax.cit.profit.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200 font-semibold">
                  <span>应纳所得税额 {tax.cit.isSmallLowProfit && '(小型微利 5%)'}</span>
                  <span className="font-mono text-blue-700 bg-blue-50 px-2 rounded">¥{tax.cit.taxPayable.toLocaleString()}</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-3">
                大白话：小型微利 = 年利润300万以内的小公司，税率只要5%，不是正常的25%。
              </p>
            </div>
          )}
          {currentTab === 'social' && tax.social && (
            <div className="space-y-2">
              <p className="font-medium text-slate-700">社保费申报表</p>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span>单位承担合计</span>
                <span className="font-mono text-green-700">¥{tax.social.companyTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span>个人承担合计</span>
                <span className="font-mono">¥{tax.social.personalTotal.toLocaleString()}</span>
              </div>
            </div>
          )}
          {!tax[currentTab as keyof typeof tax] && (
            <p className="text-center py-12">暂无数据，请先导入并分类银行流水和发票。</p>
          )}
        </div>
      </div>
    )
  }
}
