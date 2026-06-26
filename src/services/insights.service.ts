import {
  averageDailySpend,
  computeMonthlyAggregates,
  groupByCategory,
} from "@/analysis/aggregations";
import { detectRecurringExpenses } from "@/analysis/recurring";
import type { Transaction } from "@/types";
import type { AnomalySampleTransaction } from "@/appwrite/functions";

export function buildInsightsContext(transactions: Transaction[]) {
  const categories = groupByCategory(transactions).slice(0, 10);
  const monthly = computeMonthlyAggregates(transactions).slice(-6);
  const recurring = detectRecurringExpenses(transactions);
  const totalDebits = transactions
    .filter((t) => t.type === "debit")
    .reduce((sum, tx) => sum + tx.amount, 0);
  const totalCredits = transactions
    .filter((t) => t.type === "credit")
    .reduce((sum, tx) => sum + tx.amount, 0);
  const dates = transactions.map((t) => t.date.getTime());

  return {
    totalTransactions: transactions.length,
    dateRange: {
      from: dates.length ? new Date(Math.min(...dates)).toISOString() : "",
      to: dates.length ? new Date(Math.max(...dates)).toISOString() : "",
    },
    topCategories: categories.map((category) => ({
      name: category.category,
      amount: category.total,
      count: category.count,
    })),
    monthlyBreakdown: monthly.map((month) => ({
      month: month.label,
      debits: month.totalDebits,
      credits: month.totalCredits,
    })),
    averageDailySpend: averageDailySpend(transactions),
    summary: {
      totalDebits,
      totalCredits,
      topCategories: categories.slice(0, 5).map((category) => ({
        name: category.category,
        amount: category.total,
      })),
      monthlyTotals: monthly.map((month) => ({
        month: month.label,
        debits: month.totalDebits,
        credits: month.totalCredits,
      })),
      recurringExpenses: recurring.slice(0, 5).map((recurringExpense) => ({
        narration: recurringExpense.narration,
        amount: recurringExpense.averageAmount,
        frequency: `every ~${recurringExpense.intervalDays} days`,
      })),
    },
  };
}

export function buildAnomalySample(
  transactions: Transaction[],
): AnomalySampleTransaction[] {
  return transactions
    .filter((transaction) => transaction.type === "debit")
    .slice(0, 200)
    .map(({ date, amount, type }) => ({
      date: date.toISOString(),
      amount,
      type,
    }));
}
