import { describe, expect, it } from "vitest";
import {
  averageDailySpend,
  averageMonthlySpend,
  computeDailyAggregates,
  computeMonthlyAggregates,
  computeSummary,
  groupByCategory,
} from "@/analysis/aggregations";
import type { Transaction } from "@/types";

const tx = (
  id: string,
  date: string,
  amount: number,
  type: Transaction["type"],
  normalizedCategory: string | null = null,
): Transaction => ({
  id,
  statementId: "stmt_1",
  userId: "user_1",
  date: new Date(date),
  amount,
  type,
  narration: normalizedCategory ?? "Uncategorized",
  normalizedCategory,
  balance: null,
  isInterAccountTransfer: false,
  transferPairId: null,
  createdAt: date,
});

describe("financial aggregations", () => {
  const transactions = [
    tx("1", "2024-01-05T00:00:00.000Z", 1000, "debit", "Food"),
    tx("2", "2024-01-05T12:00:00.000Z", 2500, "credit"),
    tx("3", "2024-01-07T00:00:00.000Z", 500, "debit", "Transport"),
    tx("4", "2024-02-01T00:00:00.000Z", 1500, "debit", "Food"),
  ];

  it("computes summary totals, net flow, and extrema", () => {
    const summary = computeSummary(transactions);

    expect(summary.totalDebits).toBe(3000);
    expect(summary.totalCredits).toBe(2500);
    expect(summary.netFlow).toBe(-500);
    expect(summary.averageDebitAmount).toBe(1000);
    expect(summary.largestDebit?.id).toBe("4");
    expect(summary.smallestDebit?.id).toBe("3");
  });

  it("groups daily and monthly totals accurately", () => {
    expect(computeDailyAggregates(transactions)).toMatchObject([
      { date: "2024-01-05", totalDebits: 1000, totalCredits: 2500 },
      { date: "2024-01-07", totalDebits: 500, totalCredits: 0 },
      { date: "2024-02-01", totalDebits: 1500, totalCredits: 0 },
    ]);

    expect(computeMonthlyAggregates(transactions)).toMatchObject([
      { month: "2024-01", totalDebits: 1500, totalCredits: 2500 },
      { month: "2024-02", totalDebits: 1500, totalCredits: 0 },
    ]);
  });

  it("computes debit-only averages and category totals", () => {
    expect(averageDailySpend(transactions)).toBe(1000);
    expect(averageMonthlySpend(transactions)).toBe(1500);
    expect(groupByCategory(transactions)).toEqual([
      { category: "Food", total: 2500, count: 2 },
      { category: "Transport", total: 500, count: 1 },
    ]);
  });
});
