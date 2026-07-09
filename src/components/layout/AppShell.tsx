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

export function AppShell() {
  const isRegistered = useCompanyStore(s => s.isRegistered)
  const isImportComplete = useImportStore(s => s.isImportComplete)
  const currentStage = useWorkbenchStore(s => s.currentStage)
  const setStage = useWorkbenchStore(s => s.setStage)
  const isClosing = useWorkbenchStore(s => s.isClosing)

  // 自动流转：注册完成 → 导入阶段
  useEffect(() => {
    if (isRegistered && currentStage === 'register') {
      setStage('import')
    }
  }, [isRegistered, currentStage, setStage])

  // 自动流转：导入完成 → 分类确认阶段
  useEffect(() => {
    if (isImportComplete && currentStage === 'import') {
      setStage('classify')
    }
  }, [isImportComplete, currentStage, setStage])

  return (
    <div className="min-h-screen bg-white text-slate-700 font-sans">
      <Header />
      <main className="max-w-screen-2xl mx-auto pb-24">
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
    </div>
  )
}
