import { useState, useMemo } from 'react'
import { useCompanyStore } from '../../stores/company'
import { useWorkbenchStore } from '../../stores/workbench'
import { determineTaxObligations } from '../../engines/tax-obligation'
import { inferCurrentPeriod } from '../../engines/period-utils'
import type { TaxpayerType, Province, VatQualification, EnabledModules } from '../../engines/types'

const TAXPAYER_OPTIONS: { value: TaxpayerType; label: string; desc: string }[] = [
  { value: 'general_taxpayer', label: '一般纳税人有限责任公司', desc: '年销售额>500万，增值税月报，适用13%/9%/6%税率' },
  { value: 'small_scale_taxpayer', label: '小规模纳税人有限责任公司', desc: '年销售额<500万，增值税季报，适用3%/1%税率' },
  { value: 'limited_partnership', label: '有限合伙企业', desc: '先分后税，不交企业所得税，合伙人自行申报个税' },
  { value: 'sole_proprietorship', label: '个体工商户', desc: '个人经营所得按5%-35%累进税率交个税' },
  { value: 'individual_business', label: '个人独资企业', desc: '个人经营所得，与个体工商户类似' },
]

const PROVINCE_OPTIONS: { value: Province; label: string }[] = [
  { value: 'hunan', label: '湖南省' },
]

// 高级选项的大白话解释
const ADVANCED_MODULES: { key: keyof EnabledModules; label: string; plain: string }[] = [
  { key: 'fixedAssets', label: '固定资产折旧', plain: '公司买了设备、电脑、车等大件资产，按年分摊费用，不是一次性计入成本' },
  { key: 'amortization', label: '无形资产摊销', plain: '软件、专利等无形资产的成本，在使用年限内逐年分摊' },
  { key: 'rdExpense', label: '研发费用加计扣除', plain: '公司搞研发的支出，税务局允许按实际支出的100%在税前扣除，少交点企业所得税' },
  { key: 'yearEndBonus', label: '年终奖单独计税', plain: '年终奖可以选择不并入综合所得，单独按较低税率计税，可能少交个税' },
  { key: 'intangibleAssets', label: '无形资产', plain: '购买了软件著作权、专利权、商标权等需要分期摊销的资产' },
  { key: 'stampDuty', label: '印花税（按季申报）', plain: '签合同（购销、租赁、借款等）需要交的税，税率很低，万分之几' },
  { key: 'simpleTax', label: '简易计税方法', plain: '部分业务按低税率简易计算增值税，不能抵扣进项税' },
  { key: 'dutyFreeIncome', label: '免税收入项目', plain: '国债利息、政府补贴等不需要交税的收入，需单独核算' },
]

const defaultModules: EnabledModules = {
  fixedAssets: false, amortization: false, rdExpense: false,
  yearEndBonus: false, intangibleAssets: false, stampDuty: false,
  simpleTax: false, dutyFreeIncome: false,
}

export function CompanyWizard() {
  const register = useCompanyStore(s => s.register)
  const company = useCompanyStore(s => s.company)
  const [step, setStep] = useState(0) // 0 = 基础信息, 1 = 高级选项
  // 如果已有已注册的公司数据，回退编辑时保留
  const [fullName, setFullName] = useState(company?.fullName || '')
  const [taxpayerType, setTaxpayerType] = useState<TaxpayerType>(
    (company?.taxpayerType as TaxpayerType) || 'small_scale_taxpayer'
  )
  const [province, setProvince] = useState<Province>(
    (company?.province as Province) || 'hunan'
  )
  const [modules, setModules] = useState<EnabledModules>(
    company?.modules ? { ...defaultModules, ...company.modules } : { ...defaultModules }
  )

  const vatQualification: VatQualification =
    taxpayerType === 'general_taxpayer' ? 'general' : 'small_scale'

  const currentPeriod = useMemo(() => inferCurrentPeriod(taxpayerType), [taxpayerType])

  const obligations = useMemo(() => {
    return determineTaxObligations(taxpayerType, currentPeriod, modules)
  }, [taxpayerType, modules, currentPeriod])

  const canRegister = fullName.trim().length > 0

  const setStage = useWorkbenchStore(s => s.setStage)

  const handleRegister = () => {
    register({
      fullName: fullName.trim(),
      taxpayerType, province,
      collectionMethod: 'audit',
      vatQualification,
      modules,
      bankAccounts: [],
    })
    setStage('import')
  }

  const toggleModule = (key: keyof EnabledModules) => {
    setModules(m => ({ ...m, [key]: !m[key] }))
  }

  // 步骤 0: 基础信息
  if (step === 0) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="w-full max-w-lg">
          <h1 className="text-2xl font-bold text-slate-900 text-center mb-1">报税助手</h1>
          <p className="text-sm text-slate-500 text-center mb-2">
            填写公司基础信息，开始报税之旅
          </p>
          <p className="text-xs text-amber-600 text-center mb-6">
            ⚖️ 依法纳税是每个公民应尽的义务，错过报税将影响业务开展
          </p>

          {/* 步骤指示器 */}
          <div className="flex items-center gap-2 mb-6">
            <div className="flex-1 h-1.5 rounded-full bg-blue-600" />
            <div className="flex-1 h-1.5 rounded-full bg-slate-200" />
            <span className="text-xs text-slate-400 ml-auto">1 / 2</span>
          </div>

          <div className="space-y-5">
            {/* 公司全称 */}
            <label className="block">
              <span className="text-sm font-medium text-slate-700">公司全称</span>
              <input value={fullName} onChange={e => setFullName(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm
                  focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="营业执照上的完整名称" />
              <span className="text-xs text-slate-400 mt-1 block">
                用于核对发票和银行流水是否属于该公司
              </span>
            </label>

            {/* 纳税主体类型 */}
            <div>
              <span className="text-sm font-medium text-slate-700">纳税主体类型</span>
              <div className="mt-1 space-y-2">
                {TAXPAYER_OPTIONS.map(opt => (
                  <label key={opt.value}
                    className={`block p-3 rounded-lg border cursor-pointer transition-colors ${
                      taxpayerType === opt.value
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input type="radio" name="taxpayerType" value={opt.value}
                        checked={taxpayerType === opt.value}
                        onChange={() => setTaxpayerType(opt.value)}
                        className="accent-blue-600" />
                      <span className="text-sm font-medium text-slate-800">{opt.label}</span>
                    </div>
                    <p className="text-xs text-slate-500 ml-5 mt-0.5">{opt.desc}</p>
                  </label>
                ))}
              </div>
            </div>

            {/* 省份 */}
            <div>
              <span className="text-sm font-medium text-slate-700">所在省市</span>
              <select value={province} onChange={e => setProvince(e.target.value as Province)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none">
                {PROVINCE_OPTIONS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            {/* 当期应报税种预览 */}
            <div className="bg-slate-50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">当期应报税种预览</h3>
              <ul className="space-y-1">
                {obligations.map(o => (
                  <li key={o.key} className="flex items-center gap-2 text-sm">
                    <span className={`w-1.5 h-1.5 rounded-full ${o.isDue ? 'bg-green-500' : 'bg-slate-300'}`} />
                    <span className={o.isDue ? 'text-slate-800' : 'text-slate-400'}>
                      {o.name}
                      <span className="text-xs text-slate-400 ml-1">
                        ({o.frequency === 'monthly' ? '月报' : o.frequency === 'quarterly' ? '季报' : '年报'})
                      </span>
                    </span>
                    {o.isDue && <span className="text-xs text-green-600 font-medium ml-auto">本期需报</span>}
                  </li>
                ))}
              </ul>
            </div>

            {/* 下一步按钮 */}
            <button
              onClick={() => setStep(1)}
              disabled={!canRegister}
              className="w-full py-2.5 rounded-lg text-sm font-medium transition-colors
                bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed shadow-sm"
            >
              下一步：设置高级选项
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 步骤 1: 高级选项
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <div className="mb-6">
          <button
            onClick={() => setStep(0)}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            ← 返回修改
          </button>
        </div>

        {/* 步骤指示器 */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex-1 h-1.5 rounded-full bg-blue-600" />
          <div className="flex-1 h-1.5 rounded-full bg-blue-600" />
          <span className="text-xs text-slate-400 ml-auto">2 / 2</span>
        </div>

        <h2 className="text-lg font-semibold text-slate-900 mb-1">
          选择你公司涉及的特殊情况
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          以下为可选项目，大多数小公司不需要勾选任何项目，可直接下一步
        </p>

        <div className="space-y-3 mb-6">
          {ADVANCED_MODULES.map(mod => (
            <label key={mod.key}
              className={`block p-3 rounded-lg border cursor-pointer transition-colors ${
                modules[mod.key]
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <input type="checkbox"
                  checked={modules[mod.key]}
                  onChange={() => toggleModule(mod.key)}
                  className="mt-0.5 accent-blue-600" />
                <div>
                  <span className="text-sm font-medium text-slate-800">{mod.label}</span>
                  <p className="text-xs text-slate-400 mt-0.5">{mod.plain}</p>
                </div>
              </div>
            </label>
          ))}
        </div>

        {/* 税种更新提示 */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6">
          <p className="text-xs text-amber-700">
            勾选项目后，上方"当期应报税种"会自动更新
          </p>
        </div>

        {/* 税种预览 */}
        <div className="bg-slate-50 rounded-xl p-4 mb-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">当期应报税种</h3>
          <ul className="space-y-1">
            {obligations.map(o => (
              <li key={o.key} className="flex items-center gap-2 text-sm">
                <span className={`w-1.5 h-1.5 rounded-full ${o.isDue ? 'bg-green-500' : 'bg-slate-300'}`} />
                <span className={o.isDue ? 'text-slate-800' : 'text-slate-400'}>
                  {o.name}（{o.frequency === 'monthly' ? '月报' : o.frequency === 'quarterly' ? '季报' : '年报'}）
                </span>
                {o.isDue && <span className="text-xs text-green-600 font-medium ml-auto">本期需报</span>}
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={handleRegister}
          className="w-full py-2.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
        >
          完成，开始报税
        </button>
      </div>
    </div>
  )
}
