import { useMemo, useState } from 'react'
import { ArrowUpDown } from 'lucide-react'
import TransactionRow from './TransactionRow'
import { TransactionRowSkeleton } from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'
import type { Transaction } from '@/types'

// ════════════════════════════════════════════════════════════
// TRANSACTION TABLE
// Virtualised (page-based) list of transaction rows.
// Supports client-side sorting by date or amount.
// ════════════════════════════════════════════════════════════

type SortField  = 'date' | 'amount'
type SortDir    = 'asc'  | 'desc'

interface TransactionTableProps {
  transactions: Transaction[]
  isLoading?:   boolean
}

const PAGE_SIZE = 50   // rows rendered per page

/**
 * Main transaction list with sort controls and pagination.
 *
 * Sorting: date (default desc — newest first) or amount (desc = largest first).
 * Pagination: "Load more" button appends the next PAGE_SIZE rows.
 * Each row is a TransactionRow component (expandable).
 *
 * Performance: only slices are rendered at any time (not full list).
 */
export default function TransactionTable({
  transactions,
  isLoading,
}: TransactionTableProps) {
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDir,   setSortDir]   = useState<SortDir>('desc')
  const [page,      setPage]      = useState(1)

  /** Toggles sort direction; switches field if different one clicked */
  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('desc')
    }
    setPage(1)   // reset to first page on sort change
  }

  /** Sorted + paginated slice of transactions */
  const sorted = useMemo(() => {
    const copy = [...transactions]
    copy.sort((a, b) => {
      let diff = 0
      if (sortField === 'date')   diff = a.date.getTime() - b.date.getTime()
      if (sortField === 'amount') diff = a.amount - b.amount
      return sortDir === 'asc' ? diff : -diff
    })
    return copy
  }, [transactions, sortField, sortDir])

  const visible     = sorted.slice(0, page * PAGE_SIZE)
  const hasMore     = visible.length < sorted.length
  const loadedCount = visible.length

  if (isLoading) {
    return (
      <div className="bg-white rounded-card border border-surface-border shadow-card overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <TransactionRowSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-card border border-surface-border shadow-card">
        <EmptyState
          title="No transactions found"
          description="Try adjusting your filters or search term."
        />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-card border border-surface-border shadow-card overflow-hidden">

      {/* ── Sort header ── */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-surface-border bg-surface-muted/40">
        <span className="text-[11px] text-data-secondary uppercase tracking-wide font-medium flex-1">
          Narration
        </span>

        <SortButton
          label="Date"
          active={sortField === 'date'}
          dir={sortDir}
          onClick={() => handleSort('date')}
        />

        <SortButton
          label="Amount"
          active={sortField === 'amount'}
          dir={sortDir}
          onClick={() => handleSort('amount')}
        />
      </div>

      {/* ── Transaction rows ── */}
      <div role="list" aria-label="Transactions">
        {visible.map((tx) => (
          <div key={tx.id} role="listitem">
            <TransactionRow transaction={tx} />
          </div>
        ))}
      </div>

      {/* ── Load more / count footer ── */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border bg-surface-muted/30">
        <span className="text-xs text-data-secondary">
          Showing {loadedCount.toLocaleString()} of {sorted.length.toLocaleString()}
        </span>

        {hasMore && (
          <button
            onClick={() => setPage((p) => p + 1)}
            className="text-xs font-medium text-green-primary hover:underline focus-visible:outline-none"
          >
            Load {Math.min(PAGE_SIZE, sorted.length - loadedCount)} more
          </button>
        )}
      </div>
    </div>
  )
}

// ── Sort button ────────────────────────────────────────────

interface SortButtonProps {
  label:   string
  active:  boolean
  dir:     SortDir
  onClick: () => void
}

/**
 * Column sort control button.
 * Shows the sort direction icon when active.
 */
function SortButton({ label, active, dir, onClick }: SortButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide',
        'transition-colors focus-visible:outline-none',
        active ? 'text-green-primary' : 'text-data-secondary hover:text-gray-700',
      )}
      aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : undefined}
    >
      {label}
      <ArrowUpDown
        size={11}
        className={cn('transition-opacity', active ? 'opacity-100' : 'opacity-40')}
      />
    </button>
  )
}
