import { test, expect } from '@playwright/test'
import * as path from 'path'
import * as fs from 'fs'

test.describe('报税助手 Web 版 E2E 测试', () => {

  test('首页加载并显示依法纳税提醒', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('依法纳税是每个公民应尽的义务').first()).toBeVisible()
    await expect(page.locator('text=报税助手')).toBeVisible()
    await expect(page.locator('text=基础信息').first()).toBeVisible()
    await expect(page.locator('text=导入数据').first()).toBeVisible()
    await expect(page.locator('text=分类确认').first()).toBeVisible()
  })

  test('公司注册 — 填写信息后进入高级选项页', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder('营业执照上的完整名称').fill('长沙某某科技有限公司')
    await page.locator('input[type="radio"][value="small_scale_taxpayer"]').check()
    await expect(page.locator('text=当期应报税种预览')).toBeVisible()
    // 进入第二步
    await page.click('text=下一步：设置高级选项')
    await expect(page.locator('text=选择你公司涉及的特殊情况')).toBeVisible()
    // 完成注册
    await page.click('text=完成，开始报税')
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

  test('高级选项单独页面 — 勾选后税种更新', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder('营业执照上的完整名称').fill('长沙某某科技')
    await page.locator('input[type="radio"][value="small_scale_taxpayer"]').check()
    await page.click('text=下一步：设置高级选项')

    // 勾选印花税
    await page.locator('label:has-text("印花税（按季申报）")').click()
    await page.waitForTimeout(100)
    // 印花税应出现在税种预览
    await expect(page.getByText('印花税').first()).toBeVisible()
  })

  test('不填全称不能进入下一步', async ({ page }) => {
    await page.goto('/')
    // 不填写全称，按钮应禁用
    await expect(page.locator('button:has-text("设置高级选项")')).toBeDisabled()
  })

  test('返回修改按钮', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder('营业执照上的完整名称').fill('长沙某某科技有限公司')
    await page.click('text=下一步：设置高级选项')
    // 点击返回
    await page.click('text=← 返回修改')
    // 应该回到第一步，公司全称还在
    await expect(page.locator('input[placeholder="营业执照上的完整名称"]')).toHaveValue('长沙某某科技有限公司')
  })

  test('省份下拉框仅显示湖南省', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('select').first()).toHaveValue('hunan')
  })

  test('导入数据阶段显示模板下载和拖入区', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder('营业执照上的完整名称').fill('长沙某某科技有限公司')
    await page.click('text=下一步：设置高级选项')
    await page.click('text=完成，开始报税')
    await expect(page.locator('text=先下载模板填写数据')).toBeVisible()
    await expect(page.locator('text=支持 CSV / Excel / PDF / OFD / JPG / PNG')).toBeVisible()
  })

  test('左右栏布局 — 申报计算阶段', async ({ page }) => {
    await page.goto('/')
    await page.locator('input').nth(0).pressSequentially('长沙某某科技有限公司')
    await page.waitForTimeout(100)
    await page.locator('button:has-text("下一步")').click()
    await page.waitForTimeout(100)
    await page.locator('button:has-text("完成，开始报税")').click()
    await page.waitForTimeout(300)
    await expect(page.getByText('先下载模板填写数据')).toBeVisible({ timeout: 8000 })

    // 上传 .xlsx 测试文件
    const testFilePath = path.join(process.cwd(), 'tests', 'e2e', '__test_data.xlsx')
    await page.locator('input[type="file"]').setInputFiles(testFilePath)
    await page.waitForTimeout(3000)

    // 检查按钮
    const hasImportBtn = await page.locator('button:has-text("确认导入")').isVisible()
    if (!hasImportBtn) {
      throw new Error('File import did not complete')
    }

    await page.locator('button:has-text("确认导入")').click()
    await page.waitForTimeout(300)
    await expect(page.getByText('分类确认').first()).toBeVisible()
    await page.click('text=确认无误，开始申报')
    await expect(page.getByText('当期应报税种').first()).toBeVisible()
    await expect(page.getByText('增值税').first()).toBeVisible()
    await expect(page.locator('text=完成申报 · 安全销毁数据')).toBeVisible()
  })

  test('高级选项页可返回并修改', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder('营业执照上的完整名称').fill('长沙某某科技')
    await page.click('text=下一步：设置高级选项')
    // 返回
    await page.click('text=← 返回修改')
    // 修改全称
    await page.getByPlaceholder('营业执照上的完整名称').fill('长沙某某科技有限公司')
    await page.click('text=下一步：设置高级选项')
    // 勾选两个选项
    await page.locator('label:has-text("研发费用加计扣除")').click()
    await page.locator('label:has-text("印花税（按季申报）")').click()
    await page.waitForTimeout(100)
    // 完成
    await page.click('text=完成，开始报税')
    await expect(page.getByText('导入数据').first()).toBeVisible()
  })
})
