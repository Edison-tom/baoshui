import type { TaxpayerType } from '../types'
import type { Money } from '../types'
import type { VatResult, SurtaxResult, IitResult, CitResult, SocialResult, StampDutyResult } from '../tax/types'

export interface GuideStep {
  index: number; title: string; taxType: string
  description: string; amount: Money
  formName: string; formFields: { field: string; value: Money }[]
  plainExplanation: string
}

export function generateGuide(
  taxpayerType: TaxpayerType,
  month: number,
  vat: VatResult | null,
  surtax: SurtaxResult | null,
  iit: IitResult | null,
  cit: CitResult | null,
  _social: SocialResult | null,
  _stamp: StampDutyResult | null
): GuideStep[] {
  const steps: GuideStep[] = []
  let idx = 0

  const needsVat = taxpayerType === 'general_taxpayer' || taxpayerType === 'small_scale_taxpayer'

  if (needsVat && vat) {
    idx++
    steps.push({
      index: idx, title: '增值税申报', taxType: '增值税',
      description: `登录电子税务局，打开增值税申报表`,
      amount: vat.taxPayable,
      formName: '增值税及附加税费申报表',
      formFields: [
        { field: '第7栏 销售额', value: vat.taxableSales },
        { field: '第12栏 进项税额', value: vat.deductibleInput },
        { field: '第15栏 应纳税额', value: vat.taxPayable },
      ],
      plainExplanation: '在税务局网站上对照右边的表单，把左边算好的数字填进去。',
    })

    if (surtax) {
      idx++
      steps.push({
        index: idx, title: '附加税申报', taxType: '附加税',
        description: '增值税申报完成后，附加税数据自动计算',
        amount: surtax.total,
        formName: '附加税费申报表',
        formFields: [
          { field: '城建税', value: surtax.urbanConstruction },
          { field: '教育费附加', value: surtax.educationSurcharge },
          { field: '地方教育附加', value: surtax.localEducationSurcharge },
        ],
        plainExplanation: '附加税跟着增值税一起报的，不用单独操作。数字已自动算好。',
      })
    }
  }

  if (iit) {
    idx++
    steps.push({
      index: idx, title: '个税扣缴申报', taxType: '个人所得税',
      description: '登录自然人电子税务局（扣缴端），申报工资薪金个税',
      amount: iit.totalPayable,
      formName: '扣缴个人所得税报告表',
      formFields: [{ field: '合计应扣缴税额', value: iit.totalPayable }],
      plainExplanation: '个税是从员工工资里代扣的，你帮员工交给税务局。',
    })
  }

  const needsCit = taxpayerType === 'general_taxpayer' || taxpayerType === 'small_scale_taxpayer'
  if (needsCit && cit && month % 3 === 0) {
    idx++
    steps.push({
      index: idx, title: '企业所得税预缴', taxType: '企业所得税',
      description: '登录电子税务局，申报企业所得税（季度预缴）',
      amount: cit.currentPayable,
      formName: '企业所得税月（季）度预缴纳税申报表（A类）',
      formFields: [
        { field: '营业收入', value: cit.revenue },
        { field: '营业成本', value: cit.cost },
        { field: '利润总额', value: cit.profit },
        { field: '应纳所得税额', value: cit.taxPayable },
      ],
      plainExplanation: '季度预缴 = 先按季度的利润预估一下要交多少税，年末再统一算总账。',
    })
  }

  return steps
}
