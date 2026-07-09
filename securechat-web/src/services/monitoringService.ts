import { env } from '@/lib/env'
import { logger } from './loggingService'

interface SentryInstance {
  init(opts: { dsn: string; environment: string }): void
  captureException?(error: Error, context?: Record<string, unknown>): void
  captureMessage?(message: string, level?: string): void
}

interface PostHogInstance {
  init(key: string, opts: { api_host?: string }): void
  identify(userId: string, traits?: Record<string, unknown>): void
  capture(event: string, properties?: Record<string, unknown>): void
}

interface MonitoringInstance {
  captureException(error: Error, context?: Record<string, unknown>): void
  captureMessage(message: string, level?: string, context?: Record<string, unknown>): void
  identify(userId: string, traits?: Record<string, unknown>): void
  track(event: string, properties?: Record<string, unknown>): void
}

class NoopMonitoring implements MonitoringInstance {
  captureException(_error: Error, _context?: Record<string, unknown>): void {}
  captureMessage(_message: string, _level?: string, _context?: Record<string, unknown>): void {}
  identify(_userId: string, _traits?: Record<string, unknown>): void {}
  track(_event: string, _properties?: Record<string, unknown>): void {}
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`)
    if (existing) { resolve(); return }
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`))
    document.head.appendChild(script)
  })
}

function createMonitoring(): MonitoringInstance {
  const providers: string[] = []
  if (env.SENTRY_DSN) providers.push('sentry')
  if (env.POSTHOG_KEY) providers.push('posthog')

  if (providers.length === 0) return new NoopMonitoring()

  class CompositeMonitoring implements MonitoringInstance {
    private sentryInitialized = false
    private posthogInitialized = false
    private sentryClient: SentryInstance | null = null
    private posthogClient: PostHogInstance | null = null

    private async initSentry(): Promise<void> {
      if (this.sentryInitialized || !env.SENTRY_DSN) return
      this.sentryInitialized = true
      try {
        await loadScript('https://browser.sentry-cdn.com/8.52.0/bundle.min.js')
        const Sentry = (window as any).Sentry as SentryInstance
        if (Sentry) {
          Sentry.init({ dsn: env.SENTRY_DSN, environment: import.meta.env.MODE })
          this.sentryClient = Sentry
          logger.info('system', 'Sentry initialized')
        }
      } catch {
        logger.warn('system', 'Sentry initialization failed')
      }
    }

    private async initPostHog(): Promise<void> {
      if (this.posthogInitialized || !env.POSTHOG_KEY) return
      this.posthogInitialized = true
      try {
        await loadScript('https://cdn.posthog.com/1.188.2/dist/posthog.js')
        const posthog = (window as any).posthog as PostHogInstance
        if (posthog) {
          this.posthogClient = posthog
          this.posthogClient.init(env.POSTHOG_KEY, { api_host: env.POSTHOG_HOST || undefined })
          logger.info('system', 'PostHog initialized')
        }
      } catch {
        logger.warn('system', 'PostHog initialization failed')
      }
    }

    async captureException(error: Error, context?: Record<string, unknown>): Promise<void> {
      logger.error('system', 'Exception captured', error, context)
      if (providers.includes('sentry')) {
        await this.initSentry()
        if (this.sentryClient?.captureException) {
          try { this.sentryClient.captureException(error, context) } catch { /* ignore */ }
        }
      }
    }

    async captureMessage(message: string, level?: string, _context?: Record<string, unknown>): Promise<void> {
      logger.info('system', `[${level || 'info'}] ${message}`)
      if (providers.includes('sentry')) {
        await this.initSentry()
        if (this.sentryClient?.captureMessage) {
          try { this.sentryClient.captureMessage(message, level) } catch { /* ignore */ }
        }
      }
    }

    async identify(userId: string, traits?: Record<string, unknown>): Promise<void> {
      if (providers.includes('posthog') && env.POSTHOG_KEY) {
        await this.initPostHog()
        if (this.posthogClient) {
          try { this.posthogClient.identify(userId, traits) } catch { /* ignore */ }
        }
      }
    }

    async track(event: string, properties?: Record<string, unknown>): Promise<void> {
      if (providers.includes('posthog') && env.POSTHOG_KEY) {
        await this.initPostHog()
        if (this.posthogClient) {
          try { this.posthogClient.capture(event, properties) } catch { /* ignore */ }
        }
      }
    }
  }

  return new CompositeMonitoring()
}

export const monitor = createMonitoring()
