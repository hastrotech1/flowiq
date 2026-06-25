import { cn } from '@/lib/utils'
import { useStatementsStore } from '@/store/statements.store'
import { useFiltersStore } from '@/store/filters.store'

// ════════════════════════════════════════════════════════════
// STATEMENT FILTER — filter transactions to specific statements
// ════════════════════════════════════════════════════════════

/**
 * Horizontally scrollable row of statement source pills.
 * "All" pill = no filter. Clicking a specific statement pill
 * scopes the transaction view to that statement only.
 *
 * Uses `statementIds` in the global filters store (not the
 * `activeIds` set — that controls the analysis scope globally;
 * this filter is per-view and temporary).
 */
export default function StatementFilter() {
  const statements      = useStatementsStore((s) => s.statements)
  const statementIds    = useFiltersStore((s) => s.statementIds)
  const setStatementIds = useFiltersStore((s) => s.setStatementIds)

  if (statements.length <= 1) return null   // no point showing if only 1 statement

  const isAll      = statementIds.length === 0
  const toggleStmt = (id: string) => {
    if (statementIds.includes(id)) {
      // Deselecting — if it was the only one, go back to "All"
      const next = statementIds.filter((s) => s !== id)
      setStatementIds(next)
    } else {
      setStatementIds([...statementIds, id])
    }
  }

  return (
    <div
      className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5"
      role="group"
      aria-label="Filter by statement"
    >
      {/* All pill */}
      <button
        onClick={() => setStatementIds([])}
        className={cn(
          'shrink-0 h-7 px-3 rounded-chip text-xs font-medium transition-all',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-accent/40',
          isAll
            ? 'bg-gray-800 text-white'
            : 'bg-white border border-surface-border text-data-secondary hover:border-gray-400',
        )}
        aria-pressed={isAll}
      >
        All accounts
      </button>

      {/* Per-statement pills */}
      {statements.map((stmt) => {
        const active = statementIds.includes(stmt.id)
        return (
          <button
            key={stmt.id}
            onClick={() => toggleStmt(stmt.id)}
            className={cn(
              'shrink-0 h-7 px-3 rounded-chip text-xs font-medium transition-all',
              'flex items-center gap-1.5',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-accent/40',
              active
                ? 'text-white'
                : 'bg-white border border-surface-border text-data-secondary hover:border-gray-400',
            )}
            style={active ? { backgroundColor: stmt.colorTag } : undefined}
            aria-pressed={active}
          >
            {/* Color dot */}
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: active ? '#ffffff88' : stmt.colorTag }}
              aria-hidden="true"
            />
            {stmt.bankName}
          </button>
        )
      })}
    </div>
  )
}
