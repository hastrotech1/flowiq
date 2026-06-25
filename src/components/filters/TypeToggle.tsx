import { cn } from '@/lib/utils'
import { useFiltersStore } from '@/store/filters.store'
import type { TransactionFilters } from '@/types'

// ════════════════════════════════════════════════════════════
// TYPE TOGGLE — All / Debit / Credit segmented control
// ════════════════════════════════════════════════════════════

type TxType = TransactionFilters['transactionType']

const OPTIONS: { value: TxType; label: string }[] = [
  { value: 'all',    label: 'All'     },
  { value: 'debit',  label: 'Debits'  },
  { value: 'credit', label: 'Credits' },
]

/**
 * Segmented control that filters transactions by type.
 * Reads/writes `transactionType` in the global filters store.
 * Used in the Transactions page filter bar.
 */
export default function TypeToggle() {
  const type    = useFiltersStore((s) => s.transactionType)
  const setType = useFiltersStore((s) => s.setTransactionType)

  return (
    <div
      className="flex h-10 rounded-input border border-surface-border bg-surface-muted p-0.5 gap-0.5"
      role="group"
      aria-label="Transaction type filter"
    >
      {OPTIONS.map(({ value, label }) => {
        const active = type === value
        return (
          <button
            key={value}
            onClick={() => setType(value)}
            className={cn(
              'flex-1 rounded-[7px] text-xs font-medium transition-all duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-accent/40',
              active
                ? value === 'debit'
                  ? 'bg-white text-data-alert shadow-sm'
                  : value === 'credit'
                    ? 'bg-white text-data-positive shadow-sm'
                    : 'bg-white text-gray-800 shadow-sm'
                : 'text-data-secondary hover:text-gray-700',
            )}
            aria-pressed={active}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
