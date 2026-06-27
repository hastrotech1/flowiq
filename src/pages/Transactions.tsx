import { useEffect, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import PageWrapper, {
  SectionCard,
  SectionHeader,
} from "@/components/layout/PageWrapper";
import DateFilterBar from "@/components/filters/DateFilterBar";
import NarrationSearch from "@/components/filters/NarrationSearch";
import TypeToggle from "@/components/filters/TypeToggle";
import StatementFilter from "@/components/filters/StatementFilter";
import NarrationGroupList from "@/components/filters/NarrationGroupList";
import TransactionTable from "@/components/transactions/TransactionTable";
import TransactionSummaryBar from "@/components/transactions/TransactionSummaryBar";
import { useTransactions } from "@/hooks/useTransactions";
import { useStatements } from "@/hooks/useStatements";
import { useFiltersStore } from "@/store/filters.store";
import { computeSummary } from "@/analysis/aggregations";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

/**
 * Transactions page — full filterable transaction explorer.
 *
 * Layout:
 *   Mobile:  stacked — filter bar → search → summary bar → table
 *            "Narrations" slide-up panel via bottom sheet toggle
 *   Desktop: two-column — left: narration group list (sidebar)
 *                         right: filters + summary bar + table
 *
 * Filters available:
 *   - Date preset pills (DateFilterBar)
 *   - Narration text search (NarrationSearch)
 *   - Debit / Credit / All toggle (TypeToggle)
 *   - Statement source pills (StatementFilter)
 *   - Narration group click (NarrationGroupList)
 *
 * All filters compose via applyFilters() in useTransactions.
 * Summary bar updates in real-time.
 */
export default function TransactionsPage() {
  const { loadAll } = useStatements();
  const { filteredTransactions, isLoading } = useTransactions();
  const resetFilters = useFiltersStore((s) => s.resetFilters);
  const narrationSearch = useFiltersStore((s) => s.narrationSearch);
  const datePreset = useFiltersStore((s) => s.datePreset);
  const transactionType = useFiltersStore((s) => s.transactionType);
  const [showNarPanel, setShowNarPanel] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Summary metrics derived from current filtered set
  const summary = useMemo(
    () => computeSummary(filteredTransactions),
    [filteredTransactions],
  );

  // Detect if any non-default filter is active
  const hasActiveFilters =
    narrationSearch !== "" ||
    transactionType !== "all" ||
    (datePreset !== "this_month" && datePreset !== null);

  return (
    <AppLayout
      title="Transactions"
      action={
        <button
          onClick={() => setShowNarPanel((v) => !v)}
          className={cn(
            "flex lg:hidden items-center gap-1.5 h-9 px-3 rounded-btn text-sm font-medium transition-colors",
            showNarPanel
              ? "bg-green-primary text-white"
              : "border border-surface-border text-data-secondary hover:text-gray-700",
          )}
          aria-label="Toggle narration panel"
        >
          <SlidersHorizontal size={15} />
          <span>Narrations</span>
        </button>
      }
    >
      <PageWrapper className="h-full">
        {/* Desktop: two-column layout */}
        <div className="flex gap-6 h-full">
          {/* ── Left: Narration group list (desktop sidebar) ── */}
          <aside className="hidden lg:flex flex-col w-72 shrink-0">
            <SectionCard
              noPadding
              className="sticky top-4 flex flex-col overflow-hidden"
            >
              <SectionHeader
                title="Narrations"
                subtitle="Click to filter by narration"
                className="px-3 pt-3"
              />
              <NarrationGroupList transactions={filteredTransactions} />
            </SectionCard>
          </aside>

          {/* ── Right: Filters + table ── */}
          <div className="flex-1 min-w-0">
            <PageWrapper fluid>
              {/* Date presets */}
              <DateFilterBar />

              {/* Statement source pills */}
              <StatementFilter />

              {/* Search + type toggle row */}
              <div className="flex gap-2">
                <NarrationSearch className="flex-1" />
                <TypeToggle />
              </div>

              {/* Active filter chips + clear */}
              {hasActiveFilters && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-data-secondary">
                    Active filters:
                  </span>

                  {narrationSearch && (
                    <FilterChip
                      label={`"${narrationSearch}"`}
                      onRemove={() =>
                        useFiltersStore.getState().setNarrationSearch("")
                      }
                    />
                  )}
                  {transactionType !== "all" && (
                    <FilterChip
                      label={
                        transactionType === "debit"
                          ? "Debits only"
                          : "Credits only"
                      }
                      onRemove={() =>
                        useFiltersStore.getState().setTransactionType("all")
                      }
                    />
                  )}

                  <button
                    onClick={resetFilters}
                    className="text-xs font-medium text-data-alert hover:underline ml-1"
                  >
                    Clear all
                  </button>
                </div>
              )}

              {/* Summary bar */}
              {filteredTransactions.length > 0 && (
                <TransactionSummaryBar
                  summary={summary}
                  resultCount={filteredTransactions.length}
                />
              )}

              {/* Transaction table */}
              {isLoading ? (
                <TransactionTable transactions={[]} isLoading />
              ) : (
                <TransactionTable transactions={filteredTransactions} />
              )}
            </PageWrapper>
          </div>
        </div>
      </PageWrapper>

      {/* ── Mobile narration bottom sheet ── */}
      {showNarPanel && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/30"
            onClick={() => setShowNarPanel(false)}
            aria-hidden="true"
          />

          {/* Bottom sheet */}
          <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-[20px] shadow-xl max-h-[80dvh] flex flex-col">
            {/* Handle + header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-surface-border shrink-0">
              <div>
                <div
                  className="w-10 h-1 bg-surface-muted rounded-full mx-auto mb-3"
                  aria-hidden="true"
                />
                <h3 className="text-sm font-semibold text-gray-900">
                  Narrations
                </h3>
                <p className="text-xs text-data-secondary">
                  Tap to filter by narration
                </p>
              </div>
              <button
                onClick={() => setShowNarPanel(false)}
                className="p-1.5 rounded-btn text-gray-400 hover:text-gray-700 hover:bg-surface-muted"
                aria-label="Close narration panel"
              >
                <X size={18} />
              </button>
            </div>

            {/* Narration list */}
            <NarrationGroupList
              transactions={filteredTransactions}
              className="flex-1 overflow-hidden"
            />
          </div>
        </>
      )}
    </AppLayout>
  );
}

// ── Active filter chip ─────────────────────────────────────

interface FilterChipProps {
  label: string;
  onRemove: () => void;
}

/**
 * Small dismissible chip showing an active filter.
 */
function FilterChip({ label, onRemove }: FilterChipProps) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-chip bg-green-subtle border border-green-muted text-xs font-medium text-green-deep">
      {label}
      <button
        onClick={onRemove}
        className="ml-0.5 text-green-primary hover:text-data-alert transition-colors"
        aria-label={`Remove filter ${label}`}
      >
        <X size={11} />
      </button>
    </span>
  );
}
