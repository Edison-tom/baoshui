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
    try {
      const page = await doc.getPage(i)
      const content = await page.getTextContent()
      const items = content?.items
      if (items && Array.isArray(items)) {
        const pageText = items.map((item: any) => (item && item.str) || '').join(' ')
        texts.push(pageText)
      }
    } catch (pageErr: any) {
      logger.warn("PDF", "第" + i + "页提取失败", pageErr)
      // 跳过失败页面，继续处理其他页面
    }
  }

  return texts.join('\n')
}

/**
 * 解析 PDF 发票文件
 */
export async function parsePdfInvoice(file: File): Promise<InvoiceItem[]> {
  try {
    const text = await extractPdfText(file)
    if (!text || !text.includes('发票')) {
      logger.warn("PDF", "PDF中未检测到发票文本: " + file.name)
      return []
    }
    const invoice = parseInvoiceText(text, file.name)
    return invoice ? [invoice] : []
  } catch (e: any) {
    logger.error("PDF", "PDF发票解析失败: " + file.name, e)
    throw e
  }
}
