/**
 * PDF 发票解析器
 * 先尝试文本提取，失败则回退到渲染页面 + OCR
 * 任何异常均不向外抛出，确保一个 PDF 解析失败不影响其他文件
 */
import { logger } from '../../utils/logger'
import type { InvoiceItem } from './types'
import { parseInvoiceText } from './invoice-text-parser'


/**
 * PDF 页面渲染为图片，再 OCR 提取文本
 */
async function ocrPdfPage(page: any): Promise<string> {
  const viewport = page.getViewport({ scale: 3 })
  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  const ctx = canvas.getContext('2d')!
  await page.render({ canvasContext: ctx, viewport }).promise
  const blob = await new Promise<Blob>(resolve => canvas.toBlob(b => resolve(b!), 'image/png'))
  const Tesseract = await import('tesseract.js')
  const imageUrl = URL.createObjectURL(blob)
  try {
    const { data } = await Tesseract.recognize(imageUrl, 'chi_sim+eng', {
      logger: () => {},
    })
    const preview = data.text.slice(0, 200).replace(/\n/g, '↵')
    logger.info("OCR", `识别结果预览: ${preview}`)
    return data.text
  } finally {
    URL.revokeObjectURL(imageUrl)
  }
}

/**
 * 安全提取单页文本，失败时回退 OCR
 */
async function safeExtractPageText(doc: any, pageNum: number): Promise<string> {
  try {
    const page = await doc.getPage(pageNum)
    const content = await page.getTextContent()
    const items = content?.items
    if (items && Array.isArray(items) && items.length > 0) {
      const pageText = items.map((item: any) => (item && item.str) || '').join(' ')
      if (pageText.trim().length > 20) return pageText
    }
    // 文本不足 → 试 OCR
    logger.warn("PDF", `第${pageNum}页无文本，尝试OCR`)
    const ocrText = await ocrPdfPage(page)
    if (ocrText.trim().length > 20) return ocrText
    logger.warn("PDF", `第${pageNum}页 OCR 也未提取到有效文本`)
    return ''
  } catch (err: any) {
    logger.warn("PDF", `第${pageNum}页处理异常: ${err?.message || JSON.stringify(err) || '未知'}`)
    return ''
  }
}

/**
 * 提取 PDF 文件文本内容，失败时返回空字符串
 */
export async function extractPdfText(file: File): Promise<string> {
  logger.info("PDF", `提取PDF文本: ${file.name}`)
  try {
    const pdfjs = await import('pdfjs-dist')
    const workerUrl = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).href
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

    const buffer = await file.arrayBuffer()
    const doc = await pdfjs.getDocument({ data: buffer }).promise

    const texts: string[] = []
    for (let i = 1; i <= doc.numPages; i++) {
      const text = await safeExtractPageText(doc, i)
      if (text) texts.push(text)
    }

    const result = texts.join('\n')
    if (!result) logger.warn("PDF", `PDF 所有页面均未能提取文本: ${file.name}`)
    return result
  } catch (err: any) {
    const msg = err?.message || JSON.stringify(err) || '未知错误'
    logger.error("PDF", `PDF 文档打开失败: ${file.name} — ${msg}`)
    return ''
  }
}

/**
 * 解析 PDF 发票文件
 * 任何异常不向外抛，返回 []，日志记录详情
 */
export async function parsePdfInvoice(file: File): Promise<InvoiceItem[]> {
  try {
    const text = await extractPdfText(file)
    if (!text) {
      logger.warn("PDF", `PDF 未提取到文本，已跳过: ${file.name}`)
      return []
    }
    const invoice = parseInvoiceText(text, file.name)
    if (!invoice) {
      logger.warn("PDF", `PDF 文本未匹配到发票格式: ${file.name}`)
      return []
    }
    return [invoice]
  } catch (err: any) {
    const msg = err?.message || JSON.stringify(err) || '未知错误'
    logger.error("PDF", `PDF 发票解析异常: ${file.name} — ${msg}`)
    return [] // 绝不向外抛
  }
}
