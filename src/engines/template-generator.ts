import * as XLSX from 'xlsx'

/**
 * 生成可下载的 Excel 模板文件
 * 返回 Blob URL，可直接用于 <a> 的 href
 */
function downloadBlob(workbook: XLSX.WorkBook, filename: string) {
  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** 工资表模板 */
export function downloadPayrollTemplate() {
  const headers = [
    '姓名', '身份证号', '人员类型', '应发工资',
    '社保基数', '公积金基数',
    '子女教育', '继续教育', '大病医疗',
    '住房贷款利息', '住房租金', '赡养老人', '婴幼儿照护',
    '个人养老金', '商业健康保险', '企业年金',
  ]
  const example = [
    '张三', '430100199001011234', '正式', 8000,
    8000, 8000,
    1000, 400, 0,
    1000, 0, 2000, 0,
    0, 0, 0,
  ]
  const example2 = [
    '李四', '430100199102022345', '劳务', 5000,
    0, 0,
    0, 0, 0,
    0, 1500, 0, 0,
    0, 0, 0,
  ]
  const ws = XLSX.utils.aoa_to_sheet([headers, example, example2])

  // 列宽
  ws['!cols'] = headers.map(_ => ({ wch: 16 }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '工资表')
  downloadBlob(wb, '工资表模板.xlsx')
}

/** 费用报销模板 */
export function downloadExpenseTemplate() {
  const headers = ['日期', '类别', '金额', '摘要', '是否有发票', '是否跨期', '分摊月数', '对应科目']
  const example = ['2026-07-05', '办公用品', 1250.00, '采购办公桌椅', '是', '否', 0, '管理费用']
  const example2 = ['2026-07-10', '差旅费', 3800.00, '上海出差机票住宿', '是', '否', 0, '管理费用']
  const example3 = ['2026-07-15', '房租', 15000.00, '7月办公室租金', '是', '否', 0, '管理费用']

  const ws = XLSX.utils.aoa_to_sheet([headers, example, example2, example3])
  ws['!cols'] = headers.map(h => ({ wch: h.length >= 4 ? 14 : 10 }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '费用报销')
  downloadBlob(wb, '费用报销模板.xlsx')
}

/** 应收应付模板 */
export function downloadRP_Template() {
  const headers = ['类型', '对方名称', '金额', '发生日期', '预计日期', '摘要']
  const example = ['应收账款', '北京科技有限公司', 50000.00, '2026-06-15', '2026-08-15', '软件开发尾款']
  const example2 = ['应付账款', '深圳供应商', 12000.00, '2026-07-01', '2026-08-01', '原材料采购款']

  const ws = XLSX.utils.aoa_to_sheet([headers, example, example2])
  ws['!cols'] = headers.map(_ => ({ wch: 14 }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '应收应付')
  downloadBlob(wb, '应收应付款模板.xlsx')
}

/** 银行流水模板（通用格式） */
export function downloadBankTemplate() {
  const headers = ['交易日期', '收入金额', '支出金额', '对方户名', '摘要', '余额']
  const example = ['2026-07-01', 100000, 0, '客户A', '销售货款', 500000]
  const example2 = ['2026-07-05', 0, 28000, '员工张三', '工资代发', 472000]
  const example3 = ['2026-07-10', 0, 3200, '税务局', '缴增值税', 468800]

  const ws = XLSX.utils.aoa_to_sheet([headers, example, example2, example3])
  ws['!cols'] = headers.map(_ => ({ wch: 14 }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '银行流水')
  downloadBlob(wb, '银行流水模板.xlsx')
}

export type TemplateType = 'payroll' | 'expense' | 'rp' | 'bank'

export function downloadTemplate(type: TemplateType) {
  switch (type) {
    case 'payroll': return downloadPayrollTemplate()
    case 'expense': return downloadExpenseTemplate()
    case 'rp': return downloadRP_Template()
    case 'bank': return downloadBankTemplate()
  }
}
