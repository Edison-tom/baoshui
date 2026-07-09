# 分类确认页优化方案

## 问题

当前 `ClassifyPanel` 在 `result` 为 `null`（未运行分类引擎）时，直接返回 `null`，页面完全空白。用户导入数据后看不到任何数据确认。

## 方案：两阶段展示

### 阶段一：数据概览（未分类状态）

当 `hasImportedData === true` 且 `result === null` 时，展示：

1. **数据来源卡片**（每种数据类型一个卡片）：
   - 已提取发票：条数 + 总金额（含税）+ 进项/销项区分
   - 银行流水：条数 + 借方合计/贷方合计
   - 工资表：员工数 + 应发合计 + 实发合计
   - 费用报销：条数 + 金额合计
   - 应收应付：条数 + 应收合计 + 应付合计
2. **「开始自动分类」按钮**（醒目位置，蓝色主按钮）
3. 每种数据展示前 3 条预览（展开/收起）

### 阶段二：分类结果（已分类状态）

当 `result` 不为 `null` 时，展示：

1. **大统计条**（保留现有）：总笔数、收入/支出笔数、待确认笔数
2. **分类明细表格**（可展开各行确认）：
   - 字段：日期、摘要、对方、金额、科目、置信度、操作（确认/修改）
3. **待确认条目**：置信度 < 0.7 的高亮提示，需要逐条确认
4. **「重新分类」按钮**（次要按钮，允许重新运行分类）

## 数据流向

```
ImportPanel
  └─ 导入OK → importStore（invoices, bankTransactions, ...）
       └─ markImported() → hasImportedData = true
            └─ 自动跳转到 classify 阶段
                 ├─ ClassifyPanel 读取 importStore 原始数据 → 展示概览
                 └─ 点击「开始自动分类」
                      └─ 调用 classifyAll() 引擎
                           └─ 结果写入 classifyStore.result
                                └─ 展示分类结果
```

## 修改文件

| 文件 | 修改内容 |
|------|----------|
| `src/components/classify/ClassifyPanel.tsx` | 重写：两阶段展示逻辑 |
| 不新增 store，保持现有 importStore / classifyStore |

## 实现细节

### 数据概览卡片

每个卡片统一格式：
- 标题 + 图标 + 条数 + 总金额
- 颜色区分数据来源
- 预览条目列表（最多 3 条，点击展开全部）

### 分类触发

- 点击「开始自动分类」→ 组装 `classifyAll(invoices, bankTransactions, ...)` → 结果写入 `classifyStore.setResult()`
- 按钮显示加载状态

### 分类结果展示

- 统计条逻辑不变
- 新增分类表格，每条可确认
- 低置信度条目以黄色背景高亮
- 每条允许手动修改科目分类

## 不需要改

- importStore 和 classifyStore 数据结构不变
- 分类引擎规则不变
- AppShell 和 BottomProgressBar 不变
