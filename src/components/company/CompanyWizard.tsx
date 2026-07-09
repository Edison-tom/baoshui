import { useState, useMemo } from 'react'
import { useCompanyStore } from '../../stores/company'
import { determineTaxObligations } from '../../engines/tax-obligation'
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
  const [step, setStep] = useState(0) // 0 = 基础信息, 1 = 高级选项
  const [fullName, setFullName] = useState('')
  const [shortName, setShortName] = useState('')
  const [taxpayerType, setTaxpayerType] = useState<TaxpayerType>('small_scale_taxpayer')
  const [province, setProvince] = useState<Province>('hunan')
  const [modules, setModules] = useState<EnabledModules>({ ...defaultModules })

  const vatQualification: VatQualification =
    taxpayerType === 'general_taxpayer' ? 'general' : 'small_scale'

  const currentPeriod = useMemo(() => ({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    startDate: '',
    endDate: '',
  }), [])

  const obligations = useMemo(() => {
    return determineTaxObligations(taxpayerType, currentPeriod, modules)
  }, [taxpayerType, modules, currentPeriod])

  const dueCount = obligations.filter(o => o.isDue).length
  const canRegister = fullName.trim().length > 0 && shortName.trim().length > 0

  const handleRegister = () => {
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

            {/* 公司简称 */}
            <label className="block">
              <span className="text-sm font-medium text-slate-700">公司简称</span>
              <input value={shortName} onChange={e => setShortName(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm
                  focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="日常称呼，如 张三科技" />
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
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  当期应报税种预览
                </h3>
                <span className="text-xs text-blue-600 font-medium">
                  {dueCount} 项
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {obligations.filter(o => o.isDue).map(ob => (
                  <span key={ob.key}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700"
                    title={ob.plainExplanation}
                  >
                    {ob.name}
                    {ob.frequency === 'monthly' ? '·月' : '·季'}
                  </span>
                ))}
                {obligations.filter(o => !o.isDue).map(ob => (
                  <span key={ob.key}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-400 line-through"
                  >
                    {ob.name}（本期不报）
                  </span>
                ))}
              </div>
            </div>

            {/* 下一步 */}
            <button
              onClick={() => setStep(1)}
              disabled={!canRegister}
              className={`w-full py-2.5 text-sm font-medium rounded-lg transition-all ${
                canRegister
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              下一步：设置高级选项 →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 步骤 1: 高级选项（有大白话解释）
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <h1 className="text-2xl font-bold text-slate-900 text-center mb-1">报税助手</h1>
        <p className="text-sm text-slate-500 text-center mb-6">
          选择你公司涉及的特殊情况（大多数公司不需要，按需勾选即可）
        </p>

        {/* 步骤指示器 */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex-1 h-1.5 rounded-full bg-blue-600" />
          <div className="flex-1 h-1.5 rounded-full bg-blue-600" />
          <span className="text-xs text-slate-400 ml-auto">2 / 2</span>
        </div>

        <div className="space-y-5">
          {/* 高级选项列表 */}
          <div className="space-y-1">
            {ADVANCED_MODULES.map(mod => (
              <div key={mod.key}
                className={`p-3 rounded-lg border transition-colors ${
                  modules[mod.key]
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-slate-200'
                }`}
              >
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={modules[mod.key]}
                    onChange={() => toggleModule(mod.key)}
                    className="mt-0.5 rounded border-slate-300 accent-blue-600" />
                  <div>
                    <span className="text-sm font-medium text-slate-800">{mod.label}</span>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{mod.plain}</p>
                  </div>
                </label>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-400 text-center">
            以上选项默认不勾选，只有公司确实涉及才勾选，不影响日常申报
          </p>

          {/* 当期应报税种预览（更新后） */}
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                勾选后应报税种
              </h3>
              <span className="text-xs text-blue-600 font-medium">{dueCount} 项</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {obligations.filter(o => o.isDue).map(ob => (
                <span key={ob.key}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700"
                >
                  {ob.name}
                  {ob.frequency === 'monthly' ? '·月' : '·季'}
                </span>
              ))}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3">
            <button onClick={() => setStep(0)}
              className="flex-1 py-2.5 text-sm font-medium rounded-lg border border-slate-300
                text-slate-600 hover:bg-slate-50 transition-all"
            >
              ← 返回修改
            </button>
            <button onClick={handleRegister}
              className="flex-1 py-2.5 text-sm font-medium rounded-lg bg-blue-600 text-white
                hover:bg-blue-700 shadow-sm transition-all"
            >
              完成，开始报税 →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
