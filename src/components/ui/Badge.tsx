import { cn } from '@/lib/utils'

// ════════════════════════════════════════════════════════════
// BADGE / CHIP — small label for categories, tags, types
// ════════════════════════════════════════════════════════════

type BadgeVariant = 'debit' | 'credit' | 'neutral' | 'warning' | 'info' | 'custom'

interface BadgeProps {
  children:   React.ReactNode
  variant?:   BadgeVariant
  /** Used when variant='custom' — hex color string */
  color?:     string
  className?: string
  dot?:       boolean
}

/**
 * Small inline badge / chip component.
 * Used for: transaction type (Dr/Cr), categories, statement labels.
 */
export default function Badge({
  children,
  variant = 'neutral',
  color,
  className,
  dot,
}: BadgeProps) {
  const variantStyles: Record<BadgeVariant, string> = {
    debit:   'bg-red-50   text-data-alert   border-red-100',
    credit:  'bg-green-subtle text-green-deep border-green-muted',
    neutral: 'bg-surface-muted text-data-secondary border-surface-border',
    warning: 'bg-orange-50 text-data-warning border-orange-100',
    info:    'bg-blue-50  text-data-primary  border-blue-100',
    custom:  '',
  }

  const customStyle = variant === 'custom' && color
    ? { backgroundColor: `${color}18`, color, borderColor: `${color}30` }
    : undefined

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-chip',
        'text-[11px] font-medium border',
        variantStyles[variant],
        className,
      )}
      style={customStyle}
    >
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={color ? { backgroundColor: color } : undefined}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  )
}
