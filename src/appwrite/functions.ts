import { functions } from "./client";
import { APPWRITE_CONFIG, AI_MODEL } from "@/lib/constants";
import type { Transaction } from "@/types";

const FUNCTION_ID = APPWRITE_CONFIG.functions.aiProxy;

// ════════════════════════════════════════════════════════════
// AI PROXY — all Anthropic API calls route through here
// The Appwrite Function holds the ANTHROPIC_API_KEY securely.
// The client never sees or touches the key directly.
// ════════════════════════════════════════════════════════════

/**
 * Payload shape sent to the Appwrite AI proxy function.
 * The function forwards this to the Anthropic /v1/messages endpoint.
 */
interface AIProxyPayload {
  action: "categorize" | "insights" | "query" | "anomalies";
  data: unknown;
}

/**
 * Invokes the Appwrite Function AI proxy and returns parsed JSON.
 * All AI operations (categorize, insights, query) go through this.
 *
 * @param payload - Action type and data to send to the AI
 */
async function invokeAIProxy<T>(payload: AIProxyPayload): Promise<T> {
  const execution = await functions.createExecution(
    FUNCTION_ID,
    JSON.stringify(payload),
    false, // synchronous execution — wait for result
  );

  if (execution.responseStatusCode !== 200) {
    throw new Error(
      `AI proxy returned ${execution.responseStatusCode}: ${execution.responseBody}`,
    );
  }

  return JSON.parse(execution.responseBody) as T;
}

// ────────────────────────────────────────────────────────────

/**
 * Sends a batch of unique narration strings to the AI for clustering.
 * Returns a map of { narration → category label }.
 *
 * @example
 * Input:  ["AIRTIME MTN 0803...", "VAS/AIRTIME/0803", "FOOD DELIVERY"]
 * Output: { "AIRTIME MTN 0803...": "Airtime & Data", ... }
 *
 * @param narrations - Unique narration strings from the user's transactions
 */
export async function categorizeNarrations(
  narrations: string[],
): Promise<Record<string, string>> {
  return invokeAIProxy<Record<string, string>>({
    action: "categorize",
    data: { narrations, model: AI_MODEL },
  });
}

/**
 * Generates pre-built insights for the Insights page.
 * AI analyses the summarised transaction data and returns
 * a structured list of insight cards.
 *
 * @param summary - Aggregated transaction data (not raw transactions)
 */
export async function generateInsights(summary: {
  totalDebits: number;
  totalCredits: number;
  topCategories: { name: string; amount: number }[];
  monthlyTotals: { month: string; debits: number; credits: number }[];
  recurringExpenses: { narration: string; amount: number; frequency: string }[];
}): Promise<InsightCard[]> {
  return invokeAIProxy<InsightCard[]>({
    action: "insights",
    data: { summary, model: AI_MODEL },
  });
}

/**
 * Answers a natural language query about the user's transactions.
 * The AI has access to transaction summaries (not raw PII data).
 *
 * @param question     - The user's plain English question
 * @param context      - Summarised transaction context to answer from
 * @param history      - Prior conversation turns for multi-turn support
 */
export async function queryTransactions(
  question: string,
  context: TransactionContext,
  history: ConversationTurn[] = [],
): Promise<string> {
  const result = await invokeAIProxy<{ answer: string }>({
    action: "query",
    data: { question, context, history, model: AI_MODEL },
  });
  return result.answer;
}

/**
 * Runs anomaly detection on the user's transaction history.
 * Returns a list of flagged transactions with explanations.
 *
 * @param transactions - Recent transactions to scan for anomalies
 */
export async function detectAnomalies(
  transactions: AnomalySampleTransaction[],
): Promise<AnomalyResult[]> {
  return invokeAIProxy<AnomalyResult[]>({
    action: "anomalies",
    data: { transactions, model: AI_MODEL },
  });
}

// ════════════════════════════════════════════════════════════
// RETURN TYPES
// ════════════════════════════════════════════════════════════

export interface InsightCard {
  id: string;
  type: "info" | "warning" | "positive" | "tip";
  title: string;
  body: string;
  /** Optional metric to display prominently on the card */
  metric?: string;
}

export interface AnomalyResult {
  /** ISO date string of the flagged transaction */
  date: string;
  amount: number;
  narration: string;
  explanation: string;
  severity: "low" | "medium" | "high";
}

export interface AnomalySampleTransaction {
  date: string;
  amount: number;
  type: Transaction["type"];
}

export interface TransactionContext {
  totalTransactions: number;
  dateRange: { from: string; to: string };
  topCategories: { name: string; amount: number; count: number }[];
  monthlyBreakdown: { month: string; debits: number; credits: number }[];
  averageDailySpend: number;
}

export interface ConversationTurn {
  id: string;
  role: "user" | "assistant";
  content: string;
}
