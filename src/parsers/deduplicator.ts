import { differenceInDays } from 'date-fns'
import type { Transaction } from '@/types'

/**
 * Amount tolerance for matching transfer pairs.
 * Handles minor discrepancies from bank charges on transfers.
 * e.g. ₦50,000 sent → ₦49,950 received after stamp duty.
 */
const AMOUNT_TOLERANCE_PERCENT = 0.02   // 2%

/** Max days apart for a debit/credit pair to be considered a transfer */
const DATE_TOLERANCE_DAYS = 3

// ════════════════════════════════════════════════════════════
// INTER-ACCOUNT TRANSFER DETECTION
// ════════════════════════════════════════════════════════════

/**
 * Identifies inter-account transfers across multiple bank statements.
 * A transfer is a debit in statement A that has a matching credit in
 * statement B (or vice versa) with similar amount and close date.
 *
 * Mutates the `isInterAccountTransfer` and `transferPairId` fields
 * on matched transactions in-place.
 *
 * Only runs when the user has uploaded 2+ statements.
 * Has no effect on single-statement analysis.
 *
 * @param transactions - All normalised transactions across ALL statements
 */
export function flagInterAccountTransfers(transactions: Transaction[]): Transaction[] {
  const result = transactions.map((t) => ({ ...t }))  // shallow clone

  const debits  = result.filter((t) => t.type === 'debit'  && !t.isInterAccountTransfer)
  const credits = result.filter((t) => t.type === 'credit' && !t.isInterAccountTransfer)

  // Build a set of statement IDs — only meaningful when > 1 statement exists
  const statementIds = new Set(transactions.map((t) => t.statementId))
  if (statementIds.size < 2) return result  // nothing to cross-reference

  for (const debit of debits) {
    // Find a matching credit in a DIFFERENT statement
    const match = credits.find((credit) => {
      if (credit.statementId === debit.statementId) return false  // same statement
      if (credit.isInterAccountTransfer) return false              // already matched

      const dateDiff   = Math.abs(differenceInDays(credit.date, debit.date))
      const amountDiff = Math.abs(credit.amount - debit.amount) / debit.amount

      return dateDiff <= DATE_TOLERANCE_DAYS && amountDiff <= AMOUNT_TOLERANCE_PERCENT
    })

    if (match) {
      // Mark both sides of the transfer
      const debitIdx  = result.findIndex((t) => t.id === debit.id)
      const creditIdx = result.findIndex((t) => t.id === match.id)

      result[debitIdx].isInterAccountTransfer  = true
      result[debitIdx].transferPairId          = match.id

      result[creditIdx].isInterAccountTransfer = true
      result[creditIdx].transferPairId         = debit.id

      // Remove the credit from the candidate pool so it's not matched twice
      credits.splice(credits.indexOf(match), 1)
    }
  }

  return result
}

/**
 * Also flags obvious self-transfers using narration heuristics,
 * even within a single statement. Patterns like:
 * - "TRANSFER TO OWN ACCOUNT"
 * - "NIP/TRANSFER TO SELF"
 * - "INTRA BANK TRANSFER"
 *
 * @param transactions - Transactions from a single statement
 */
export function flagSelfTransfersByNarration(transactions: Transaction[]): Transaction[] {
  const SELF_TRANSFER_PATTERNS = [
    /transfer to own/i,
    /transfer to self/i,
    /intra.?bank transfer/i,
    /own account transfer/i,
    /inter.?account/i,
    /self transfer/i,
  ]

  return transactions.map((t) => {
    const isSelf = SELF_TRANSFER_PATTERNS.some((pattern) =>
      pattern.test(t.narration)
    )
    return isSelf
      ? { ...t, isInterAccountTransfer: true }
      : t
  })
}
