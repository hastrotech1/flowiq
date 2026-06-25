import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { cn, formatNairaCompact, formatNarration } from '@/lib/utils'
import { groupByNarration } from '@/analysis/aggregations'
import { useFiltersStore } from '@/store/filters.store'
import type { Transaction } from '@/types'

// ════════════════════════════════════════════════════════════
// NARRATION GROUP LIST
// Shows all narrations grouped by total spend, with a search.
// Clicking a narration sets it as the narration search filter.
// Used in the Transactions page right panel / bottom sheet.
// ════════════════════════════════════════════════════════════

interface NarrationGroupListProps {
  transactions: Transaction[]
  className?:   string
}

/**
 * Grouped narration list — shows every unique narration with
 * its total spend and occurrence count, sorted by total desc.
 *
 * Acts as a "quick filter" — clicking a narration sets
 * `narrationSearch` in the filters store, which instantly
 * scopes the transaction table to that narration.
 *
 * Has its own local search input to find narrations within
 * the list itself (separate from the table search).
 */
export default function NarrationGroupList({
  transactions,
  className,
}: NarrationGroupListProps) {
  const [localSearch, setLocalSearch] = useState('')
  const narrationSearch    = useFiltersStore((s) => s.narrationSearch)
  const setNarrationSearch = useFiltersStore((s) => s.setNarrationSearch)

  /** All narration groups sorted by total descending */
  const groups = useMemo(
    () => groupByNarration(transactions),
    [transactions],
  )

  /** Groups filtered by the local list search */
  const filtered = useMemo(() => {
    if (!localSearch.trim()) return groups
    const needle = localSearch.toLowerCase()
    return groups.filter((g) =>
      g.narration.toLowerCase().includes(needle)
    )
  }, [groups, localSearch])

  const grandTotal = groups.reduce((s, g) => s + g.total, 0)

  const handleSelect = (narration: string) => {
    // Toggle — clicking active narration clears filter
    const display = formatNarration(narration)
    if (narrationSearch === display || narrationSearch === narration) {
      setNarrationSearch('')
    } else {
      setNarrationSearch(narration || 'No Narration')
    }
  }

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Local search within the list */}
      <div className="relative px-3 py-2 border-b border-surface-border">
        <Search size={13} className="absolute left-5 top-1/2 -translate-y-1/2 text-data-secondary" />
        <input
          type="search"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder="Find narration…"
          className="w-full h-8 pl-7 pr-3 rounded-input border border-surface-border text-xs bg-surface-muted focus:outline-none focus:ring-1 focus:ring-green-accent/40 focus:border-green-primary"
        />
      </div>

      {/* Grand total row */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-surface-border bg-surface-muted/40">
        <span className="text-[10px] uppercase tracking-wide text-data-secondary font-medium">
          {filtered.length} narrations
        </span>
        <span className="text-xs font-semibold amount-debit tabular-nums font-amount">
          {formatNairaCompact(grandTotal)}
        </span>
      </div>

      {/* Narration rows */}
      <div className="overflow-y-auto flex-1 max-h-[60vh] lg:max-h-[calc(100vh-280px)]">
        {filtered.length === 0 ? (
          <p className="text-xs text-data-secondary text-center py-6 px-3">
            No narrations match "{localSearch}"
          </p>
        ) : (
          filtered.map((group) => {
            const display   = formatNarration(group.narration)
            const isActive  = narrationSearch === group.narration ||
                              narrationSearch === display ||
                              narrationSearch === 'No Narration' && group.narration === ''
            const pct       = grandTotal > 0
              ? ((group.total / grandTotal) * 100).toFixed(1)
              : '0'

            return (
              <button
                key={group.narration || '__empty__'}
                onClick={() => handleSelect(group.narration)}
                className={cn(
                  'w-full flex items-start gap-2 px-3 py-2.5 text-left',
                  'border-b border-surface-border last:border-0',
                  'transition-colors focus-visible:outline-none focus-visible:bg-surface-muted',
                  isActive
                    ? 'bg-green-subtle'
                    : 'hover:bg-surface-muted/50',
                )}
                aria-pressed={isActive}
              >
                {/* Progress bar background */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn(
                      'text-xs font-medium truncate leading-snug',
                      isActive ? 'text-green-deep' : 'text-gray-800',
                    )}>
                      {display}
                    </span>
                    <span className={cn(
                      'text-xs font-semibold tabular-nums font-amount shrink-0',
                      isActive ? 'text-green-primary' : 'amount-debit',
                    )}>
                      {formatNairaCompact(group.total)}
                    </span>
                  </div>

                  {/* Sub-row: count + percentage + spend bar */}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-data-secondary shrink-0">
                      {group.count}× · {pct}%
                    </span>
                    {/* Mini spend bar */}
                    <div className="flex-1 h-1 rounded-chip bg-surface-muted overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-chip transition-all',
                          isActive ? 'bg-green-primary' : 'bg-data-alert/40',
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
