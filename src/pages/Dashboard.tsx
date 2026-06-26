import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wallet,
  TrendingDown,
  TrendingUp,
  Activity,
  ArrowRight,
  RefreshCw,
  Upload,
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import PageWrapper, {
  SectionCard,
  SectionHeader,
} from "@/components/layout/PageWrapper";
import StatCard from "@/components/ui/StatCard";
import EmptyState from "@/components/ui/EmptyState";
import {
  StatCardSkeleton,
  ChartSkeleton,
  TransactionRowSkeleton,
} from "@/components/ui/Skeleton";
import DateFilterBar from "@/components/filters/DateFilterBar";
import SpendTrendChart from "@/components/charts/SpendTrendChart";
import MonthlyBarChart from "@/components/charts/MonthlyBarChart";
import CategoryDonutChart from "@/components/charts/CategoryDonutChart";
import RecentTransactionList from "@/components/transactions/RecentTransactionList";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { useStatements } from "@/hooks/useStatements";
import { useDashboard } from "@/hooks/useDashboard";
import { formatNaira, formatNairaCompact } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";

/**
 * Dashboard page — the home screen after login.
 *
 * Sections:
 * 1. Date filter bar (preset pills)
 * 2. Four summary stat cards (total spent, received, net flow, tx count)
 * 3. Spend trend area chart (daily debits/credits)
 * 4. Monthly comparison bar chart
 * 5. Category breakdown donut chart
 * 6. Average spend metrics (daily, monthly)
 * 7. Recent transactions list
 *
 * All data is derived from the filtered transactions via useDashboard().
 * If no statements are uploaded, shows an onboarding empty state.
 */
export default function DashboardPage() {
  const navigate = useNavigate();
  const { loadAll } = useStatements();
  const {
    isLoading,
    summary,
    dailyAggregates,
    monthlyAggregates,
    categoryBreakdown,
    avgDailySpend,
    avgMonthlySpend,
    spendTrend,
    recentTransactions,
    statements,
    totalTransactions,
  } = useDashboard();

  // Load all data on mount (no-op if already loaded)
  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const hasData = statements.length > 0;

  return (
    <AppLayout
      title="Dashboard"
      action={
        hasData ? (
          <button
            onClick={() => loadAll()}
            className="p-2 rounded-btn text-data-secondary hover:text-gray-700 hover:bg-surface-muted transition-colors"
            aria-label="Refresh data"
          >
            <RefreshCw size={16} />
          </button>
        ) : undefined
      }
    >
      <PageWrapper>
        {/* ── Date filter bar ── */}
        {hasData && <DateFilterBar />}

        {/* ── No data onboarding state ── */}
        {!isLoading && !hasData && (
          <SectionCard>
            <EmptyState
              icon={<Upload size={24} />}
              title="Upload your first statement"
              description="Add a bank statement to start seeing your spending insights, trends, and AI-powered analysis."
              action={
                <button
                  onClick={() => navigate(ROUTES.statements)}
                  className="flex items-center gap-2 h-10 px-5 rounded-btn bg-green-primary text-white text-sm font-semibold hover:bg-green-deep transition-colors"
                >
                  <Upload size={15} /> Upload Statement
                </button>
              }
            />
          </SectionCard>
        )}

        {/* ── Summary stat cards (2×2 grid) ── */}
        {(isLoading || hasData) && (
          <ErrorBoundary context="Dashboard stat cards">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {isLoading ? (
                [1, 2, 3, 4].map((i) => <StatCardSkeleton key={i} />)
              ) : (
                <>
                  <StatCard
                    label="Total Spent"
                    value={formatNairaCompact(summary.totalDebits)}
                    subValue={`${summary.transactionCount} transactions`}
                    trend={spendTrend !== 0 ? -spendTrend : undefined}
                    variant="debit"
                    icon={<TrendingDown size={16} />}
                    onClick={() => navigate(ROUTES.transactions)}
                  />
                  <StatCard
                    label="Total Received"
                    value={formatNairaCompact(summary.totalCredits)}
                    subValue="All credits"
                    variant="credit"
                    icon={<TrendingUp size={16} />}
                  />
                  <StatCard
                    label="Net Flow"
                    value={formatNairaCompact(Math.abs(summary.netFlow))}
                    subValue={
                      summary.netFlow >= 0 ? "Net positive" : "Net negative"
                    }
                    variant={summary.netFlow >= 0 ? "credit" : "debit"}
                    icon={<Activity size={16} />}
                  />
                  <StatCard
                    label="Transactions"
                    value={totalTransactions.toLocaleString()}
                    subValue={`${statements.length} account${statements.length !== 1 ? "s" : ""}`}
                    variant="neutral"
                    icon={<Wallet size={16} />}
                  />
                </>
              )}
            </div>
          </ErrorBoundary>
        )}

        {/* ── Spend trend chart ── */}
        {(isLoading || hasData) && (
          <SectionCard>
            <SectionHeader
              title="Spend Trend"
              subtitle="Daily debits and credits over the selected period"
            />
            {isLoading ? (
              <ChartSkeleton height={220} />
            ) : dailyAggregates.length === 0 ? (
              <EmptyState
                compact
                title="No data"
                description="No transactions in this period."
              />
            ) : (
              <ErrorBoundary context="Dashboard spend trend">
                <SpendTrendChart data={dailyAggregates} height={220} />
              </ErrorBoundary>
            )}
          </SectionCard>
        )}

        {/* ── Monthly comparison + Category donut (side-by-side on lg) ── */}
        {(isLoading || hasData) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-6">
            {/* Monthly bar chart */}
            <SectionCard>
              <SectionHeader
                title="Monthly Breakdown"
                subtitle="Spent vs received by month"
              />
              {isLoading ? (
                <ChartSkeleton height={220} />
              ) : monthlyAggregates.length === 0 ? (
                <EmptyState
                  compact
                  title="No data"
                  description="No monthly data available."
                />
              ) : (
                <ErrorBoundary context="Dashboard monthly breakdown">
                  <MonthlyBarChart data={monthlyAggregates} height={220} />
                </ErrorBoundary>
              )}
            </SectionCard>

            {/* Category donut */}
            <SectionCard>
              <SectionHeader
                title="Top Categories"
                subtitle="Spend breakdown by AI category"
                action={
                  categoryBreakdown.length > 0 && (
                    <button
                      onClick={() => navigate(ROUTES.categories)}
                      className="text-xs font-medium text-green-primary flex items-center gap-1 hover:underline"
                    >
                      View all <ArrowRight size={12} />
                    </button>
                  )
                }
              />
              {isLoading ? (
                <ChartSkeleton height={200} />
              ) : categoryBreakdown.length === 0 ? (
                <EmptyState
                  compact
                  title="No categories yet"
                  description="AI categorisation runs after upload. Try refreshing."
                />
              ) : (
                <ErrorBoundary context="Dashboard category donut">
                  <CategoryDonutChart data={categoryBreakdown} height={180} />
                </ErrorBoundary>
              )}
            </SectionCard>
          </div>
        )}

        {/* ── Averages row ── */}
        {!isLoading &&
          hasData &&
          (avgDailySpend > 0 || avgMonthlySpend > 0) && (
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="Avg Daily Spend"
                value={formatNairaCompact(avgDailySpend)}
                subValue={formatNaira(avgDailySpend)}
                variant="neutral"
              />
              <StatCard
                label="Avg Monthly Spend"
                value={formatNairaCompact(avgMonthlySpend)}
                subValue={formatNaira(avgMonthlySpend)}
                variant="neutral"
              />
            </div>
          )}

        {/* ── Recent transactions ── */}
        {(isLoading || hasData) && (
          <SectionCard noPadding>
            <SectionHeader
              title="Recent Activity"
              subtitle="Latest transactions across all active accounts"
              className="px-4 pt-4"
              action={
                hasData && (
                  <button
                    onClick={() => navigate(ROUTES.transactions)}
                    className="text-xs font-medium text-green-primary flex items-center gap-1 hover:underline"
                  >
                    View all <ArrowRight size={12} />
                  </button>
                )
              }
            />
            {isLoading ? (
              <div>
                {[1, 2, 3, 4, 5].map((i) => (
                  <TransactionRowSkeleton key={i} />
                ))}
              </div>
            ) : recentTransactions.length === 0 ? (
              <EmptyState
                compact
                title="No transactions"
                description="No transactions match the current filters."
              />
            ) : (
              <ErrorBoundary context="Dashboard recent transactions">
                <RecentTransactionList transactions={recentTransactions} />
              </ErrorBoundary>
            )}
          </SectionCard>
        )}
      </PageWrapper>
    </AppLayout>
  );
}
