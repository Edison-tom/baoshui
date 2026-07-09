/**
 * PDF 发票解析器
 * 先尝试文本提取，失败则回退到渲染页面 + OCR
 */
import { logger } from '../../utils/logger'
import type { InvoiceItem } from './types'
import { parseInvoiceText } from './invoice-text-parser'

/**
 * PDF 页面渲染为图片，再 OCR 提取文本
 */
async function ocrPdfPage(page: any): Promise<string> {
  const viewport = page.getViewport({ scale: 2 }) // 2x 提高 OCR 精度
  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  const ctx = canvas.getContext('2d')!
  await page.render({ canvasContext: ctx, viewport }).promise
  const blob = await new Promise<Blob>(resolve => canvas.toBlob(b => resolve(b!), 'image/png'))
  const Tesseract = await import('tesseract.js')
  const imageUrl = URL.createObjectURL(blob)
  try {
    const { data } = await Tesseract.recognize(imageUrl, 'chi_sim+eng', { logger: () => {} })
    return data.text
  } finally {
    URL.revokeObjectURL(imageUrl)
  }
}

/**
 * 提取 PDF 文件文本内容，失败时自动回退 OCR
 */
export async function extractPdfText(file: File): Promise<string> {
  logger.info("PDF", "提取PDF文本: " + file.name)
  const pdfjs = await import('pdfjs-dist')
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
      if (items && Array.isArray(items) && items.length > 0) {
        const pageText = items.map((item: any) => (item && item.str) || '').join(' ')
        if (pageText.trim()) {
          texts.push(pageText)
          continue
        }
      }
      // 文本提取为空 → 试 OCR
      logger.warn("PDF", "第" + i + "页无文本，尝试OCR")
      const ocrText = await ocrPdfPage(page)
      if (ocrText.trim()) texts.push(ocrText)
      else { logger.warn("PDF", "OCR也未提取到文本") }
    } catch (pageErr: any) {
      logger.warn("PDF", "第" + i + "页提取失败，尝试OCR", pageErr)
      try {
        const page = await doc.getPage(i)
        const ocrText = await ocrPdfPage(page)
        if (ocrText.trim()) texts.push(ocrText)
      } catch (ocrErr: any) {
        logger.error("PDF", "第" + i + "页OCR也失败", ocrErr)
      }
    }
  }

  const result = texts.join('\n')
  if (!result) logger.warn("PDF", "PDF所有页面均未能提取文本: " + file.name)
  return result
}

/**
 * 解析 PDF 发票文件
 */
export async function parsePdfInvoice(file: File): Promise<InvoiceItem[]> {
  try {
    const text = await extractPdfText(file)
    if (!text) {
      logger.warn("PDF", "PDF未提取到任何文本: " + file.name)
      return []
    }
    const invoice = parseInvoiceText(text, file.name)
    if (!invoice) {
      logger.warn("PDF", "PDF文本中未匹配到发票格式: " + file.name)
    }
    return invoice ? [invoice] : []
  } catch (e: any) {
    logger.error("PDF", "PDF发票解析失败: " + file.name, e)
    throw e
  }
}
