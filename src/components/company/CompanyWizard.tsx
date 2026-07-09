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

const defaultModules: EnabledModules = {
  fixedAssets: false, amortization: false, rdExpense: false,
  yearEndBonus: false, intangibleAssets: false, stampDuty: false,
  simpleTax: false, dutyFreeIncome: false,
}

export function CompanyWizard() {
  const register = useCompanyStore(s => s.register)
  const [fullName, setFullName] = useState('')
  const [shortName, setShortName] = useState('')
  const [taxpayerType, setTaxpayerType] = useState<TaxpayerType>('small_scale_taxpayer')
  const [province, setProvince] = useState<Province>('hunan')
  const [modules, setModules] = useState<EnabledModules>({ ...defaultModules })

  const vatQualification: VatQualification =
    taxpayerType === 'general_taxpayer' ? 'general' : 'small_scale'

  // 当前所选类型的应报税种预览
  const currentPeriod = useMemo(() => ({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    startDate: '',
    endDate: '',
  }), [])

  const obligations = useMemo(() => {
    return determineTaxObligations(taxpayerType, {
      year: currentPeriod.year,
      month: currentPeriod.month,
      startDate: '',
      endDate: '',
    }, modules)
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

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <h1 className="text-2xl font-bold text-slate-900 text-center mb-1">报税助手</h1>
        <p className="text-sm text-slate-500 text-center mb-2">
          登记公司信息，开始报税
        </p>
        <p className="text-xs text-amber-600 text-center mb-6">
          ⚖️ 依法纳税是每个公民应尽的义务，错过报税将影响业务开展
        </p>

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

          {/* 高级选项 */}
          <details className="text-sm">
            <summary className="text-slate-500 cursor-pointer hover:text-slate-700">
              高级选项（有需要再勾选）
            </summary>
            <div className="mt-2 space-y-2 pl-2">
              {Object.entries(modules).map(([key, val]) => (
                <label key={key} className="flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" checked={val}
                    onChange={() => toggleModule(key as keyof EnabledModules)}
                    className="rounded border-slate-300 accent-blue-600" />
                  {key === 'fixedAssets' && '固定资产折旧'}
                  {key === 'amortization' && '无形资产摊销'}
                  {key === 'rdExpense' && '研发费用加计扣除'}
                  {key === 'yearEndBonus' && '年终奖单独计税'}
                  {key === 'intangibleAssets' && '无形资产'}
                  {key === 'stampDuty' && '印花税（按季申报）'}
                  {key === 'simpleTax' && '简易计税方法'}
                  {key === 'dutyFreeIncome' && '免税收入项目'}
                </label>
              ))}
            </div>
          </details>

          {/* 注册按钮 */}
          <button
            onClick={handleRegister}
            disabled={!canRegister}
            className={`w-full py-2.5 text-sm font-medium rounded-lg transition-all ${
              canRegister
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            完成注册，开始报税 →
          </button>
        </div>
      </div>
    </div>
  )
}
