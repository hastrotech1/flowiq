import { create } from 'zustand'
import type { TransactionFilters, DateFilterPreset } from '@/types'

/**
 * Global filter state slice.
 * Controls what the user sees in the Transactions and Dashboard views.
 * All mutations here trigger re-computation of the filtered
 * transaction list in useTransactions hook.
 */
interface FiltersState extends TransactionFilters {
  setDatePreset:       (preset: DateFilterPreset | null) => void
  setCustomDateRange:  (from: Date | null, to: Date | null) => void
  setStatementIds:     (ids: string[]) => void
  setTransactionType:  (type: TransactionFilters['transactionType']) => void
  setNarrationSearch:  (search: string) => void
  setCategory:         (category: string | null) => void
  setExcludeTransfers: (exclude: boolean) => void
  resetFilters:        () => void
}

const DEFAULT_FILTERS: TransactionFilters = {
  datePreset:        'this_month',
  dateFrom:          null,
  dateTo:            null,
  statementIds:      [],
  transactionType:   'all',
  narrationSearch:   '',
  category:          null,
  excludeTransfers:  true,
}

export const useFiltersStore = create<FiltersState>((set) => ({
  ...DEFAULT_FILTERS,

  /** Sets a preset (today/week/month/year) and clears custom range */
  setDatePreset: (datePreset) =>
    set({ datePreset, dateFrom: null, dateTo: null }),

  /** Sets a custom date range and switches preset to 'custom' */
  setCustomDateRange: (dateFrom, dateTo) =>
    set({ dateFrom, dateTo, datePreset: 'custom' }),

  /** Filters to specific statement sources; empty array = all */
  setStatementIds: (statementIds) => set({ statementIds }),

  setTransactionType:  (transactionType)  => set({ transactionType }),
  setNarrationSearch:  (narrationSearch)  => set({ narrationSearch }),
  setCategory:         (category)         => set({ category }),
  setExcludeTransfers: (excludeTransfers) => set({ excludeTransfers }),

  /** Resets all filters back to defaults */
  resetFilters: () => set(DEFAULT_FILTERS),
}))
