import { useEffect, useMemo } from 'react'
import { Download, BarChart2 } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import PageWrapper, { SectionCard, SectionHeader } from '@/components/layout/PageWrapper'
import StatCard from '@/components/ui/StatCard'
import DateFilterBar from '@/components/filters/DateFilterBar'
import MonthlyBarChart from '@/components/charts/MonthlyBarChart'
import EmptyState from '@/components/ui/EmptyState'
import { ChartSkeleton, StatCardSkeleton } from '@/components/ui/Skeleton'
import { useTransactions } from '@/hooks/useTransactions'
import { useStatements } from '@/hooks/useStatements'
import {
  computeSummary, computeMonthlyAggregates,
  averageDailySpend, averageMonthlySpend, groupByNarration,
} from '@/analysis/aggregations'
import { detectRecurringExpenses, getOneTimeExpenses } from '@/analysis/recurring'
import { formatNaira, formatNairaCompact, formatDate } from '@/lib/utils'

/**
 * Reports page — period summary with export options.
 *
 * Sections:
 * 1. Date filter bar
 * 2. Summary stat cards (Spent, Received, Net, Avg Daily, Avg Monthly)
 * 3. Monthly bar chart
 * 4. Top narrations by total spend (leaderboard)
 * 5. Recurring vs one-time breakdown
 * 6. Export buttons (CSV — client-side generation)
 */
export default function ReportsPage() {
  const { loadAll }                         = useStatements()
  const { filteredTransactions, isLoading } = useTransactions()

  useEffect(() => { loadAll() }, [loadAll])

  const summary     = useMemo(() => computeSummary(filteredTransactions),          [filteredTransactions])
  const monthly     = useMemo(() => computeMonthlyAggregates(filteredTransactions), [filteredTransactions])
  const topNarrations = useMemo(() => groupByNarration(filteredTransactions).slice(0, 10), [filteredTransactions])
  const recurring   = useMemo(() => detectRecurringExpenses(filteredTransactions),  [filteredTransactions])
  const oneTime     = useMemo(() => getOneTimeExpenses(filteredTransactions, recurring), [filteredTransactions, recurring])
  const avgDaily    = useMemo(() => averageDailySpend(filteredTransactions),        [filteredTransactions])
  const avgMonthly  = useMemo(() => averageMonthlySpend(filteredTransactions),      [filteredTransactions])

  const hasData = filteredTransactions.length > 0

  /** Exports filtered transactions as a CSV file, downloaded client-side */
  const exportCSV = () => {
    const headers = ['Date', 'Narration', 'Type', 'Amount', 'Category', 'Balance', 'Bank']
    const rows    = filteredTransactions.map((t) => [
      formatDate(t.date),
      `"${(t.narration || 'No Narration').replace(/"/g, '""')}"`,
      t.type,
      t.amount.toFixed(2),
      t.normalizedCategory ?? '',
      t.balance !== null ? t.balance.toFixed(2) : '',
      '',   // bank name resolved separately if needed
    ])
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `flowiq-report-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AppLayout
      title="Reports"
      action={
        hasData ? (
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 h-9 px-3 rounded-btn border border-surface-border text-sm font-medium text-data-secondary hover:text-gray-700 hover:border-gray-400 transition-colors"
          >
            <Download size={15} /> Export CSV
          </button>
        ) : undefined
      }
    >
      <PageWrapper>

        <DateFilterBar />

        {/* ── No data state ── */}
        {!isLoading && !hasData && (
          <SectionCard>
            <EmptyState
              icon={<BarChart2 size={24} />}
              title="No data for this period"
              description="Upload statements or adjust the date filter to see your report."
            />
          </SectionCard>
        )}

        {/* ── Summary cards ── */}
        {(isLoading || hasData) && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {isLoading ? (
              [1,2,3,4,5,6].map((i) => <StatCardSkeleton key={i} />)
            ) : (
              <>
                <StatCard label="Total Spent"    value={formatNairaCompact(summary.totalDebits)}  variant="debit"   subValue={`${summary.transactionCount} transactions`} />
                <StatCard label="Total Received" value={formatNairaCompact(summary.totalCredits)} variant="credit"  subValue="All credits" />
                <StatCard label="Net Flow"       value={formatNairaCompact(Math.abs(summary.netFlow))} variant={summary.netFlow >= 0 ? 'credit' : 'debit'} subValue={summary.netFlow >= 0 ? 'Net positive' : 'Net negative'} />
                <StatCard label="Avg Daily Spend"   value={formatNairaCompact(avgDaily)}   variant="neutral" subValue={formatNaira(avgDaily)}   />
                <StatCard label="Avg Monthly Spend" value={formatNairaCompact(avgMonthly)} variant="neutral" subValue={formatNaira(avgMonthly)}  />
                <StatCard label="Recurring Payments" value={recurring.length.toString()} variant="neutral" subValue={`${oneTime.length} one-time`} />
              </>
            )}
          </div>
        )}

        {/* ── Monthly chart ── */}
        {(isLoading || hasData) && (
          <SectionCard>
            <SectionHeader title="Monthly Comparison" subtitle="Spend vs income by month" />
            {isLoading ? <ChartSkeleton height={220} /> : <MonthlyBarChart data={monthly} height={220} />}
          </SectionCard>
        )}

        {/* ── Top narrations ── */}
        {!isLoading && topNarrations.length > 0 && (
          <SectionCard noPadding>
            <SectionHeader title="Top 10 Narrations by Spend" subtitle="Highest spend narrations in this period" className="px-4 pt-4" />
            <div className="flex flex-col divide-y divide-surface-border">
              {topNarrations.map((n, i) => (
                <div key={n.narration} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="text-sm font-bold text-data-secondary w-5 shrink-0 tabular-nums">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{n.narration || 'No Narration'}</p>
                    <p className="text-xs text-data-secondary">{n.count}× · avg {formatNairaCompact(n.average)}</p>
                  </div>
                  <span className="text-sm font-semibold amount-debit tabular-nums font-amount shrink-0">
                    {formatNairaCompact(n.total)}
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* ── Recurring vs one-time ── */}
        {!isLoading && hasData && (
          <div className="grid grid-cols-2 gap-3">
            <SectionCard>
              <p className="text-xs text-data-secondary uppercase tracking-wide font-medium">Recurring</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{recurring.length}</p>
              <p className="text-xs text-data-secondary mt-0.5">
                {formatNairaCompact(recurring.reduce((s, r) => s + r.totalAmount, 0))} total
              </p>
            </SectionCard>
            <SectionCard>
              <p className="text-xs text-data-secondary uppercase tracking-wide font-medium">One-time</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{oneTime.length}</p>
              <p className="text-xs text-data-secondary mt-0.5">
                {formatNairaCompact(oneTime.reduce((s, t) => s + t.amount, 0))} total
              </p>
            </SectionCard>
          </div>
        )}

      </PageWrapper>
    </AppLayout>
  )
}
