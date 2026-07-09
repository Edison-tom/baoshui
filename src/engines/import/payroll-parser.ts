import type { PayrollEntry } from './types'
import type { Money } from '../types'
import { parseMoney } from './bank-parser'

export function parsePayroll(rows: Record<string,any>[]): PayrollEntry[] {
  return rows
    .filter(r => {
      const keys = Object.keys(r).map(k => k.toLowerCase())
      return ['姓名','应发工资'].every(c => keys.some(k => k.includes(c)))
    })
    .map(r => {
      const get = (key: string): Money => parseMoney(r[key])
      const et = String(r['人员类型'] || '')
      const employeeType = et.includes('劳务') ? 'labor' as const
        : et.includes('年终奖') ? 'bonus' as const : 'formal' as const

      return {
        name: String(r['姓名'] || ''),
        idNumber: String(r['身份证号'] || ''),
        employeeType,
        grossSalary: get('应发工资'),
        socialBase: get('社保基数'),
        housingFundBase: get('公积金基数'),
        childrenEdu: get('子女教育'),
        continuingEdu: get('继续教育'),
        seriousIllness: get('大病医疗'),
        housingLoan: get('住房贷款利息'),
        housingRent: get('住房租金'),
        elderlySupport: get('赡养老人'),
        infantCare: get('婴幼儿照护'),
        personalPension: r['个人养老金'] ? get('个人养老金') : undefined,
        commercialHealthIns: r['商业健康保险'] ? get('商业健康保险') : undefined,
        enterpriseAnnuity: r['企业年金'] ? get('企业年金') : undefined,
      }
    })
}
