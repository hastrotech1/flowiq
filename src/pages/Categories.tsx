import { useEffect, useMemo, useState } from 'react'
import { Tag, ArrowRight } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import PageWrapper, { SectionCard, SectionHeader } from '@/components/layout/PageWrapper'
import DateFilterBar from '@/components/filters/DateFilterBar'
import CategoryDonutChart from '@/components/charts/CategoryDonutChart'
import { ChartSkeleton } from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import TransactionRow from '@/components/transactions/TransactionRow'
import { useTransactions } from '@/hooks/useTransactions'
import { useStatements } from '@/hooks/useStatements'
import { groupByCategory } from '@/analysis/aggregations'
import { detectRecurringExpenses, getOneTimeExpenses } from '@/analysis/recurring'
import { formatNairaCompact, stringToColor } from '@/lib/utils'
import { cn } from '@/lib/utils'

/**
 * Categories page — AI-clustered spend breakdown.
 *
 * Sections:
 * 1. Date filter bar
 * 2. Category donut chart (full set, not capped at 8)
 * 3. Category list — click to expand narrations in that category
 * 4. Recurring expenses panel
 * 5. One-time expenses count + top items
 */
export default function CategoriesPage() {
  const { loadAll }                         = useStatements()
  const { filteredTransactions, isLoading } = useTransactions()
  const [selectedCategory, setSelected]     = useState<string | null>(null)

  useEffect(() => { loadAll() }, [loadAll])

  const categories = useMemo(
    () => groupByCategory(filteredTransactions),
    [filteredTransactions],
  )

  const recurring = useMemo(
    () => detectRecurringExpenses(filteredTransactions),
    [filteredTransactions],
  )

  const oneTime = useMemo(
    () => getOneTimeExpenses(filteredTransactions, recurring),
    [filteredTransactions, recurring],
  )

  // Transactions in the selected category
  const selectedTxs = useMemo(() => {
    if (!selectedCategory) return []
    return filteredTransactions.filter(
      (t) => (t.normalizedCategory ?? t.narration ?? 'No Narration') === selectedCategory
        && t.type === 'debit',
    ).slice(0, 20)
  }, [filteredTransactions, selectedCategory])

  const hasData = filteredTransactions.length > 0

  return (
    <AppLayout title="Categories">
      <PageWrapper>

        <DateFilterBar />

        {/* ── Donut chart ── */}
        <SectionCard>
          <SectionHeader
            title="Spend by Category"
            subtitle="AI-clustered from your transaction narrations"
          />
          {isLoading ? (
            <ChartSkeleton height={220} />
          ) : categories.length === 0 ? (
            <EmptyState
              compact
              icon={<Tag size={22} />}
              title="No categories yet"
              description="Upload a statement — AI categorisation runs automatically after import."
            />
          ) : (
            <CategoryDonutChart data={categories} height={200} />
          )}
        </SectionCard>

        {/* ── Category breakdown list ── */}
        {!isLoading && categories.length > 0 && (
          <SectionCard noPadding>
            <SectionHeader
              title="All Categories"
              subtitle="Tap a category to see its transactions"
              className="px-4 pt-4"
            />
            <div className="flex flex-col">
              {categories.map((cat) => {
                const color    = stringToColor(cat.category)
                const isOpen   = selectedCategory === cat.category
                const totalAll = categories.reduce((s, c) => s + c.total, 0)
                const pct      = totalAll > 0 ? ((cat.total / totalAll) * 100).toFixed(1) : '0'

                return (
                  <div key={cat.category} className="border-b border-surface-border last:border-0">
                    {/* Category header row */}
                    <button
                      onClick={() => setSelected(isOpen ? null : cat.category)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                        isOpen ? 'bg-surface-muted/60' : 'hover:bg-surface-muted/30',
                      )}
                      aria-expanded={isOpen}
                    >
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{cat.category}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex-1 h-1 rounded-chip bg-surface-muted overflow-hidden max-w-[100px]">
                            <div
                              className="h-full rounded-chip"
                              style={{ width: `${pct}%`, backgroundColor: color }}
                            />
                          </div>
                          <span className="text-[10px] text-data-secondary">{pct}% · {cat.count}×</span>
                        </div>
                      </div>
                      <span className="text-sm font-semibold amount-debit tabular-nums font-amount">
                        {formatNairaCompact(cat.total)}
                      </span>
                      <ArrowRight
                        size={14}
                        className={cn(
                          'text-data-secondary transition-transform shrink-0',
                          isOpen && 'rotate-90',
                        )}
                      />
                    </button>

                    {/* Expanded transactions */}
                    {isOpen && (
                      <div className="bg-surface-muted/20 border-t border-surface-border">
                        {selectedTxs.length === 0 ? (
                          <p className="text-xs text-data-secondary px-4 py-3">
                            No transactions found.
                          </p>
                        ) : (
                          selectedTxs.map((tx) => (
                            <TransactionRow key={tx.id} transaction={tx} />
                          ))
                        )}
                        {selectedTxs.length === 20 && (
                          <p className="text-xs text-data-secondary px-4 py-2 italic">
                            Showing first 20 — use Transactions page to see all.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </SectionCard>
        )}

        {/* ── Recurring expenses ── */}
        {!isLoading && recurring.length > 0 && (
          <SectionCard noPadding>
            <SectionHeader
              title="Recurring Expenses"
              subtitle={`${recurring.length} regular payment${recurring.length !== 1 ? 's' : ''} detected`}
              className="px-4 pt-4"
            />
            <div className="flex flex-col divide-y divide-surface-border">
              {recurring.map((r) => (
                <div key={r.narration} className="flex items-start gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{r.narration || 'No Narration'}</p>
                    <p className="text-xs text-data-secondary mt-0.5">
                      {r.occurrences}× · every ~{r.intervalDays} days
                      {r.normalizedCategory && ` · ${r.normalizedCategory}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold amount-debit tabular-nums font-amount">
                      {formatNairaCompact(r.averageAmount)}
                    </p>
                    <p className="text-xs text-data-secondary">avg/occurrence</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* ── One-time expenses summary ── */}
        {!isLoading && hasData && (
          <SectionCard>
            <SectionHeader
              title="One-time Expenses"
              subtitle="Transactions that don't follow a regular pattern"
            />
            <div className="flex items-center gap-6 flex-wrap">
              <div>
                <p className="text-2xl font-bold text-gray-900">{oneTime.length.toLocaleString()}</p>
                <p className="text-xs text-data-secondary">transactions</p>
              </div>
              <div>
                <p className="text-2xl font-bold amount-debit tabular-nums font-amount">
                  {formatNairaCompact(oneTime.reduce((s, t) => s + t.amount, 0))}
                </p>
                <p className="text-xs text-data-secondary">total spend</p>
              </div>
            </div>
          </SectionCard>
        )}

      </PageWrapper>
    </AppLayout>
  )
}
