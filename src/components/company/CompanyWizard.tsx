import { useState } from 'react'
import { useCompanyStore } from '../../stores/company'
import type { TaxpayerType, Province, VatQualification, EnabledModules } from '../../engines/types'

const TAXPAYER_OPTIONS: { value: TaxpayerType; label: string }[] = [
  { value: 'general_taxpayer', label: '一般纳税人有限责任公司' },
  { value: 'small_scale_taxpayer', label: '小规模纳税人有限责任公司' },
  { value: 'limited_partnership', label: '有限合伙企业' },
  { value: 'sole_proprietorship', label: '个体工商户' },
  { value: 'individual_business', label: '个人独资企业' },
]

const PROVINCE_OPTIONS: { value: Province; label: string }[] = [
  { value: 'hunan', label: '湖南省' },
]

const defaultModules: EnabledModules = {
  fixedAssets: false, amortization: false, rdExpense: false,
  yearEndBonus: false, intangibleAssets: false, stampDuty: false,
  simpleTax: false, dutyFreeIncome: false,
}

export function CompanyWizard() {
  const register = useCompanyStore(s => s.register)
  const [step, setStep] = useState(0)
  const [fullName, setFullName] = useState('')
  const [shortName, setShortName] = useState('')
  const [taxpayerType, setTaxpayerType] = useState<TaxpayerType>('small_scale_taxpayer')
  const [province, setProvince] = useState<Province>('hunan')
  const [modules, setModules] = useState<EnabledModules>({ ...defaultModules })

  const vatQualification: VatQualification =
    taxpayerType === 'general_taxpayer' ? 'general' : 'small_scale'

  const canNext = step === 0
    ? fullName.trim().length > 0 && shortName.trim().length > 0
    : true

  const handleNext = () => {
    if (step < 2) { setStep(step + 1); return }
    register({
      fullName: fullName.trim(),
      shortName: shortName.trim(),
      taxpayerType, province,
      collectionMethod: 'audit',
      vatQualification,
      modules,
      bankAccounts: [],
    })
  }

  const toggleModule = (key: keyof EnabledModules) => {
    setModules(m => ({ ...m, [key]: !m[key] }))
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <h1 className="text-2xl font-bold text-slate-900 text-center mb-2">报税助手</h1>
        <p className="text-sm text-slate-500 text-center mb-8">
          注册公司信息，开始报税
        </p>

        {/* Progress */}
        <div className="flex justify-center gap-2 mb-8">
          {[0,1,2].map(i => (
            <div key={i} className={`h-1 w-16 rounded-full ${
              i <= step ? 'bg-blue-600' : 'bg-slate-200'
            }`} />
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">公司全称</span>
              <input value={fullName} onChange={e => setFullName(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm
                  focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="营业执照上的完整名称" />
              <span className="text-xs text-slate-400 mt-1 block">
                大白话：用来核对发票和银行流水是不是你公司的
              </span>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">公司简称</span>
              <input value={shortName} onChange={e => setShortName(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm
                  focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder={"自己好辨认就行，如\u201C湘科公司\u201D"} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">纳税主体类型</span>
              <select value={taxpayerType} onChange={e => setTaxpayerType(e.target.value as TaxpayerType)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm
                  focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                {TAXPAYER_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <span className="text-xs text-slate-400 mt-1 block">
                大白话：选错会报错税。不确定就看营业执照，大部分小公司选"小规模纳税人"
              </span>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">省份</span>
              <select value={province} onChange={e => setProvince(e.target.value as Province)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm
                  focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                {PROVINCE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600 mb-3">以下模块默认关闭，有需要再开启：</p>
            {([
              { key: 'fixedAssets', label: '固定资产', hint: '公司买了超过5,000块的东西（设备/电脑等）' },
              { key: 'amortization', label: '跨期费用分摊', hint: '一次性付了几个月的大额费用，要分开算' },
              { key: 'rdExpense', label: '研发费用加计扣除', hint: '公司有研发项目，可享受税收优惠' },
              { key: 'yearEndBonus', label: '年终奖/一次性奖金', hint: '给员工发了额外的年终奖或项目奖金' },
              { key: 'intangibleAssets', label: '无形资产', hint: '有专利、商标、软件著作权等' },
              { key: 'stampDuty', label: '印花税管理', hint: '签了大额合同需要交印花税' },
              { key: 'simpleTax', label: '简易计税/差额征税', hint: '特殊情况，和税务局确认后再开' },
              { key: 'dutyFreeIncome', label: '免税收入/出口退税', hint: '做出口或有免税业务' },
            ] as {key: keyof EnabledModules; label: string; hint: string}[]).map(item => (
              <label key={item.key} className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:border-blue-300 cursor-pointer transition-colors">
                <input type="checkbox" checked={modules[item.key]}
                  onChange={() => toggleModule(item.key)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                <div>
                  <span className="text-sm font-medium text-slate-700">{item.label}</span>
                  <span className="text-xs text-slate-400 block mt-0.5">大白话：{item.hint}</span>
                </div>
              </label>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              如果你有往期税务报表（从电子税务局导出的），可以在这里导入。
              没有就跳过，以后随时补充。
            </p>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center text-sm text-slate-400">
              拖动往期报表到此（支持 .xlsx）<br />
              <span className="text-xs">暂时跳过也没关系</span>
            </div>
          </div>
        )}

        <div className="flex justify-between mt-8">
          <button onClick={() => step > 0 && setStep(step - 1)}
            className={`px-4 py-2 text-sm rounded-lg ${
              step === 0 ? 'invisible' : 'text-slate-600 hover:bg-slate-100'
            }`}>
            上一步
          </button>
          <button onClick={handleNext} disabled={!canNext}
            className="px-6 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white
              hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            {step < 2 ? '下一步' : '开始使用'}
          </button>
        </div>
      </div>
    </div>
  )
}
