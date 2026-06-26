import { describe, expect, it } from "vitest";
import {
  detectBankFormat,
  parseAmount,
  parseDate,
  resolveType,
  normalizeTransactions,
} from "@/parsers";
import type { RawTransaction } from "@/types";

describe("parser normalization", () => {
  it("parses Nigerian statement dates, amounts, and transaction types", () => {
    expect(parseDate("Mon, 15/03/2024")?.getFullYear()).toBe(2024);
    expect(parseDate("Mon, 15/03/2024")?.getMonth()).toBe(2);
    expect(parseDate("Mon, 15/03/2024")?.getDate()).toBe(15);
    expect(parseAmount("NGN 1,250.50")).toBe(1250.5);
    expect(parseAmount("(5,000.00)")).toBe(5000);
    expect(resolveType("Dr")).toBe("debit");
    expect(resolveType("credit transfer")).toBe("credit");
  });

  it("filters invalid rows and returns sorted typed transactions", () => {
    const rows: RawTransaction[] = [
      {
        date: "16/03/2024",
        amount: "2,000",
        type: "Cr",
        narration: "Refund",
        balance: "10,000",
      },
      {
        date: "not a date",
        amount: "1,000",
        type: "Dr",
        narration: "Bad row",
        balance: null,
      },
      {
        date: "15/03/2024",
        amount: "500",
        type: "Dr",
        narration: "Airtime",
        balance: "8,000",
      },
    ];

    const txs = normalizeTransactions(rows, "stmt_1", "user_1");

    expect(txs).toHaveLength(2);
    expect(txs.map((tx) => tx.narration)).toEqual(["Airtime", "Refund"]);
    expect(txs[0]).toMatchObject({
      statementId: "stmt_1",
      userId: "user_1",
      amount: 500,
      type: "debit",
      balance: 8000,
    });
  });
});

describe("bank format detection", () => {
  it("scores exact distinctive signatures instead of first matching vague columns", () => {
    const headers = ["Date", "Debit", "Credit", "Description", "Reference"];

    expect(detectBankFormat(headers)?.bank).toBe("Stanbic");
  });

  it("returns null for ambiguous partial signatures", () => {
    const headers = ["Date", "Debit", "Credit", "Balance"];

    expect(detectBankFormat(headers)).toBeNull();
  });
});
