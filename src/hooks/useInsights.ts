import { useState, useCallback, useMemo } from 'react'
import { generateInsights, queryTransactions, detectAnomalies } from '@/appwrite/functions'
import { useTransactions } from './useTransactions'
import { groupByCategory, computeMonthlyAggregates, averageDailySpend } from '@/analysis/aggregations'
import { detectRecurringExpenses } from '@/analysis/recurring'
import type { InsightCard, AnomalyResult, ConversationTurn } from '@/appwrite/functions'

/**
 * Manages all AI Insights page state:
 * - Pre-generated insight cards (via generateInsights Appwrite Function)
 * - Anomaly detection results
 * - Multi-turn natural language query conversation
 *
 * Builds a minimal summarised context from transaction data before
 * sending to the AI — we never send raw PII-laden transaction rows.
 */
export function useInsights() {
  const { filteredTransactions } = useTransactions()

  const [insights,    setInsights]    = useState<InsightCard[]>([])
  const [anomalies,   setAnomalies]   = useState<AnomalyResult[]>([])
  const [history,     setHistory]     = useState<ConversationTurn[]>([])
  const [loadingInsights,  setLoadingInsights]  = useState(false)
  const [loadingAnomalies, setLoadingAnomalies] = useState(false)
  const [loadingQuery,     setLoadingQuery]     = useState(false)
  const [insightsError,    setInsightsError]    = useState<string | null>(null)
  const [queryError,       setQueryError]       = useState<string | null>(null)

  /** Summarised transaction context sent to the AI proxy */
  const txContext = useMemo(() => {
    const categories = groupByCategory(filteredTransactions).slice(0, 10)
    const monthly    = computeMonthlyAggregates(filteredTransactions).slice(-6)
    const recurring  = detectRecurringExpenses(filteredTransactions)
    const totalDebits  = filteredTransactions.filter((t) => t.type === 'debit').reduce((s, t) => s + t.amount, 0)
    const totalCredits = filteredTransactions.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0)
    const dates        = filteredTransactions.map((t) => t.date.getTime())

    return {
      totalTransactions: filteredTransactions.length,
      dateRange: {
        from: dates.length ? new Date(Math.min(...dates)).toISOString() : '',
        to:   dates.length ? new Date(Math.max(...dates)).toISOString() : '',
      },
      topCategories: categories.map((c) => ({
        name: c.category, amount: c.total, count: c.count,
      })),
      monthlyBreakdown: monthly.map((m) => ({
        month:   m.label,
        debits:  m.totalDebits,
        credits: m.totalCredits,
      })),
      averageDailySpend: averageDailySpend(filteredTransactions),
      // Summary for generateInsights
      summary: {
        totalDebits,
        totalCredits,
        topCategories:     categories.slice(0, 5).map((c) => ({ name: c.category, amount: c.total })),
        monthlyTotals:     monthly.map((m) => ({ month: m.label, debits: m.totalDebits, credits: m.totalCredits })),
        recurringExpenses: recurring.slice(0, 5).map((r) => ({
          narration:  r.narration,
          amount:     r.averageAmount,
          frequency:  `every ~${r.intervalDays} days`,
        })),
      },
    }
  }, [filteredTransactions])

  /**
   * Calls the AI proxy to generate pre-built insight cards.
   * Runs once when the user opens the Insights page or taps "Refresh".
   */
  const loadInsights = useCallback(async () => {
    if (filteredTransactions.length === 0) return
    setLoadingInsights(true)
    setInsightsError(null)
    try {
      const cards = await generateInsights(txContext.summary)
      setInsights(cards)
    } catch (e) {
      setInsightsError(e instanceof Error ? e.message : 'Failed to load insights.')
    } finally {
      setLoadingInsights(false)
    }
  }, [filteredTransactions.length, txContext.summary])

  /**
   * Calls the AI proxy to detect anomalous transactions.
   * Sends the last 200 debit transactions (summary-level, not full list).
   */
  const loadAnomalies = useCallback(async () => {
    if (filteredTransactions.length === 0) return
    setLoadingAnomalies(true)
    try {
      const sample = filteredTransactions
        .filter((t) => t.type === 'debit')
        .slice(0, 200)
        .map(({ date, amount, narration, type }) => ({ date, amount, narration, type }))
      const results = await detectAnomalies(sample)
      setAnomalies(results)
    } catch {
      // Anomaly detection failure is non-fatal
    } finally {
      setLoadingAnomalies(false)
    }
  }, [filteredTransactions])

  /**
   * Sends a natural language question to the AI agent.
   * Maintains multi-turn conversation history.
   * Context is the summarised txContext — no raw transaction data.
   *
   * @param question - The user's question string
   */
  const ask = useCallback(async (question: string) => {
    if (!question.trim()) return
    setLoadingQuery(true)
    setQueryError(null)

    // Add user message to history immediately (optimistic)
    const userTurn: ConversationTurn = { role: 'user', content: question }
    setHistory((h) => [...h, userTurn])

    try {
      const answer = await queryTransactions(question, txContext, [
        ...history, userTurn,
      ])
      setHistory((h) => [...h, { role: 'assistant', content: answer }])
    } catch (e) {
      setQueryError(e instanceof Error ? e.message : 'Failed to get a response.')
      // Remove the optimistic user message on failure
      setHistory((h) => h.slice(0, -1))
    } finally {
      setLoadingQuery(false)
    }
  }, [history, txContext])

  /** Clears the conversation history */
  const clearHistory = useCallback(() => setHistory([]), [])

  return {
    insights, anomalies, history,
    loadingInsights, loadingAnomalies, loadingQuery,
    insightsError, queryError,
    loadInsights, loadAnomalies, ask, clearHistory,
    hasData: filteredTransactions.length > 0,
  }
}
