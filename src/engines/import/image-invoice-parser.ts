/**
 * 图片发票 OCR 解析器
 * 使用 Tesseract.js 进行中英文 OCR 识别，再用通用正则提取发票字段
 */
import type { InvoiceItem } from './types'
import { parseInvoiceText } from './invoice-text-parser'

/**
 * 解析图片发票文件（jpg/png/bmp/webp）
 */
export async function parseImageInvoice(file: File): Promise<InvoiceItem[]> {
  const text = await ocrImage(file)
  if (!text) return []
  const invoice = parseInvoiceText(text, file.name)
  return invoice ? [invoice] : []
}

/**
 * 对图片文件执行 OCR 识别
 */
async function ocrImage(file: File): Promise<string> {
  const Tesseract = await import('tesseract.js')
  const imageUrl = URL.createObjectURL(file)
  try {
    const { data } = await Tesseract.recognize(imageUrl, 'chi_sim+eng', {
      logger: () => {}, // 静默模式，避免大量日志
    })
    return data.text
  } finally {
    URL.revokeObjectURL(imageUrl)
  }
}
