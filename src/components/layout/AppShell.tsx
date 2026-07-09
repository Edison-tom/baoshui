import { useEffect } from 'react'
import { useCompanyStore } from '../../stores/company'
import { useImportStore } from '../../stores/import'
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
  const isImportComplete = useImportStore(s => s.isImportComplete)
  const currentStage = useWorkbenchStore(s => s.currentStage)
  const setStage = useWorkbenchStore(s => s.setStage)
  const navigationDirection = useWorkbenchStore(s => s.navigationDirection)
  const setNavigationDirection = useWorkbenchStore(s => s.setNavigationDirection)
  const isClosing = useWorkbenchStore(s => s.isClosing)

  // 自动向前流转（仅当非手动返回时触发）
  useEffect(() => {
    if (navigationDirection === 'back') {
      setNavigationDirection(null)
      return
    }
    if (isRegistered && currentStage === 'register') {
      setStage('import')
    }
  }, [isRegistered, currentStage, setStage, navigationDirection, setNavigationDirection])

  useEffect(() => {
    if (navigationDirection === 'back') {
      setNavigationDirection(null)
      return
    }
    if (isImportComplete && currentStage === 'import') {
      setStage('classify')
    }
  }, [isImportComplete, currentStage, setStage, navigationDirection, setNavigationDirection])

  const handleBack = () => {
    const idx = STAGES.indexOf(currentStage as Stage)
    if (idx <= 0) return
    const prev = STAGES[idx - 1]
    // 如果上一步骤数据不存在，不允许返回
    if (prev === 'classify' && !isImportComplete) return
    if (prev === 'import' && !isRegistered) return
    setNavigationDirection('back')
    setStage(prev)
  }

  const showBackLink = currentStage !== 'register' && !isClosing

  return (
    <div className="min-h-screen bg-white text-slate-700 font-sans">
      <Header />
      <main className="max-w-screen-2xl mx-auto pb-24">

        {/* 返回上一步链接 */}
        {showBackLink && (
          <div className="px-6 pt-3">
            <button
              onClick={handleBack}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              ← 返回上一步
            </button>
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
            <p className="text-sm text-slate-500 mb-6">确认收入和支出分类是否正确，然后在下方点击"开始申报"</p>
            <ClassifyPanel />
            <div className="mt-6 text-center">
              <button
                onClick={() => setStage('declare')}
                className="px-8 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg
                  hover:bg-blue-700 shadow-sm"
              >
                确认无误，开始申报 →
              </button>
            </div>
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
