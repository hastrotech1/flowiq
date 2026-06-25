import { useMemo } from 'react'
import { useTransactionsStore } from '@/store/transactions.store'
import { useFiltersStore } from '@/store/filters.store'
import { useStatementsStore } from '@/store/statements.store'
import { applyFilters } from '@/analysis/aggregations'

/**
 * Derives the filtered + active transaction list from global state.
 * This is the primary data hook — most pages consume this.
 *
 * Returns:
 * - filteredTransactions: transactions matching all active filters
 * - allTransactions:      unfiltered full list (for stats that ignore filters)
 * - isLoading:            true while fetching from Appwrite
 *
 * Usage:
 *   const { filteredTransactions } = useTransactions()
 */
export function useTransactions() {
  const { transactions, isLoading, error } = useTransactionsStore()
  const filters                            = useFiltersStore()
  const activeIds                          = useStatementsStore((s) => s.activeIds)

  /**
   * Two-stage filter:
   * 1. Scope to active statements (user toggle in StatementManager)
   * 2. Apply date/type/narration/category filters from the filter bar
   */
  const filteredTransactions = useMemo(() => {
    // Stage 1: active statement scope
    const scoped =
      activeIds.size === 0
        ? transactions
        : transactions.filter((t) => activeIds.has(t.statementId))

    // Stage 2: user-selected filters
    return applyFilters(scoped, filters)
  }, [transactions, activeIds, filters])

  return {
    filteredTransactions,
    allTransactions: transactions,
    isLoading,
    error,
  }
}
