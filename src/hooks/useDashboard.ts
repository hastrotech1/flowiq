import { useMemo } from 'react'
import { subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'
import { useTransactions } from './useTransactions'
import {
  computeSummary,
  computeMonthlyAggregates,
  computeDailyAggregates,
  averageDailySpend,
  averageMonthlySpend,
  groupByCategory,
} from '@/analysis/aggregations'
import { detectRecurringExpenses } from '@/analysis/recurring'
import { useStatementsStore } from '@/store/statements.store'

/**
 * Derives all data needed by the Dashboard page from the
 * filtered transaction list. Pure computation — no Appwrite calls.
 *
 * Returns memoized values that only recompute when transactions
 * or active statements change.
 */
export function useDashboard() {
  const { filteredTransactions, allTransactions, isLoading } = useTransactions()
  const statements = useStatementsStore((s) => s.statements)

  // ── Core summary metrics ─────────────────────────────────
  const summary = useMemo(
    () => computeSummary(filteredTransactions),
    [filteredTransactions],
  )

  // ── Daily aggregates for the spend trend line chart ──────
  const dailyAggregates = useMemo(
    () => computeDailyAggregates(filteredTransactions),
    [filteredTransactions],
  )

  // ── Monthly aggregates for the bar chart ─────────────────
  const monthlyAggregates = useMemo(
    () => computeMonthlyAggregates(filteredTransactions),
    [filteredTransactions],
  )

  // ── Category breakdown for the donut chart ───────────────
  const categoryBreakdown = useMemo(
    () => groupByCategory(filteredTransactions).slice(0, 8),
    [filteredTransactions],
  )

  // ── Average spend metrics ────────────────────────────────
  const avgDailySpend   = useMemo(() => averageDailySpend(filteredTransactions),   [filteredTransactions])
  const avgMonthlySpend = useMemo(() => averageMonthlySpend(filteredTransactions), [filteredTransactions])

  // ── Period-over-period trend (vs previous same-length window) ──
  /**
   * Computes the percentage change in total debits vs the previous
   * equivalent period. Used for trend chips on StatCards.
   * e.g. if filtered = this month, previous = last month.
   */
  const spendTrend = useMemo(() => {
    const now      = new Date()
    const thisMo   = { start: startOfMonth(now),          end: endOfMonth(now) }
    const lastMo   = { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) }

    const thisTotal = allTransactions
      .filter((t) => t.type === 'debit' && isWithinInterval(t.date, thisMo))
      .reduce((s, t) => s + t.amount, 0)

    const lastTotal = allTransactions
      .filter((t) => t.type === 'debit' && isWithinInterval(t.date, lastMo))
      .reduce((s, t) => s + t.amount, 0)

    if (lastTotal === 0) return 0
    // Positive = spent more this month (worse for debit), negative = spent less
    return ((thisTotal - lastTotal) / lastTotal) * 100
  }, [allTransactions])

  // ── Recurring expenses (top 5 for dashboard preview) ────
  const recurringExpenses = useMemo(
    () => detectRecurringExpenses(filteredTransactions).slice(0, 5),
    [filteredTransactions],
  )

  // ── Recent transactions (last 10) ───────────────────────
  const recentTransactions = useMemo(
    () => [...filteredTransactions]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 10),
    [filteredTransactions],
  )

  // ── Inter-account transfer count ─────────────────────────
  const transferCount = useMemo(
    () => filteredTransactions.filter((t) => t.isInterAccountTransfer).length,
    [filteredTransactions],
  )

  return {
    isLoading,
    summary,
    dailyAggregates,
    monthlyAggregates,
    categoryBreakdown,
    avgDailySpend,
    avgMonthlySpend,
    spendTrend,
    recurringExpenses,
    recentTransactions,
    transferCount,
    statements,
    totalTransactions: filteredTransactions.length,
  }
}
