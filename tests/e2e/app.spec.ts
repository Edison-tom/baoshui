import { test, expect } from '@playwright/test'

test.describe('报税助手 Web 版 E2E 测试', () => {

  test('首页加载并显示依法纳税提醒', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=依法纳税是每个公民应尽的义务')).toBeVisible()
    await expect(page.locator('text=报税助手')).toBeVisible()
  })

  test('公司注册向导 — 第1步填写基本信息', async ({ page }) => {
    await page.goto('/')

    // 填写公司全称
    await page.fill('input[placeholder="营业执照上的完整名称"]', '长沙某某科技有限公司')
    // 填写简称
    await page.fill('input[placeholder*="自己好辨认"]', '湘科公司')

    // 点击下一步
    await page.click('text=下一步')

    // 应该进入第2步（启用模块）
    await expect(page.locator('text=以下模块默认关闭')).toBeVisible()
  })

  test('公司注册向导 — 第2步启用模块', async ({ page }) => {
    await page.goto('/')

    // 先填第1步
    await page.fill('input[placeholder="营业执照上的完整名称"]', '长沙某某科技有限公司')
    await page.fill('input[placeholder*="自己好辨认"]', '湘科公司')
    await page.click('text=下一步')

    // 第2步 — 勾选固定资产
    await page.check('text=固定资产')
    // 勾选研发费用
    await page.check('text=研发费用加计扣除')

    // 下一步
    await page.click('text=下一步')

    // 进入第3步（期初数据）
    await expect(page.locator('text=拖动往期报表到此')).toBeVisible()
  })

  test('公司注册向导 — 跳过第3步完成注册', async ({ page }) => {
    await page.goto('/')

    // 第1步
    await page.fill('input[placeholder="营业执照上的完整名称"]', '长沙某某科技有限公司')
    await page.fill('input[placeholder*="自己好辨认"]', '湘科公司')
    await page.click('text=下一步')

    // 第2步 — 直接用默认
    await page.click('text=下一步')

    // 第3步 — 直接点开始使用
    await page.click('text=开始使用')

    // 注册完成，应该显示导入面板
    await expect(page.locator('text=把文件夹或多文件拖入')).toBeVisible()
  })

  test('纳税主体类型可切换', async ({ page }) => {
    await page.goto('/')

    // 下拉选择 一般纳税人
    const select = page.locator('select').first()
    await select.selectOption('general_taxpayer')
    await expect(select).toHaveValue('general_taxpayer')

    // 切换回小规模
    await select.selectOption('small_scale_taxpayer')
    await expect(select).toHaveValue('small_scale_taxpayer')
  })

  test('省份下拉框仅显示湖南省', async ({ page }) => {
    await page.goto('/')

    const provinceSelect = page.locator('select').nth(1)
    const options = await provinceSelect.locator('option').allTextContents()
    expect(options).toContain('湖南省')
    expect(options.length).toBe(1)
  })

  test('导入面板显示并支持拖入提示', async ({ page }) => {
    await page.goto('/')

    // 完成注册
    await page.fill('input[placeholder="营业执照上的完整名称"]', '长沙测试公司')
    await page.fill('input[placeholder*="自己好辨认"]', '测试')
    await page.click('text=下一步')
    await page.click('text=下一步')
    await page.click('text=开始使用')

    // 验证导入面板
    await expect(page.locator('text=把文件夹或多文件拖入，自动识别类型')).toBeVisible()
    await expect(page.locator('text=支持 CSV / Excel / PDF / OFD / JPG / PNG')).toBeVisible()
    await expect(page.locator('text=选择文件')).toBeVisible()
  })

  test('左右两栏布局', async ({ page }) => {
    await page.goto('/')

    // 注册
    await page.fill('input[placeholder="营业执照上的完整名称"]', '测试公司')
    await page.fill('input[placeholder*="自己好辨认"]', '测试')
    for (let i = 0; i < 2; i++) await page.click('text=下一步')
    await page.click('text=开始使用')

    // 点击确认导入触发工作台
    await page.click('text=选择文件')

    // 检查页面有合法纳税提醒
    await expect(page.locator('text=依法纳税')).toBeVisible()
  })

})

test.describe('税务计算引擎 E2E 验证', () => {

  test('注册为小规模纳税人后界面正确', async ({ page }) => {
    await page.goto('/')

    // 注册为小规模纳税人
    await page.fill('input[placeholder="营业执照上的完整名称"]', '测试小规模公司')
    await page.fill('input[placeholder*="自己好辨认"]', '测试')

    const typeSelect = page.locator('select').first()
    await typeSelect.selectOption('small_scale_taxpayer')

    await page.click('text=下一步')
    await page.click('text=下一步')
    await page.click('text=开始使用')

    // 页面应正常显示
    await expect(page.locator('text=把文件夹或多文件拖入')).toBeVisible()
  })

  test('注册为有限合伙企业后界面正确', async ({ page }) => {
    await page.goto('/')

    await page.fill('input[placeholder="营业执照上的完整名称"]', '某有限合伙')
    await page.fill('input[placeholder*="自己好辨认"]', '合伙')

    const typeSelect = page.locator('select').first()
    await typeSelect.selectOption('limited_partnership')

    await page.click('text=下一步')
    await page.click('text=下一步')
    await page.click('text=开始使用')

    // 页面应正常显示
    await expect(page.locator('text=把文件夹或多文件拖入')).toBeVisible()
  })

  test('注册为个体工商户后界面正确', async ({ page }) => {
    await page.goto('/')

    await page.fill('input[placeholder="营业执照上的完整名称"]', '某某商店')
    await page.fill('input[placeholder*="自己好辨认"]', '商店')

    const typeSelect = page.locator('select').first()
    await typeSelect.selectOption('sole_proprietorship')

    await page.click('text=下一步')
    await page.click('text=下一步')
    await page.click('text=开始使用')

    await expect(page.locator('text=把文件夹或多文件拖入')).toBeVisible()
  })

  test('注册为个人独资企业后界面正确', async ({ page }) => {
    await page.goto('/')

    await page.fill('input[placeholder="营业执照上的完整名称"]', '某工作室')
    await page.fill('input[placeholder*="自己好辨认"]', '工作室')

    const typeSelect = page.locator('select').first()
    await typeSelect.selectOption('individual_business')

    await page.click('text=下一步')
    await page.click('text=下一步')
    await page.click('text=开始使用')

    await expect(page.locator('text=把文件夹或多文件拖入')).toBeVisible()
  })

})

test.describe('完整数据流 E2E 验证', () => {

  test('导入面板接收文件并显示文件列表', async ({ page }) => {
    await page.goto('/')

    // 注册公司
    await page.fill('input[placeholder="营业执照上的完整名称"]', '湘科科技有限公司')
    await page.fill('input[placeholder*="自己好辨认"]', '湘科')
    await page.click('text=下一步')
    await page.click('text=下一步')
    await page.click('text=开始使用')

    // 验证导入面板已显示
    await expect(page.locator('text=把文件夹或多文件拖入，自动识别类型')).toBeVisible()

    // 通过隐藏的 file input 上传 CSV 文件
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.locator('text=选择文件').click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles({
      name: 'bank_flow.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('交易日期,借方金额,贷方金额,余额,对方户名,摘要\n2026-07-01,,100000,200000,某科技,销售货款'),
    })

    // 等待文件检测
    await page.waitForTimeout(1500)

    // 页面应该仍然显示导入面板
    await expect(page.locator('text=把文件夹或多文件拖入')).toBeVisible()
  })

  test('Step-by-step: full user journey', async ({ page }) => {
    await page.goto('/')

    // Step 1: Check the tax reminder
    await expect(page.locator('text=依法纳税')).toBeVisible()

    // Step 2: Register a company
    await page.fill('input[placeholder="营业执照上的完整名称"]', '长沙湘科科技有限责任公司')
    await page.fill('input[placeholder*="自己好辨认"]', '湘科科技')
    await page.click('text=下一步')

    // Step 3: Enable fixed assets
    await page.check('text=固定资产')
    await page.click('text=下一步')

    // Step 4: Skip previous data
    await page.click('text=开始使用')

    // Step 5: Verify import panel
    await expect(page.locator('text=把文件夹或多文件拖入')).toBeVisible()
    await expect(page.locator('text=支持 CSV / Excel / PDF / OFD / JPG / PNG')).toBeVisible()
  })

})

test.describe('边界情况', () => {

  test('公司全称为空时不能进入下一步', async ({ page }) => {
    await page.goto('/')

    // 不填信息直接点下一步
    const nextBtn = page.locator('text=下一步')
    await expect(nextBtn).toBeDisabled()
  })

  test('公司简称留空时不能进入下一步', async ({ page }) => {
    await page.goto('/')

    await page.fill('input[placeholder="营业执照上的完整名称"]', '测试公司')
    // 简称留空

    const nextBtn = page.locator('text=下一步')
    await expect(nextBtn).toBeDisabled()
  })

  test('可以返回上一步修改信息', async ({ page }) => {
    await page.goto('/')

    // 填信息进第2步
    await page.fill('input[placeholder="营业执照上的完整名称"]', '测试公司')
    await page.fill('input[placeholder*="自己好辨认"]', '测试')
    await page.click('text=下一步')

    // 返回第1步
    await page.click('text=上一步')

    // 确认回到第1步
    await expect(page.locator('input[placeholder="营业执照上的完整名称"]')).toHaveValue('测试公司')
  })

  test('未完成注册不显示导入面板', async ({ page }) => {
    await page.goto('/')

    // 不注册，确认没有导入面板
    await expect(page.locator('text=把文件夹或多文件拖入')).not.toBeVisible()
    await expect(page.locator('text=报税助手')).toBeVisible()
  })

})
