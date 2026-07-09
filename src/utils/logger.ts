/**
 * 应用内日志工具
 * 将应用运行过程中的错误/调试信息记录在内存中，可通过界面查看
 */

export interface LogEntry {
  id: number
  timestamp: string
  level: 'error' | 'warn' | 'info'
  module: string
  message: string
  detail?: string
  stack?: string
}

const MAX_LOG = 200
let logs: LogEntry[] = []
let nextId = 1

function add(level: LogEntry['level'], module: string, message: string, detail?: unknown) {
  const entry: LogEntry = {
    id: nextId++,
    timestamp: new Date().toLocaleString('zh-CN', { hour12: false }),
    level,
    module,
    message,
    detail: detail ? (typeof detail === 'string' ? detail : JSON.stringify(detail, null, 2)) : undefined,
    stack: detail instanceof Error ? (detail as Error).stack : undefined,
  }
  logs.push(entry)
  if (logs.length > MAX_LOG) logs = logs.slice(-MAX_LOG)

  // 同时输出到控制台
  const prefix = `[${entry.timestamp}][${module}]`
  if (level === 'error') {
    console.error(prefix, message, detail || '')
  } else if (level === 'warn') {
    console.warn(prefix, message, detail || '')
  } else {
    console.log(prefix, message, detail || '')
  }
}

export const logger = {
  error: (module: string, message: string, detail?: unknown) => add('error', module, message, detail),
  warn: (module: string, message: string, detail?: unknown) => add('warn', module, message, detail),
  info: (module: string, message: string, detail?: unknown) => add('info', module, message, detail),
  getLogs: () => [...logs],
  clear: () => { logs = []; nextId = 1 },
}
