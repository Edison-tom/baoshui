import { useWorkbenchStore, getStageIndex, getStageLabel, getStageDescription, STAGE_ORDER } from '../../stores/workbench'

export function BottomProgressBar() {
  const currentStage = useWorkbenchStore(s => s.currentStage)
  const currentIdx = getStageIndex(currentStage)
  const prevStage = currentIdx > 0 ? STAGE_ORDER[currentIdx - 1] : null

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="max-w-screen-2xl mx-auto px-6 py-3">
        {/* 进度条 */}
        <div className="flex items-center gap-2 mb-2">
          {STAGE_ORDER.map((stage, i) => (
            <div key={stage} className="flex-1 relative">
              <div className={`h-1.5 rounded-full ${
                i <= currentIdx ? 'bg-blue-600' : 'bg-slate-200'
              } ${i === currentIdx ? 'animate-pulse' : ''}`} />
              <div className={`absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 ${
                i < currentIdx ? 'bg-blue-600 border-blue-600' :
                i === currentIdx ? 'bg-blue-600 border-white shadow-sm' :
                'bg-white border-slate-300'
              }`} />
            </div>
          ))}
        </div>

        {/* 阶段文字 */}
        <div className="flex items-center justify-between text-xs">
          {STAGE_ORDER.map((stage, i) => (
            <div key={stage} className="text-center" style={{ width: '20%' }}>
              <span className={`${
                i === currentIdx ? 'text-blue-700 font-semibold' :
                i < currentIdx ? 'text-slate-500' : 'text-slate-300'
              }`}>
                {getStageLabel(stage)}
              </span>
            </div>
          ))}
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
