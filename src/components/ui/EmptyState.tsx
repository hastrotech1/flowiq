import { cn } from '@/lib/utils'

// ════════════════════════════════════════════════════════════
// EMPTY STATE — shown when a page/section has no data
// ════════════════════════════════════════════════════════════

interface EmptyStateProps {
  /** SVG or icon component to display */
  icon?:       React.ReactNode
  title:       string
  description: string
  /** Optional CTA button */
  action?:     React.ReactNode
  className?:  string
  /** Compact mode for use inside cards (less vertical padding) */
  compact?:    boolean
}

/**
 * Standard empty state component.
 * Used on every page when there is no data to display —
 * no statements uploaded, no transactions match the filter, etc.
 */
export default function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-10 px-4' : 'py-16 px-6',
        className,
      )}
    >
      {/* Illustration / icon */}
      {icon && (
        <div className="mb-4 w-14 h-14 rounded-full bg-surface-muted flex items-center justify-center text-data-secondary">
          {icon}
        </div>
      )}

      <h3 className="text-sm font-semibold text-gray-800 mb-1">{title}</h3>
      <p className="text-xs text-data-secondary leading-relaxed max-w-xs">
        {description}
      </p>

      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
