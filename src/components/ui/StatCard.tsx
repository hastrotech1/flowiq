import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

// ════════════════════════════════════════════════════════════
// STAT CARD — metric display card for dashboard/reports
// Shows: label, primary value, optional trend, optional sub-value
// ════════════════════════════════════════════════════════════

interface StatCardProps {
  /** Short label e.g. "Total Spent" */
  label:       string
  /** Primary formatted value e.g. "₦1,250,000.00" */
  value:       string
  /** Optional smaller line below the value */
  subValue?:   string
  /** Percentage change vs previous period */
  trend?:      number
  /** Which color scheme to use */
  variant?:    'default' | 'debit' | 'credit' | 'neutral'
  /** Icon to display in the top-right corner */
  icon?:       React.ReactNode
  className?:  string
  /** Called when the card is clicked (makes it interactive) */
  onClick?:    () => void
}

/**
 * Dashboard metric card.
 * Displays a key financial figure with optional trend indicator.
 * Used on the Dashboard, Reports, and Summary pages.
 *
 * Variants:
 * - default: green accent (used for general/positive values)
 * - debit:   red accent (total spent)
 * - credit:  green accent (total received)
 * - neutral: gray accent (counts, averages)
 */
export default function StatCard({
  label,
  value,
  subValue,
  trend,
  variant = 'default',
  icon,
  className,
  onClick,
}: StatCardProps) {
  const variantStyles = {
    default: 'border-l-green-primary  bg-green-subtle/30',
    debit:   'border-l-data-alert    bg-red-50/30',
    credit:  'border-l-green-accent  bg-green-subtle/30',
    neutral: 'border-l-data-secondary bg-surface-muted/50',
  }

  const valueStyles = {
    default: 'text-gray-900',
    debit:   'text-data-alert',
    credit:  'text-green-primary',
    neutral: 'text-gray-900',
  }

  return (
    <div
      className={cn(
        'bg-white rounded-card border border-surface-border shadow-card',
        'border-l-4 p-4 flex flex-col gap-2',
        variantStyles[variant],
        onClick && 'cursor-pointer hover:shadow-card-hover transition-shadow active:scale-[0.99]',
        className,
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Label row + icon */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-data-secondary uppercase tracking-wide">
          {label}
        </span>
        {icon && (
          <span className="text-data-secondary/60" aria-hidden="true">
            {icon}
          </span>
        )}
      </div>

      {/* Primary value */}
      <span
        className={cn(
          'text-amount-md font-bold font-amount leading-none tabular-nums',
          valueStyles[variant],
        )}
      >
        {value}
      </span>

      {/* Sub-value + trend row */}
      {(subValue || trend !== undefined) && (
        <div className="flex items-center justify-between gap-2 mt-0.5">
          {subValue && (
            <span className="text-xs text-data-secondary truncate">{subValue}</span>
          )}
          {trend !== undefined && <TrendChip value={trend} />}
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// TREND CHIP — percentage change indicator
// ════════════════════════════════════════════════════════════

interface TrendChipProps {
  /** Percentage change (positive = up, negative = down) */
  value: number
}

/**
 * Small percentage trend indicator.
 * Green = positive trend (more credit / less debit),
 * Red = negative trend, Gray = no change.
 *
 * NOTE: trend direction meaning depends on context.
 * For spend (debit), higher = worse (show red).
 * For income (credit), higher = better (show green).
 * The StatCard consumer is responsible for passing the
 * correctly-signed value.
 */
export function TrendChip({ value }: TrendChipProps) {
  const isUp      = value > 0
  const isDown    = value < 0
  const isNeutral = value === 0

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-chip',
        isUp      && 'text-data-positive bg-green-subtle',
        isDown    && 'text-data-alert    bg-red-50',
        isNeutral && 'text-data-neutral  bg-surface-muted',
      )}
      aria-label={`${value > 0 ? 'Up' : value < 0 ? 'Down' : 'No change'} ${Math.abs(value)}%`}
    >
      {isUp      && <TrendingUp   size={11} aria-hidden="true" />}
      {isDown    && <TrendingDown size={11} aria-hidden="true" />}
      {isNeutral && <Minus        size={11} aria-hidden="true" />}
      {Math.abs(value).toFixed(1)}%
    </span>
  )
}
