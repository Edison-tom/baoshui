import { useCompanyStore } from '../../stores/company'
import { useImportStore } from '../../stores/import'
import { useWorkbenchStore, getStageIndex, getStageLabel, getStageDescription, STAGE_ORDER, type AppStage } from '../../stores/workbench'

export function BottomProgressBar() {
  const currentStage = useWorkbenchStore(s => s.currentStage)
  const setStage = useWorkbenchStore(s => s.setStage)
  const isRegistered = useCompanyStore(s => s.isRegistered)
  const isImportComplete = useImportStore(s => s.isImportComplete)
  const currentIdx = getStageIndex(currentStage)
  const prevStage = currentIdx > 0 ? STAGE_ORDER[currentIdx - 1] : null

  const canJumpTo = (stage: AppStage, idx: number): boolean => {
    if (idx >= currentIdx) return false // 不能跳转到当前或之后的阶段
    if (stage === 'register') return true // 基础信息始终可回
    if (stage === 'import') return isRegistered
    if (stage === 'classify') return isImportComplete
    if (stage === 'declare') return isImportComplete
    return false
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="max-w-screen-2xl mx-auto px-6 py-3">
        {/* 进度条 — 可点击 */}
        <div className="flex items-center gap-2 mb-2">
          {STAGE_ORDER.map((stage, i) => {
            const clickable = canJumpTo(stage, i)
            return (
              <button
                key={stage}
                onClick={() => clickable && setStage(stage)}
                disabled={!clickable}
                className={`flex-1 relative ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
                title={clickable ? `返回「${getStageLabel(stage)}」` : undefined}
              >
                <div className={`h-1.5 rounded-full ${
                  i <= currentIdx ? 'bg-blue-600' : 'bg-slate-200'
                } ${i === currentIdx ? 'animate-pulse' : ''}`} />
                <div className={`absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 ${
                  i < currentIdx ? 'bg-blue-600 border-blue-600' :
                  i === currentIdx ? 'bg-blue-600 border-white shadow-sm' :
                  'bg-white border-slate-300'
                }`} />
              </button>
            )
          })}
        </div>

        {/* 阶段文字 */}
        <div className="flex items-center justify-between text-xs">
          {STAGE_ORDER.map((stage, i) => {
            const clickable = canJumpTo(stage, i)
            return (
              <button
                key={stage}
                onClick={() => clickable && setStage(stage)}
                disabled={!clickable}
                className={`text-center ${clickable ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                style={{ width: '20%' }}
                title={clickable ? `返回「${getStageLabel(stage)}」` : undefined}
              >
                <span className={`${
                  i === currentIdx ? 'text-blue-700 font-semibold' :
                  i < currentIdx ? 'text-slate-500' : 'text-slate-300'
                } ${clickable ? 'hover:text-blue-600' : ''}`}>
                  {getStageLabel(stage)}
                </span>
              </button>
            )
          })}
        </div>

        {/* 状态提示 */}
        <p className="text-xs text-slate-400 text-center mt-1">
          {prevStage && <span>✅ {getStageLabel(prevStage)}完成 &nbsp;→&nbsp; </span>}
          <span className="text-blue-600 font-medium">{getStageLabel(currentStage)}</span>
          <span className="text-slate-300 ml-1">— {getStageDescription(currentStage)}</span>
        </p>
      </div>
    </div>
  )
}
