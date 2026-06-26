import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  generateInsights,
  queryTransactions,
  detectAnomalies,
} from "@/appwrite/functions";
import { useTransactions } from "./useTransactions";
import {
  buildInsightsContext,
  buildAnomalySample,
} from "@/services/insights.service";
import { generateId } from "@/lib/utils";
import type {
  InsightCard,
  AnomalyResult,
  ConversationTurn,
} from "@/appwrite/functions";

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
  const { filteredTransactions } = useTransactions();

  const [insights, setInsights] = useState<InsightCard[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyResult[]>([]);
  const [history, setHistory] = useState<ConversationTurn[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [loadingAnomalies, setLoadingAnomalies] = useState(false);
  const [loadingQuery, setLoadingQuery] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);

  /** Summarised transaction context sent to the AI proxy */
  const txContext = useMemo(
    () => buildInsightsContext(filteredTransactions),
    [filteredTransactions],
  );
  const filteredTransactionsRef = useRef(filteredTransactions);
  const txContextRef = useRef(txContext);
  const historyRef = useRef(history);

  useEffect(() => {
    filteredTransactionsRef.current = filteredTransactions;
    txContextRef.current = txContext;
    historyRef.current = history;
  }, [filteredTransactions, txContext, history]);

  /**
   * Calls the AI proxy to generate pre-built insight cards.
   * Runs once when the user opens the Insights page or taps "Refresh".
   */
  const loadInsights = useCallback(async () => {
    const currentTransactions = filteredTransactionsRef.current;
    if (currentTransactions.length === 0) return;
    setLoadingInsights(true);
    setInsightsError(null);
    try {
      const cards = await generateInsights(txContextRef.current.summary);
      setInsights(cards);
    } catch (e) {
      setInsightsError(
        e instanceof Error ? e.message : "Failed to load insights.",
      );
    } finally {
      setLoadingInsights(false);
    }
  }, []);

  /**
   * Calls the AI proxy to detect anomalous transactions.
   * Sends the last 200 debit transactions (summary-level, not full list).
   */
  const loadAnomalies = useCallback(async () => {
    const currentTransactions = filteredTransactionsRef.current;
    if (currentTransactions.length === 0) return;
    setLoadingAnomalies(true);
    try {
      const sample = buildAnomalySample(currentTransactions);
      const results = await detectAnomalies(sample);
      setAnomalies(results);
    } catch {
      // Anomaly detection failure is non-fatal
    } finally {
      setLoadingAnomalies(false);
    }
  }, []);

  /**
   * Sends a natural language question to the AI agent.
   * Maintains multi-turn conversation history.
   * Context is the summarised txContext — no raw transaction data.
   *
   * @param question - The user's question string
   */
  const ask = useCallback(
    async (question: string) => {
      if (!question.trim()) return;
      setLoadingQuery(true);
      setQueryError(null);

      // Add user message to history immediately (optimistic)
      const userTurn: ConversationTurn = {
        id: generateId(),
        role: "user",
        content: question,
      };
      setHistory((h) => [...h, userTurn]);

      try {
        const answer = await queryTransactions(question, txContextRef.current, [
          ...historyRef.current,
          userTurn,
        ]);
        setHistory((h) => [
          ...h,
          { id: generateId(), role: "assistant", content: answer },
        ]);
      } catch (e) {
        setQueryError(
          e instanceof Error ? e.message : "Failed to get a response.",
        );
        // Remove the optimistic user message on failure
        setHistory((h) => h.slice(0, -1));
      } finally {
        setLoadingQuery(false);
      }
    },
    [],
  );

  /** Clears the conversation history */
  const clearHistory = useCallback(() => setHistory([]), []);

  return {
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
    hasData: filteredTransactions.length > 0,
  };
}
