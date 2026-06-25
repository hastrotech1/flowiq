import { cn } from '@/lib/utils'

// ════════════════════════════════════════════════════════════
// CONFIRM DIALOG — reusable modal for destructive actions
// ════════════════════════════════════════════════════════════

interface ConfirmDialogProps {
  title:          string
  description:    string
  confirmLabel?:  string
  cancelLabel?:   string
  danger?:        boolean
  loading?:       boolean
  onConfirm:      () => void
  onCancel:       () => void
}

/**
 * Reusable confirmation dialog for destructive actions.
 * Renders as a centered modal on desktop, bottom sheet on mobile.
 * Closes on backdrop click.
 *
 * Usage:
 *   <ConfirmDialog
 *     title="Delete Statement?"
 *     description="This cannot be undone."
 *     danger
 *     onConfirm={handleDelete}
 *     onCancel={() => setOpen(false)}
 *   />
 */
export default function ConfirmDialog({
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel  = 'Cancel',
  danger       = false,
  loading      = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/50 px-4 pb-4 lg:pb-0"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div className="bg-white w-full max-w-sm rounded-card p-6 flex flex-col gap-4 shadow-xl">
        <div>
          <h3 id="confirm-title" className="text-base font-semibold text-gray-900">
            {title}
          </h3>
          <p className="text-sm text-data-secondary leading-relaxed mt-1.5">
            {description}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 h-11 rounded-btn border border-surface-border text-sm font-medium text-gray-700 hover:bg-surface-muted transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              'flex-1 h-11 rounded-btn text-sm font-semibold transition-colors disabled:opacity-60',
              danger
                ? 'bg-data-alert text-white hover:bg-red-600'
                : 'bg-green-primary text-white hover:bg-green-deep',
            )}
          >
            {loading ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
