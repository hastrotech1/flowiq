import { Component, type ReactNode, type ErrorInfo } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

// ════════════════════════════════════════════════════════════
// ERROR BOUNDARY
// Catches unhandled React render errors and shows a graceful
// fallback UI instead of a blank screen.
// ════════════════════════════════════════════════════════════

interface Props {
  children:  ReactNode
  /** Custom fallback UI — receives error + reset fn */
  fallback?: (error: Error, reset: () => void) => ReactNode
  /** Identifies which part of the app threw (for logging) */
  context?:  string
}

interface State {
  error:  Error | null
  hasError: boolean
}

/**
 * Class-based error boundary wrapping sections of the app.
 * Catches errors in the component tree below it during render,
 * in lifecycle methods, and in constructors.
 *
 * Usage:
 *   <ErrorBoundary context="Dashboard charts">
 *     <SpendTrendChart />
 *   </ErrorBoundary>
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null, hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { error, hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // In production you'd send this to Sentry / LogRocket
    console.error(
      `[ErrorBoundary${this.props.context ? ` — ${this.props.context}` : ''}]`,
      error,
      info.componentStack,
    )
  }

  /** Resets the error state, allowing the subtree to re-render */
  reset = () => this.setState({ error: null, hasError: false })

  render() {
    const { hasError, error } = this.state
    const { children, fallback } = this.props

    if (!hasError || !error) return children

    // Custom fallback takes priority
    if (fallback) return fallback(error, this.reset)

    // Default fallback UI
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 px-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
          <AlertTriangle size={22} className="text-data-alert" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            Something went wrong
          </h3>
          <p className="text-xs text-data-secondary max-w-xs leading-relaxed">
            {error.message || 'An unexpected error occurred in this section.'}
          </p>
        </div>
        <button
          onClick={this.reset}
          className="flex items-center gap-2 h-9 px-4 rounded-btn border border-surface-border text-sm font-medium text-gray-700 hover:bg-surface-muted transition-colors"
        >
          <RefreshCw size={14} /> Try Again
        </button>
      </div>
    )
  }
}

// ════════════════════════════════════════════════════════════
// PAGE ERROR BOUNDARY — full-page fallback for route-level errors
// ════════════════════════════════════════════════════════════

interface PageErrorBoundaryProps {
  children: ReactNode
}

/**
 * Full-page error boundary for wrapping lazy-loaded route components.
 * Shows a centered error with a "Reload page" button.
 */
export class PageErrorBoundary extends Component<PageErrorBoundaryProps, State> {
  constructor(props: PageErrorBoundaryProps) {
    super(props)
    this.state = { error: null, hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { error, hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[PageErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="min-h-[100dvh] bg-surface-gray flex flex-col items-center justify-center gap-5 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
          <AlertTriangle size={28} className="text-data-alert" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Page failed to load</h2>
          <p className="text-sm text-data-secondary max-w-sm leading-relaxed">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 h-10 px-5 rounded-btn bg-green-primary text-white text-sm font-semibold hover:bg-green-deep transition-colors"
        >
          <RefreshCw size={15} /> Reload Page
        </button>
      </div>
    )
  }
}
