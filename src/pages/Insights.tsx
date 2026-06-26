import { useEffect, useRef, useState } from "react";
import {
  Lightbulb,
  RefreshCw,
  Send,
  Trash2,
  AlertTriangle,
  TrendingUp,
  Info,
  Sparkles,
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import PageWrapper, {
  SectionCard,
  SectionHeader,
} from "@/components/layout/PageWrapper";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import EmptyState from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useInsights } from "@/hooks/useInsights";
import { useStatements } from "@/hooks/useStatements";
import { cn } from "@/lib/utils";
import type { InsightCard } from "@/appwrite/functions";

/**
 * AI Insights page.
 *
 * Two sections:
 * 1. Auto-generated insight cards (info / warning / positive / tip)
 *    + anomaly list — loaded on mount via Appwrite Function AI proxy
 * 2. Natural language query chat interface — multi-turn conversation
 *    where the user asks questions about their transactions in plain English
 */
export default function InsightsPage() {
  const { loadAll } = useStatements();
  const {
    insights,
    anomalies,
    history,
    loadingInsights,
    loadingAnomalies,
    loadingQuery,
    insightsError,
    queryError,
    loadInsights,
    loadAnomalies,
    ask,
    clearHistory,
    hasData,
  } = useInsights();

  const [question, setQuestion] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load data + trigger AI on mount
  useEffect(() => {
    loadAll();
  }, [loadAll]);
  useEffect(() => {
    if (!hasData) return;
    loadInsights();
    loadAnomalies();
  }, [hasData, loadInsights, loadAnomalies]);

  // Scroll chat to bottom when history changes
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const handleAsk = async () => {
    if (!question.trim() || loadingQuery) return;
    const q = question.trim();
    setQuestion("");
    await ask(q);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  return (
    <AppLayout
      title="AI Insights"
      action={
        hasData ? (
          <button
            onClick={() => {
              loadInsights();
              loadAnomalies();
            }}
            disabled={loadingInsights}
            className="p-2 rounded-btn text-data-secondary hover:text-gray-700 hover:bg-surface-muted transition-colors disabled:opacity-40"
            aria-label="Refresh insights"
          >
            <RefreshCw
              size={16}
              className={loadingInsights ? "animate-spin" : ""}
            />
          </button>
        ) : undefined
      }
    >
      <PageWrapper>
        {/* ── No data state ── */}
        {!hasData && (
          <SectionCard>
            <EmptyState
              icon={<Lightbulb size={24} />}
              title="No data to analyse"
              description="Upload a bank statement to unlock AI-powered insights about your spending."
            />
          </SectionCard>
        )}

        {/* ── Insight cards ── */}
        {hasData && (
          <SectionCard>
            <SectionHeader
              title="Spending Insights"
              subtitle="AI analysis of your financial patterns"
            />

            <ErrorBoundary context="Insights cards">
              {loadingInsights ? (
                <div className="flex flex-col gap-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : insightsError ? (
                <p className="text-sm text-data-alert">{insightsError}</p>
              ) : insights.length === 0 ? (
                <p className="text-sm text-data-secondary">
                  No insights generated yet. Try refreshing.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {insights.map((card) => (
                    <InsightCardUI key={card.id} card={card} />
                  ))}
                </div>
              )}
            </ErrorBoundary>
          </SectionCard>
        )}

        {/* ── Anomalies ── */}
        {hasData && (loadingAnomalies || anomalies.length > 0) && (
          <SectionCard noPadding>
            <SectionHeader
              title="Unusual Transactions"
              subtitle="Transactions that deviate from your normal patterns"
              className="px-4 pt-4"
            />
            <ErrorBoundary context="Insights anomalies">
              {loadingAnomalies ? (
                <div className="px-4 pb-4 flex flex-col gap-2">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-surface-border">
                  {anomalies.map((a) => (
                    <div
                      key={`${a.date}-${a.narration}`}
                      className="flex items-start gap-3 px-4 py-3"
                    >
                      <AlertTriangle
                        size={16}
                        className={cn(
                          "shrink-0 mt-0.5",
                          a.severity === "high"
                            ? "text-data-alert"
                            : a.severity === "medium"
                              ? "text-data-warning"
                              : "text-data-secondary",
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {a.narration}
                        </p>
                        <p className="text-xs text-data-secondary mt-0.5">
                          {a.explanation}
                        </p>
                      </div>
                      <p className="text-sm font-semibold amount-debit tabular-nums font-amount shrink-0">
                        ₦{a.amount.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </ErrorBoundary>
          </SectionCard>
        )}

        {/* ── NL Query chat ── */}
        {hasData && (
          <SectionCard noPadding>
            <SectionHeader
              title="Ask FlowIQ"
              subtitle="Ask anything about your transactions in plain English"
              className="px-4 pt-4"
              action={
                history.length > 0 ? (
                  <button
                    onClick={clearHistory}
                    className="flex items-center gap-1 text-xs text-data-secondary hover:text-data-alert transition-colors"
                  >
                    <Trash2 size={12} /> Clear
                  </button>
                ) : undefined
              }
            />

            {/* Chat history */}
            <div className="flex flex-col gap-3 px-4 pb-3 max-h-[400px] overflow-y-auto">
              {history.length === 0 && (
                <div className="flex flex-col gap-2 py-2">
                  <p className="text-xs text-data-secondary font-medium">
                    Try asking:
                  </p>
                  {EXAMPLE_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => ask(q)}
                      className="text-left text-xs text-green-primary hover:underline focus-visible:outline-none"
                    >
                      "{q}"
                    </button>
                  ))}
                </div>
              )}

              {history.map((turn) => (
                <ChatBubble key={turn.id} turn={turn} />
              ))}

              {loadingQuery && (
                <div className="flex items-center gap-2">
                  <Sparkles
                    size={14}
                    className="text-green-primary animate-pulse"
                  />
                  <Skeleton className="h-4 w-48" />
                </div>
              )}

              {queryError && (
                <p className="text-xs text-data-alert px-1">{queryError}</p>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="flex items-center gap-2 px-4 pb-4 pt-2 border-t border-surface-border">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="How much did I spend on airtime last month?"
                rows={1}
                className="flex-1 resize-none rounded-input border border-surface-border px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-accent/30 focus:border-green-primary leading-snug"
                maxLength={1000}
                disabled={loadingQuery}
              />
              <button
                onClick={handleAsk}
                disabled={!question.trim() || loadingQuery}
                className="w-10 h-10 rounded-btn bg-green-primary text-white flex items-center justify-center shrink-0 hover:bg-green-deep transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Send question"
              >
                <Send size={15} />
              </button>
            </div>
          </SectionCard>
        )}
      </PageWrapper>
    </AppLayout>
  );
}

// ── Insight card UI ────────────────────────────────────────

const INSIGHT_ICONS = {
  info: <Info size={16} />,
  warning: <AlertTriangle size={16} />,
  positive: <TrendingUp size={16} />,
  tip: <Lightbulb size={16} />,
};

const INSIGHT_STYLES = {
  info: "bg-blue-50  border-blue-100  text-data-primary",
  warning: "bg-orange-50 border-orange-100 text-data-warning",
  positive: "bg-green-subtle border-green-muted text-green-deep",
  tip: "bg-surface-muted border-surface-border text-gray-700",
};

function InsightCardUI({ card }: { card: InsightCard }) {
  return (
    <div
      className={cn(
        "flex gap-3 p-3.5 rounded-btn border",
        INSIGHT_STYLES[card.type],
      )}
    >
      <span className="shrink-0 mt-0.5" aria-hidden="true">
        {INSIGHT_ICONS[card.type]}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold leading-snug">{card.title}</p>
          {card.metric && (
            <span className="text-sm font-bold tabular-nums font-amount shrink-0">
              {card.metric}
            </span>
          )}
        </div>
        <p className="text-xs mt-1 leading-relaxed opacity-80">{card.body}</p>
      </div>
    </div>
  );
}

// ── Chat bubble ────────────────────────────────────────────

function ChatBubble({ turn }: { turn: { role: string; content: string } }) {
  const isUser = turn.role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-card px-3.5 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-green-primary text-white rounded-br-sm"
            : "bg-surface-muted text-gray-800 rounded-bl-sm",
        )}
      >
        {turn.content}
      </div>
    </div>
  );
}

// ── Example questions ──────────────────────────────────────

const EXAMPLE_QUESTIONS = [
  "How much did I spend on airtime in the last 3 months?",
  "What is my biggest expense category?",
  "Which day of the week do I spend the most?",
  "Am I spending more or less than last month?",
];
