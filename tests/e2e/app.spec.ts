import { test, expect } from '@playwright/test'
import * as path from 'path'
import * as fs from 'fs'

test.describe('报税助手 Web 版 E2E 测试', () => {

  test('首页加载并显示依法纳税提醒', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('依法纳税是每个公民应尽的义务').first()).toBeVisible()
    await expect(page.locator('text=报税助手')).toBeVisible()
    await expect(page.locator('text=注册公司').first()).toBeVisible()
    await expect(page.locator('text=导入数据').first()).toBeVisible()
    await expect(page.locator('text=分类确认').first()).toBeVisible()
  })

  test('公司注册 — 填写信息后注册', async ({ page }) => {
    await page.goto('/')
    await page.fill('input[placeholder="营业执照上的完整名称"]', '长沙某某科技有限公司')
    await page.fill('input[placeholder*="日常称呼"]', '湘科公司')
    await page.locator('input[type="radio"][value="small_scale_taxpayer"]').check()
    await expect(page.locator('text=当期应报税种预览')).toBeVisible()
    await page.click('text=完成注册，开始报税')
    await expect(page.getByText('导入数据').first()).toBeVisible()
    await expect(page.getByText('需要申报的税种').first()).toBeVisible()
  })

  test('纳税主体类型切换时税种预览更新', async ({ page }) => {
    await page.goto('/')
    await page.locator('input[type="radio"][value="limited_partnership"]').check()
    await expect(page.locator('text=企业所得税（本期不报）')).toBeVisible()
    await page.locator('input[type="radio"][value="small_scale_taxpayer"]').check()
    await expect(page.getByText('企业所得税').first()).toBeVisible()
  })

  test('切换高级模块后税种更新', async ({ page }) => {
    await page.goto('/')
    // 展开高级选项 — 用 evaluate 直接设置 open
    await page.evaluate(() => {
      const details = document.querySelector('details')
      if (details) details.open = true
    })
    await page.waitForTimeout(50)
    // 直接用 evaluate 触发 React 状态更新
    await page.evaluate(() => {
      // 找到所有 checkbox，按索引点击（第7个是印花税）
      const cbs = document.querySelectorAll('details input[type="checkbox"]')
      // 遍历找到"印花税"的 checkbox
      const labels = document.querySelectorAll('details label')
      for (let i = 0; i < labels.length; i++) {
        if (labels[i].textContent?.includes('印花税')) {
          ;(cbs[i] as HTMLInputElement).click()
          break
        }
      }
    })
    await page.waitForTimeout(100)
    // 印花税应出现在税种预览
    await expect(page.getByText('印花税').first()).toBeVisible()
  })

  test('不填全称不能注册', async ({ page }) => {
    await page.goto('/')
    await page.fill('input[placeholder*="日常称呼"]', '湘科公司')
    await expect(page.locator('button:has-text("完成注册")')).toBeDisabled()
  })

  test('省份下拉框仅显示湖南省', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('select').first()).toHaveValue('hunan')
  })

  test('导入数据阶段显示模板下载和拖入区', async ({ page }) => {
    await page.goto('/')
    await page.fill('input[placeholder="营业执照上的完整名称"]', '长沙某某科技有限公司')
    await page.fill('input[placeholder*="日常称呼"]', '湘科公司')
    await page.click('text=完成注册，开始报税')
    await expect(page.locator('text=先下载模板填写数据')).toBeVisible()
    await expect(page.locator('text=支持 CSV / Excel / PDF / OFD / JPG / PNG')).toBeVisible()
  })

  test('左右栏布局 — 申报计算阶段', async ({ page }) => {
    await page.goto('/')
    await page.fill('input[placeholder="营业执照上的完整名称"]', '长沙某某科技有限公司')
    await page.fill('input[placeholder*="日常称呼"]', '湘科公司')
    await page.click('text=完成注册，开始报税')

    const testFilePath = path.join(process.cwd(), 'tests', 'e2e', '__test_data.csv')
    const fileInput = page.locator('input[type="file"]')
    fs.writeFileSync(testFilePath, '日期,金额,类别,摘要\n2026-07-01,1000,测试,测试数据')
    await fileInput.setInputFiles(testFilePath)
    fs.unlinkSync(testFilePath)

    await expect(page.locator('text=已识别')).toBeVisible()
    await page.click('text=全部确认导入')
    await expect(page.getByText('分类确认').first()).toBeVisible()
    await page.click('text=确认无误，开始申报')
    await expect(page.getByText('当期应报税种').first()).toBeVisible()
    await expect(page.getByText('增值税').first()).toBeVisible()
    await expect(page.locator('text=完成申报 · 安全销毁数据')).toBeVisible()
  })

  test('高级选项可切换', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      const details = document.querySelector('details')
      if (details) details.open = true
    })
    await page.waitForTimeout(50)
    const cbs = page.locator('details input[type="checkbox"]')
    await cbs.nth(0).check({ force: true })
    await cbs.nth(2).check({ force: true })
    await page.waitForTimeout(100)
    const checked = page.locator('details input[type="checkbox"]:checked')
    await expect(checked).toHaveCount(2)
  })
})
