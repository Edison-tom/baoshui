import type { FileCategory, DetectedFile } from './types'

const RULES: { category: FileCategory; required: string[][] }[] = [
  { category: 'invoice_export', required: [['发票代码'], ['发票号码','销方名称']] },
  { category: 'bank_statement', required: [['交易日期'], ['借方金额','贷方金额'], ['对方户名','摘要']] },
  { category: 'payroll', required: [['姓名'], ['身份证号','应发工资']] },
  { category: 'expense', required: [['日期'], ['金额'], ['类别','摘要']] },
  { category: 'receivables_payables', required: [['类型'], ['对方名称'], ['金额']] },
  { category: 'previous_tax_data', required: [['资产负债表','利润表','期初余额']] },
]

const OFD_EXT = '.ofd'
const IMAGE_EXTS = ['.jpg','.jpeg','.png','.bmp','.webp']
const PDF_EXT = '.pdf'

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf('.')
  return dot >= 0 ? filename.slice(dot).toLowerCase() : ''
}

function containsAny(headers: string[], keywords: string[]): boolean {
  const lower = headers.map(h => h.toLowerCase().trim())
  return keywords.some(k => lower.some(h => h.includes(k.toLowerCase())))
}

function matchesRule(headers: string[], rule: typeof RULES[number]): boolean {
  return rule.required.every(g => containsAny(headers, g))
}

export function detectFileCategory(filename: string, headers?: string[]): FileCategory {
  const ext = getExtension(filename)
  if (ext === OFD_EXT) return 'invoice_original'
  if (IMAGE_EXTS.includes(ext)) return 'invoice_original'
  if (ext === PDF_EXT && (!headers || headers.length === 0)) return 'invoice_original'
  if (!headers || headers.length === 0) return 'unknown'
  for (const rule of RULES) { if (matchesRule(headers, rule)) return rule.category }
  return 'unknown'
}

export function detectAllFiles(files: {name:string; headers?:string[]}[]): DetectedFile[] {
  return files.map(f => ({
    name: f.name,
    category: detectFileCategory(f.name, f.headers),
    confidence: f.headers ? 0.9 : 0.5,
    preview: [],
  }))
}
