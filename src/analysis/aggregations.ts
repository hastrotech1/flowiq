import { startOfDay, startOfWeek, startOfMonth, startOfYear,
         endOfDay, endOfWeek, endOfMonth, endOfYear,
         subMonths, isWithinInterval, format } from 'date-fns'
import type {
  Transaction, TransactionFilters, TransactionSummary,
  DailyAggregate, MonthlyAggregate, DateFilterPreset
} from '@/types'

// ════════════════════════════════════════════════════════════
// DATE RANGE RESOLVER
// ════════════════════════════════════════════════════════════

/**
 * Converts a DateFilterPreset into a concrete { from, to } Date range.
 * Used by applyFilters() and the filter display label.
 */
export function resolveDateRange(
  preset:   DateFilterPreset | null,
  dateFrom: Date | null,
  dateTo:   Date | null,
): { from: Date; to: Date } | null {
  const now = new Date()

  switch (preset) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) }

    case 'this_week':
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) }

    case 'this_month':
      return { from: startOfMonth(now), to: endOfMonth(now) }

    case 'last_month': {
      const last = subMonths(now, 1)
      return { from: startOfMonth(last), to: endOfMonth(last) }
    }

    case 'last_3_months':
      return { from: startOfMonth(subMonths(now, 2)), to: endOfMonth(now) }

    case 'last_6_months':
      return { from: startOfMonth(subMonths(now, 5)), to: endOfMonth(now) }

    case 'this_year':
      return { from: startOfYear(now), to: endOfYear(now) }

    case 'custom':
      if (dateFrom && dateTo) return { from: startOfDay(dateFrom), to: endOfDay(dateTo) }
      return null

    default:
      return null
  }
}

// ════════════════════════════════════════════════════════════
// FILTER ENGINE
// ════════════════════════════════════════════════════════════

/**
 * Applies all active filters to a transaction array.
 * Pure function — no side effects. Used by useTransactions hook.
 *
 * @param transactions - Full unfiltered transaction array
 * @param filters      - Active filter state from useFiltersStore
 */
export function applyFilters(
  transactions: Transaction[],
  filters: TransactionFilters,
): Transaction[] {
  let result = [...transactions]

  // ── Date range filter ──────────────────────────────────
  const range = resolveDateRange(filters.datePreset, filters.dateFrom, filters.dateTo)
  if (range) {
    result = result.filter((t) =>
      isWithinInterval(t.date, { start: range.from, end: range.to })
    )
  }

  // ── Statement source filter ────────────────────────────
  if (filters.statementIds.length > 0) {
    const ids = new Set(filters.statementIds)
    result = result.filter((t) => ids.has(t.statementId))
  }

  // ── Debit / credit type filter ─────────────────────────
  if (filters.transactionType !== 'all') {
    result = result.filter((t) => t.type === filters.transactionType)
  }

  // ── Narration search (case-insensitive substring) ──────
  if (filters.narrationSearch.trim()) {
    const needle = filters.narrationSearch.toLowerCase().trim()
    result = result.filter((t) =>
      t.narration.toLowerCase().includes(needle)
    )
  }

  // ── AI category filter ─────────────────────────────────
  if (filters.category) {
    result = result.filter((t) => t.normalizedCategory === filters.category)
  }

  // ── Exclude inter-account transfers ────────────────────
  if (filters.excludeTransfers) {
    result = result.filter((t) => !t.isInterAccountTransfer)
  }

  return result
}

// ════════════════════════════════════════════════════════════
// SUMMARY AGGREGATIONS
// ════════════════════════════════════════════════════════════

/**
 * Computes high-level summary metrics for a transaction set.
 * Used by Dashboard cards and the Reports page.
 */
export function computeSummary(transactions: Transaction[]): TransactionSummary {
  const debits  = transactions.filter((t) => t.type === 'debit')
  const credits = transactions.filter((t) => t.type === 'credit')

  const totalDebits  = debits.reduce((sum, t) => sum + t.amount, 0)
  const totalCredits = credits.reduce((sum, t) => sum + t.amount, 0)

  const avgDebit  = debits.length  ? totalDebits  / debits.length  : 0
  const avgCredit = credits.length ? totalCredits / credits.length : 0

  const largestDebit  = debits.reduce<Transaction | null>((max, t) =>
    !max || t.amount > max.amount ? t : max, null)

  const largestCredit = credits.reduce<Transaction | null>((max, t) =>
    !max || t.amount > max.amount ? t : max, null)

  const smallestDebit = debits.reduce<Transaction | null>((min, t) =>
    !min || t.amount < min.amount ? t : min, null)

  return {
    totalDebits,
    totalCredits,
    netFlow:              totalCredits - totalDebits,
    transactionCount:     transactions.length,
    averageDebitAmount:   avgDebit,
    averageCreditAmount:  avgCredit,
    largestDebit,
    largestCredit,
    smallestDebit,
  }
}

// ════════════════════════════════════════════════════════════
// TIME-SERIES AGGREGATIONS
// ════════════════════════════════════════════════════════════

/**
 * Groups transactions by calendar day and computes daily totals.
 * Used for the balance/spend trend chart.
 */
export function computeDailyAggregates(transactions: Transaction[]): DailyAggregate[] {
  const map = new Map<string, DailyAggregate>()

  for (const tx of transactions) {
    const key = format(tx.date, 'yyyy-MM-dd')

    if (!map.has(key)) {
      map.set(key, { date: key, totalDebits: 0, totalCredits: 0, netFlow: 0, count: 0 })
    }

    const day = map.get(key)!
    if (tx.type === 'debit')  day.totalDebits  += tx.amount
    if (tx.type === 'credit') day.totalCredits += tx.amount
    day.netFlow = day.totalCredits - day.totalDebits
    day.count++
  }

  // Return sorted by date ascending for chart rendering
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Groups transactions by calendar month and computes monthly totals.
 * Used for bar/line charts on Dashboard and Reports pages.
 */
export function computeMonthlyAggregates(transactions: Transaction[]): MonthlyAggregate[] {
  const map = new Map<string, MonthlyAggregate>()

  for (const tx of transactions) {
    const key   = format(tx.date, 'yyyy-MM')
    const label = format(tx.date, 'MMM yyyy')

    if (!map.has(key)) {
      map.set(key, { month: key, label, totalDebits: 0, totalCredits: 0, netFlow: 0, count: 0 })
    }

    const month = map.get(key)!
    if (tx.type === 'debit')  month.totalDebits  += tx.amount
    if (tx.type === 'credit') month.totalCredits += tx.amount
    month.netFlow = month.totalCredits - month.totalDebits
    month.count++
  }

  return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month))
}

// ════════════════════════════════════════════════════════════
// AVERAGE COMPUTATIONS
// ════════════════════════════════════════════════════════════

/**
 * Computes average daily spend (debits only) over the date range
 * of the provided transaction set.
 */
export function averageDailySpend(transactions: Transaction[]): number {
  const daily = computeDailyAggregates(transactions.filter((t) => t.type === 'debit'))
  if (daily.length === 0) return 0
  const total = daily.reduce((sum, d) => sum + d.totalDebits, 0)
  return total / daily.length
}

/**
 * Computes average monthly spend (debits only).
 */
export function averageMonthlySpend(transactions: Transaction[]): number {
  const monthly = computeMonthlyAggregates(transactions.filter((t) => t.type === 'debit'))
  if (monthly.length === 0) return 0
  const total = monthly.reduce((sum, m) => sum + m.totalDebits, 0)
  return total / monthly.length
}

// ════════════════════════════════════════════════════════════
// NARRATION GROUPING
// ════════════════════════════════════════════════════════════

/**
 * Groups debits by narration string and computes totals per group.
 * Used by the Categories page and narration search summary.
 * Returns sorted by totalAmount descending.
 */
export function groupByNarration(
  transactions: Transaction[]
): { narration: string; total: number; count: number; average: number }[] {
  const map = new Map<string, { total: number; count: number }>()

  for (const tx of transactions) {
    if (tx.type !== 'debit') continue
    const key = tx.narration?.trim() || 'No Narration'
    const existing = map.get(key) ?? { total: 0, count: 0 }
    map.set(key, { total: existing.total + tx.amount, count: existing.count + 1 })
  }

  return Array.from(map.entries())
    .map(([narration, { total, count }]) => ({
      narration,
      total,
      count,
      average: total / count,
    }))
    .sort((a, b) => b.total - a.total)
}

/**
 * Groups debits by AI-assigned category.
 * Falls back to narration grouping for uncategorized transactions.
 */
export function groupByCategory(
  transactions: Transaction[]
): { category: string; total: number; count: number }[] {
  const map = new Map<string, { total: number; count: number }>()

  for (const tx of transactions) {
    if (tx.type !== 'debit') continue
    const key = tx.normalizedCategory ?? tx.narration?.trim() ?? 'No Narration'
    const existing = map.get(key) ?? { total: 0, count: 0 }
    map.set(key, { total: existing.total + tx.amount, count: existing.count + 1 })
  }

  return Array.from(map.entries())
    .map(([category, { total, count }]) => ({ category, total, count }))
    .sort((a, b) => b.total - a.total)
}
