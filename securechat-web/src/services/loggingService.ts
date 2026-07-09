import { env } from '@/lib/env'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'
export type LogCategory = 'auth' | 'payment' | 'ai' | 'message' | 'report' | 'system' | 'security'

interface LogEntry {
  level: LogLevel
  category: LogCategory
  message: string
  timestamp: string
  userId?: number
  metadata?: Record<string, unknown>
  error?: Error
}

const SENSITIVE_FIELDS = new Set([
  'password', 'token', 'secret', 'key', 'authorization',
  'session', 'jwt', 'accessToken', 'refreshToken',
])

function sanitize(metadata: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(metadata)) {
    if (SENSITIVE_FIELDS.has(key.toLowerCase())) {
      result[key] = '[REDACTED]'
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitize(value as Record<string, unknown>)
    } else {
      result[key] = value
    }
  }
  return result
}

class LoggingService {
  private buffer: LogEntry[] = []
  private flushTimer: ReturnType<typeof setTimeout> | null = null
  private readonly FLUSH_INTERVAL = 5000

  private enqueue(entry: LogEntry): void {
    this.buffer.push(entry)
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), this.FLUSH_INTERVAL)
    }
  }

  private async flush(): Promise<void> {
    this.flushTimer = null
    if (this.buffer.length === 0) return

    const batch = this.buffer.splice(0)
    this.buffer = []

    for (const entry of batch) {
      this.consoleLog(entry)
    }
  }

  private consoleLog(entry: LogEntry): void {
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.category}]`
    const data = entry.metadata ? sanitize(entry.metadata) : undefined

    switch (entry.level) {
      case 'error':
        console.error(prefix, entry.message, data, entry.error || '')
        break
      case 'warn':
        console.warn(prefix, entry.message, data)
        break
      case 'info':
        console.info(prefix, entry.message, data)
        break
      default:
        console.debug(prefix, entry.message, data)
    }
  }

  debug(category: LogCategory, message: string, metadata?: Record<string, unknown>): void {
    this.enqueue({ level: 'debug', category, message, timestamp: new Date().toISOString(), metadata })
  }

  info(category: LogCategory, message: string, metadata?: Record<string, unknown>): void {
    this.enqueue({ level: 'info', category, message, timestamp: new Date().toISOString(), metadata })
  }

  warn(category: LogCategory, message: string, metadata?: Record<string, unknown>): void {
    this.enqueue({ level: 'warn', category, message, timestamp: new Date().toISOString(), metadata })
  }

  error(category: LogCategory, message: string, error?: Error, metadata?: Record<string, unknown>): void {
    this.enqueue({
      level: 'error',
      category,
      message,
      timestamp: new Date().toISOString(),
      error,
      metadata,
    })
  }

  auth(message: string, metadata?: Record<string, unknown>): void {
    this.info('auth', message, metadata)
  }

  payment(message: string, metadata?: Record<string, unknown>): void {
    this.info('payment', message, metadata)
  }

  ai(message: string, metadata?: Record<string, unknown>): void {
    this.info('ai', message, metadata)
  }
}

export const logger = new LoggingService()
