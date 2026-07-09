import { useCompanyStore } from '../../stores/company'
import { useImportStore } from '../../stores/import'
import { useClassifyStore } from '../../stores/classify'
import { useWorkbenchStore } from '../../stores/workbench'
import { Header } from './Header'
import { BottomProgressBar } from './BottomProgressBar'
import { CompanyWizard } from '../company/CompanyWizard'
import { ImportPanel } from '../import/ImportPanel'
import { ClassifyPanel } from '../classify/ClassifyPanel'
import { Workbench } from '../workbench/Workbench'
import { DebugPanel } from '../debug/DebugPanel'

const STAGES = ['register', 'import', 'classify', 'declare', 'closing'] as const
type Stage = typeof STAGES[number]

export function AppShell() {
  const isRegistered = useCompanyStore(s => s.isRegistered)
  const hasImportedData = useImportStore(s => s.hasImportedData)
  const classifyResult = useClassifyStore(s => s.result)
  const currentStage = useWorkbenchStore(s => s.currentStage)
  const setStage = useWorkbenchStore(s => s.setStage)
  const isClosing = useWorkbenchStore(s => s.isClosing)

  const idx = STAGES.indexOf(currentStage as Stage)

  const handleBack = () => {
    if (idx <= 0) return
    const prev = STAGES[idx - 1]
    if (prev === 'classify' && !hasImportedData) return
    if (prev === 'import' && !isRegistered) return
    setStage(prev)
  }

  const handleForward = () => {
    if (idx >= STAGES.length - 1) return
    const next = STAGES[idx + 1]
    if (next === 'classify' && !hasImportedData) return
    if (next === 'import' && !isRegistered) return
    setStage(next)
  }

  const showBack = idx > 0 && !isClosing
  const showForward = idx < STAGES.length - 1 && !isClosing

  const forwardInfo = (() => {
    if (currentStage === 'import') {
      const disabled = !hasImportedData
      return { disabled, text: disabled ? '请先导入数据' : '前往分类确认 →', hint: disabled }
    }
    if (currentStage === 'classify') {
      const disabled = !classifyResult
      return { disabled, text: disabled ? '请先完成分类' : '前往申报计算 →', hint: disabled }
    }
    if (currentStage === 'declare') return { disabled: false, text: '完成申报 · 安全销毁数据 →', hint: false }
    return { disabled: true, text: '', hint: false }
  })()

  return (
    <div className="min-h-screen bg-white text-slate-700 font-sans">
      <Header />
      <main className="max-w-screen-2xl mx-auto pb-24">

        {/* 顶部导航栏 */}
        {(showBack || showForward) && (
          <div className="flex items-center justify-between px-6 pt-3">
            {showBack ? (
              <button onClick={handleBack}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
                ← 返回上一步
              </button>
            ) : <div />}
            {showForward && (
              <button
                onClick={() => {
                  if (currentStage === 'declare') {
                    useWorkbenchStore.getState().setClosing(true)
                    return
                  }
                  handleForward()
                }}
                disabled={forwardInfo.disabled}
                className={`text-xs transition-colors ${
                  forwardInfo.disabled
                    ? 'text-slate-300 cursor-not-allowed'
                    : 'text-blue-600 hover:text-blue-800'
                }`}
              >
                {forwardInfo.text}
              </button>
            )}
          </div>
        )}

        {/* 注册阶段 */}
        {currentStage === 'register' && <CompanyWizard />}

        {/* 导入阶段 */}
        {currentStage === 'import' && (
          <div className="px-6 py-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">导入数据</h2>
            <p className="text-sm text-slate-500 mb-6">
              拖入银行流水、发票、工资表、费用报销等文件，系统自动识别类型
            </p>
            <ImportPanel />
          </div>
        )}

        {/* 分类确认阶段 */}
        {currentStage === 'classify' && (
          <div className="px-6 py-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">分类确认</h2>
            <p className="text-sm text-slate-500 mb-6">
              {classifyResult ? '确认收入和支出分类是否正确，然后点击"确认无误，开始申报"' : '已导入数据的概览，点击"开始自动分类"后系统将匹配会计科目'}
            </p>
            <ClassifyPanel />
            {classifyResult && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => setStage('declare')}
                  className="px-8 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg
                    hover:bg-blue-700 shadow-sm"
                >
                  确认无误，开始申报 →
                </button>
              </div>
            )}
          </div>
        )}

        {/* 申报计算阶段 */}
        {currentStage === 'declare' && (
          <Workbench />
        )}

        {/* 结账销毁阶段 */}
        {currentStage === 'closing' && (
          <div className="px-6 py-8 text-center">
            <div className="max-w-md mx-auto">
              <div className="text-4xl mb-4">🔒</div>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">数据已安全销毁</h2>
              <p className="text-sm text-slate-500 mb-6">
                所有导入的财务数据已从浏览器清除，保护您的隐私安全。
              </p>
              <button
                onClick={() => {
                  useCompanyStore.getState().clearCompany()
                  useImportStore.getState().clearAll()
                  useClassifyStore.getState().clearResult()
                  setStage('register')
                }}
                className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
                开始下一次申报
              </button>
            </div>
          </div>
        )}
      </main>

      {/* 底部进度条 */}
      {!isClosing && <BottomProgressBar />}
      {!isClosing && <DebugPanel />}
    </div>
  )
}
