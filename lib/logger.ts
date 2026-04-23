type Level = 'info' | 'warn' | 'error'

type LogContext = Record<string, unknown>

function emit(level: Level, event: string, ctx?: LogContext) {
  const entry = JSON.stringify({ level, event, ts: new Date().toISOString(), ...ctx })
  if (level === 'error') console.error(entry)
  else if (level === 'warn') console.warn(entry)
  else console.log(entry)
}

export const logger = {
  info:  (event: string, ctx?: LogContext) => emit('info',  event, ctx),
  warn:  (event: string, ctx?: LogContext) => emit('warn',  event, ctx),
  error: (event: string, ctx?: LogContext) => emit('error', event, ctx),
}
