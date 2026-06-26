/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { CheckCircle2, XCircle, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

// ════════════════════════════════════════════════════════════
// TOAST SYSTEM — lightweight notification layer
// Usage:
//   const toast = useToast()
//   toast.success('Statement uploaded!')
//   toast.error('Failed to parse file.')
// ════════════════════════════════════════════════════════════

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id:      string
  type:    ToastType
  message: string
}

interface ToastContextValue {
  success: (message: string) => void
  error:   (message: string) => void
  warning: (message: string) => void
  info:    (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

/**
 * Hook to access toast notification functions.
 * Must be used inside ToastProvider.
 */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}

/**
 * Toast provider — wraps the app root to enable toasts everywhere.
 * Add to App.tsx around the Routes.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  /** Adds a new toast and auto-removes it after 4 seconds */
  const addToast = useCallback((type: ToastType, message: string) => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const value: ToastContextValue = {
    success: (msg) => addToast('success', msg),
    error:   (msg) => addToast('error', msg),
    warning: (msg) => addToast('warning', msg),
    info:    (msg) => addToast('info', msg),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Toast stack — fixed to bottom-right on desktop, bottom-center on mobile */}
      <div
        className={cn(
          'fixed z-50 flex flex-col gap-2 pointer-events-none',
          // Mobile: centered, above BottomNav
          'bottom-[calc(72px+env(safe-area-inset-bottom)+8px)] inset-x-4',
          // Desktop: bottom-right corner
          'lg:bottom-6 lg:right-6 lg:left-auto lg:w-80 lg:inset-x-auto',
        )}
        aria-live="polite"
        aria-label="Notifications"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// ════════════════════════════════════════════════════════════
// TOAST ITEM — individual notification
// ════════════════════════════════════════════════════════════

const TOAST_CONFIG: Record<ToastType, {
  Icon:       React.ElementType
  iconClass:  string
  bgClass:    string
  borderClass: string
}> = {
  success: {
    Icon:        CheckCircle2,
    iconClass:   'text-green-primary',
    bgClass:     'bg-white',
    borderClass: 'border-green-primary/30',
  },
  error: {
    Icon:        XCircle,
    iconClass:   'text-data-alert',
    bgClass:     'bg-white',
    borderClass: 'border-data-alert/30',
  },
  warning: {
    Icon:        AlertCircle,
    iconClass:   'text-data-warning',
    bgClass:     'bg-white',
    borderClass: 'border-data-warning/30',
  },
  info: {
    Icon:        Info,
    iconClass:   'text-data-primary',
    bgClass:     'bg-white',
    borderClass: 'border-data-primary/30',
  },
}

interface ToastItemProps {
  toast:     Toast
  onDismiss: (id: string) => void
}

/**
 * Individual toast notification item.
 * Fades in on mount. Dismiss button removes it immediately.
 */
function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [visible, setVisible] = useState(false)
  const { Icon, iconClass, bgClass, borderClass } = TOAST_CONFIG[toast.type]

  // Fade in after mount
  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(t)
  }, [])

  return (
    <div
      className={cn(
        'pointer-events-auto flex items-start gap-3 p-3.5 rounded-card border shadow-card',
        'transition-all duration-300',
        bgClass,
        borderClass,
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
      )}
      role="alert"
    >
      <Icon size={17} className={cn('shrink-0 mt-0.5', iconClass)} aria-hidden="true" />

      <p className="flex-1 text-sm text-gray-800 leading-snug">{toast.message}</p>

      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 p-0.5 rounded text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </div>
  )
}
