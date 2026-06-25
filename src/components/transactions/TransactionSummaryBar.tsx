import { cn, formatNaira, formatNairaCompact } from '@/lib/utils'
import type { TransactionSummary } from '@/types'

// ════════════════════════════════════════════════════════════
// TRANSACTION SUMMARY BAR
// Sticky bar shown above the transaction table that displays
// real-time totals for the current filter selection.
// ════════════════════════════════════════════════════════════

interface TransactionSummaryBarProps {
  summary:     TransactionSummary
  resultCount: number
  className?:  string
}

/**
 * Displays a compact summary of the currently filtered
 * transaction set: total spent, total received, net flow,
 * and the count of matched transactions.
 *
 * Updates in real-time as filters change — no user action needed.
 */
export default function TransactionSummaryBar({
  summary,
  resultCount,
  className,
}: TransactionSummaryBarProps) {
  const netPositive = summary.netFlow >= 0

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 flex-wrap',
        'px-4 py-3 bg-white border border-surface-border rounded-card shadow-card',
        className,
      )}
    >
      {/* Result count */}
      <span className="text-xs font-medium text-data-secondary shrink-0">
        {resultCount.toLocaleString()} transaction{resultCount !== 1 ? 's' : ''}
      </span>

      {/* Metric pills */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Total spent */}
        <Metric
          label="Spent"
          value={formatNairaCompact(summary.totalDebits)}
          full={formatNaira(summary.totalDebits)}
          color="debit"
        />

        <span className="text-surface-border text-base leading-none" aria-hidden="true">|</span>

        {/* Total received */}
        <Metric
          label="Received"
          value={formatNairaCompact(summary.totalCredits)}
          full={formatNaira(summary.totalCredits)}
          color="credit"
        />

        <span className="text-surface-border text-base leading-none" aria-hidden="true">|</span>

        {/* Net flow */}
        <Metric
          label="Net"
          value={(netPositive ? '+' : '−') + formatNairaCompact(Math.abs(summary.netFlow))}
          full={(netPositive ? '+' : '−') + formatNaira(Math.abs(summary.netFlow))}
          color={netPositive ? 'credit' : 'debit'}
        />
      </div>
    </div>
  )
}

// ── Metric pill ────────────────────────────────────────────

interface MetricProps {
  label: string
  value: string
  full:  string   // used in title attribute for accessibility
  color: 'debit' | 'credit'
}

/**
 * Single label + value metric inside the summary bar.
 * Color-coded: debit = red, credit = green.
 */
function Metric({ label, value, full, color }: MetricProps) {
  return (
    <div className="flex items-baseline gap-1.5" title={full}>
      <span className="text-[10px] uppercase tracking-wide text-data-secondary font-medium">
        {label}
      </span>
      <span
        className={cn(
          'text-sm font-bold tabular-nums font-amount',
          color === 'debit' ? 'amount-debit' : 'amount-credit',
        )}
      >
        {value}
      </span>
    </div>
  )
}
