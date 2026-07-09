import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'
import { logger } from '@/services/loggingService'
import { monitor } from '@/services/monitoringService'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })
    logger.error('system', 'React error boundary caught error', error, {
      componentStack: errorInfo.componentStack,
    })
    monitor.captureException(error, { componentStack: errorInfo.componentStack })
    this.props.onError?.(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 p-8" role="alert">
          <AlertTriangle className="w-12 h-12 text-red-500" aria-hidden="true" />
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p className="text-sm text-gray-500">{this.state.error?.message || 'An unexpected error occurred'}</p>
          <Button
            onClick={() => this.setState({ hasError: false })}
            aria-label="Try to recover from error"
          >
            Try again
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
