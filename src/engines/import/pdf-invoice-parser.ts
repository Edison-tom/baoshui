/**
 * PDF 发票文本提取器
 * 使用 pdfjs-dist 提取 PDF 文本内容，再用通用正则提取发票字段
 */
import { logger } from '../../utils/logger'
import type { InvoiceItem } from './types'
import { parseInvoiceText } from './invoice-text-parser'

/**
 * 提取 PDF 文件文本内容
 */
export async function extractPdfText(file: File): Promise<string> {
  logger.info("PDF", "提取PDF文本: " + file.name)
  const pdfjs = await import('pdfjs-dist')
  // Vite 环境下用 URL 创建 worker 路径
  const workerUrl = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).href
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

  const buffer = await file.arrayBuffer()
  const doc = await pdfjs.getDocument({ data: buffer }).promise
  const texts: string[] = []

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items.map((item: any) => item.str || '').join(' ')
    texts.push(pageText)
  }

  return texts.join('\n')
}

/**
 * 解析 PDF 发票文件
 */
export async function parsePdfInvoice(file: File): Promise<InvoiceItem[]> {
  try {
    const text = await extractPdfText(file)
    const invoice = parseInvoiceText(text, file.name)
    return invoice ? [invoice] : []
  } catch (e: any) {
    logger.error("PDF", "PDF发票解析失败: " + file.name, e)
    throw e
  }
}
