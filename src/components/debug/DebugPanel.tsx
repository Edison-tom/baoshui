import { useState, useEffect, useRef, useCallback } from 'react'
import { logger, type LogEntry } from '../../utils/logger'

export function DebugPanel() {
  const [open, setOpen] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>(() => logger.getLogs())
  const listRef = useRef<HTMLDivElement>(null)
  const [filter, setFilter] = useState<LogEntry['level'] | 'all'>('all')
  const [copied, setCopied] = useState(false)

  // 自动刷新日志
  useEffect(() => {
    if (!open) return
    const timer = setInterval(() => {
      setLogs(logger.getLogs())
    }, 1000)
    return () => clearInterval(timer)
  }, [open])

  // 新日志自动滚动到底部
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [logs])

  // 一键复制
  const copyLogs = useCallback(() => {
    const filtered = filter === 'all' ? logs : logs.filter(l => l.level === filter)
    const text = filtered.map(log => {
      let line = `[${log.timestamp}][${log.level.toUpperCase()}][${log.module}] ${log.message}`
      if (log.detail) line += '\n' + log.detail
      if (log.stack) line += '\n' + log.stack
      return line
    }).join('\n\n---\n\n')
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [logs, filter])

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-10 h-10 rounded-full bg-slate-700 text-white text-xs
          shadow-lg hover:bg-slate-600 transition-colors"
        title="查看调试日志"
      >
        🐛
      </button>
    )
  }

  const filtered = filter === 'all' ? logs : logs.filter(l => l.level === filter)
  const errorCount = logs.filter(l => l.level === 'error').length

  return (
    <div className="fixed bottom-0 right-0 z-50 w-full max-w-lg h-80 bg-white border border-slate-200
      shadow-2xl rounded-t-xl flex flex-col text-xs">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-slate-50 rounded-t-xl">
        <span className="font-semibold text-slate-700">
          调试日志 {errorCount > 0 && <span className="text-red-500 ml-1">({errorCount} 个错误)</span>}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={copyLogs}
            className="text-xs text-slate-500 hover:text-slate-700 px-1.5 py-0.5 rounded hover:bg-slate-200 transition-colors"
          >
            {copied ? '✅ 已复制' : '📋 复制'}
          </button>
          <select
            value={filter}
            onChange={e => setFilter(e.target.value as LogEntry['level'] | 'all')}
            className="text-xs border border-slate-200 rounded px-1 py-0.5 outline-none"
          >
            <option value="all">全部</option>
            <option value="error">仅错误</option>
            <option value="warn">仅警告</option>
            <option value="info">仅信息</option>
          </select>
          <button onClick={() => logger.clear()} className="text-slate-400 hover:text-slate-600">
            清空
          </button>
          <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">
            ✕
          </button>
        </div>
      </div>

      {/* 日志列表 */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-1 font-mono">
        {filtered.length === 0 && (
          <p className="text-slate-400 text-center mt-8">暂无日志</p>
        )}
        {filtered.map(log => (
          <div key={log.id} className={`p-1.5 rounded ${
            log.level === 'error' ? 'bg-red-50 border-l-2 border-red-400' :
            log.level === 'warn' ? 'bg-amber-50 border-l-2 border-amber-400' :
            'bg-slate-50 border-l-2 border-blue-400'
          }`}>
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <span>{log.timestamp}</span>
              <span className={`font-medium ${
                log.level === 'error' ? 'text-red-600' :
                log.level === 'warn' ? 'text-amber-600' : 'text-blue-600'
              }`}>
                [{log.module}]
              </span>
            </div>
            <p className="text-slate-700 mt-0.5 break-all">{log.message}</p>
            {log.detail && (
              <pre className="mt-0.5 text-[10px] text-slate-500 whitespace-pre-wrap break-all bg-white/50 p-1 rounded">
                {log.detail.length > 500 ? log.detail.slice(0, 500) + '...' : log.detail}
              </pre>
            )}
            {log.stack && (
              <details className="mt-0.5">
                <summary className="text-[10px] text-slate-400 cursor-pointer hover:text-slate-600">堆栈</summary>
                <pre className="mt-0.5 text-[10px] text-slate-400 whitespace-pre-wrap break-all max-h-24 overflow-y-auto">
                  {log.stack}
                </pre>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
