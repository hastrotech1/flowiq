import { differenceInDays } from 'date-fns'
import type { Transaction, RecurringExpense } from '@/types'
import { RECURRING_THRESHOLD, RECURRING_INTERVAL_DAYS } from '@/lib/constants'

/**
 * Detects recurring expense patterns in a transaction set.
 *
 * A transaction is considered recurring if:
 * 1. The same narration appears >= RECURRING_THRESHOLD times (default: 3)
 * 2. Occurrences are spaced within RECURRING_INTERVAL_DAYS (default: 35 days)
 *
 * @param transactions - Full debit transaction list to analyse
 * @returns Sorted list of recurring expenses, highest total first
 */
export function detectRecurringExpenses(
  transactions: Transaction[]
): RecurringExpense[] {
  // Only analyse debits
  const debits = transactions.filter((t) => t.type === 'debit')

  // Group by normalised narration key
  const groups = new Map<string, Transaction[]>()
  for (const tx of debits) {
    const key = normaliseNarration(tx.narration)
    const existing = groups.get(key) ?? []
    groups.set(key, [...existing, tx])
  }

  const recurring: RecurringExpense[] = []

  for (const [, txs] of groups) {
    if (txs.length < RECURRING_THRESHOLD) continue

    // Sort by date ascending for interval calculation
    const sorted = [...txs].sort((a, b) => a.date.getTime() - b.date.getTime())

    // Check if average interval between occurrences is within threshold
    const intervals: number[] = []
    for (let i = 1; i < sorted.length; i++) {
      intervals.push(differenceInDays(sorted[i].date, sorted[i - 1].date))
    }
    const avgInterval = intervals.reduce((s, n) => s + n, 0) / intervals.length

    if (avgInterval > RECURRING_INTERVAL_DAYS) continue

    const totalAmount   = txs.reduce((sum, t) => sum + t.amount, 0)
    const averageAmount = totalAmount / txs.length

    recurring.push({
      narration:          txs[0].narration,
      normalizedCategory: txs[0].normalizedCategory,
      occurrences:        txs.length,
      averageAmount,
      totalAmount,
      intervalDays:       Math.round(avgInterval),
      lastSeen:           sorted[sorted.length - 1].date,
      transactions:       sorted,
    })
  }

  return recurring.sort((a, b) => b.totalAmount - a.totalAmount)
}

/**
 * Returns the complement — transactions that are NOT recurring.
 * Used to display one-time expenses separately.
 *
 * @param transactions - All debit transactions
 * @param recurring    - Output of detectRecurringExpenses()
 */
export function getOneTimeExpenses(
  transactions: Transaction[],
  recurring: RecurringExpense[],
): Transaction[] {
  // Build a set of all transaction IDs that are recurring
  const recurringIds = new Set(
    recurring.flatMap((r) => r.transactions.map((t) => t.id))
  )
  return transactions.filter(
    (t) => t.type === 'debit' && !recurringIds.has(t.id)
  )
}

/**
 * Normalises a narration string for grouping purposes.
 * Strips variable parts (reference numbers, dates, amounts)
 * so "AIRTIME MTN 0803 REF:12345" and "AIRTIME MTN 0803 REF:67890"
 * group together.
 */
function normaliseNarration(narration: string): string {
  return narration
    .toLowerCase()
    .trim()
    // Remove standalone numbers (reference IDs, dates)
    .replace(/\b\d{5,}\b/g, '')
    // Remove common transaction ref patterns
    .replace(/ref[:\s]\w+/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}
