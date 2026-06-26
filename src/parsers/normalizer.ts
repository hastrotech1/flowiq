import { parse, isValid } from 'date-fns'
import type { RawTransaction, Transaction } from '@/types'
import { generateId } from '@/lib/utils'

// ════════════════════════════════════════════════════════════
// DATE FORMATS
// Ordered by frequency — most common Nigerian bank formats first
// ════════════════════════════════════════════════════════════

const DATE_FORMATS = [
  'dd/MM/yyyy',
  'dd-MM-yyyy',
  'MM/dd/yyyy',
  'yyyy-MM-dd',
  'dd MMM yyyy',
  'dd-MMM-yyyy',
  'MMM dd, yyyy',
  'dd/MM/yyyy HH:mm:ss',
  'dd-MM-yyyy HH:mm:ss',
  'yyyy-MM-dd HH:mm:ss',
  'dd/MM/yy',
  'MM-dd-yyyy',
  'd/M/yyyy',
]

// ════════════════════════════════════════════════════════════
// NORMALIZER
// ════════════════════════════════════════════════════════════

/**
 * Converts an array of RawTransaction rows (parser output) into
 * fully-typed Transaction objects ready for Appwrite + UI consumption.
 *
 * Handles:
 * - Multi-format date parsing with fallback chain
 * - Amount string cleaning (commas, currency symbols, whitespace)
 * - Dr/Cr type normalisation across all known bank conventions
 * - Empty narration → empty string (formatNarration() handles display)
 * - Balance parsing with null fallback
 * - Invalid row filtering (unparseable date or zero amount)
 *
 * @param rows        - RawTransaction[] from the generic parser
 * @param statementId - Appwrite statement document ID
 * @param userId      - Appwrite user $id
 */
export function normalizeTransactions(
  rows:        RawTransaction[],
  statementId: string,
  userId:      string,
): Transaction[] {
  const results: Transaction[] = []

  for (const row of rows) {
    const date = parseDate(row.date)
    if (!date) continue   // skip rows with unparseable dates

    const amount = parseAmount(row.amount)
    if (amount === null || amount <= 0) continue  // skip zero/invalid amounts

    const type = resolveType(row.type)
    if (!type) continue   // skip rows we can't determine direction for

    results.push({
      id:                    generateId(),
      statementId,
      userId,
      date,
      amount,
      type,
      narration:             (row.narration ?? '').trim(),
      normalizedCategory:    null,    // filled in after AI clustering pass
      balance:               parseBalance(row.balance),
      isInterAccountTransfer: false,  // flagged later by deduplicator
      transferPairId:        null,
      createdAt:             new Date().toISOString(),
    })
  }

  // Sort ascending by date — important for balance trend charts
  return results.sort((a, b) => a.date.getTime() - b.date.getTime())
}

// ════════════════════════════════════════════════════════════
// DATE PARSING
// ════════════════════════════════════════════════════════════

/**
 * Tries each DATE_FORMAT in order until one successfully parses the string.
 * Returns null if no format matches — caller should skip that row.
 *
 * @param raw - Date string exactly as it appeared in the bank statement
 */
export function parseDate(raw: string): Date | null {
  if (!raw?.trim()) return null

  // Strip day name prefixes like "Mon, " or "Tuesday "
  const cleaned = raw.trim().replace(/^[a-zA-Z]+,?\s+/, '')

  // Try ISO 8601 natively first (fastest path)
  const native = new Date(cleaned)
  if (isValid(native) && !isNaN(native.getTime())) {
    // Sanity check: year must be between 2000 and current year + 1
    const year = native.getFullYear()
    if (year >= 2000 && year <= new Date().getFullYear() + 1) {
      return native
    }
  }

  // Try each format in the chain
  for (const fmt of DATE_FORMATS) {
    const parsed = parse(cleaned, fmt, new Date())
    if (isValid(parsed)) {
      const year = parsed.getFullYear()
      if (year >= 2000 && year <= new Date().getFullYear() + 1) {
        return parsed
      }
    }
  }

  return null
}

// ════════════════════════════════════════════════════════════
// AMOUNT PARSING
// ════════════════════════════════════════════════════════════

/**
 * Cleans a raw amount string and converts to a positive float.
 * Handles: commas, ₦ symbol, NGN prefix, parentheses for negatives,
 * spaces, and trailing/leading non-numeric characters.
 *
 * @param raw - Amount string from the statement (e.g. "₦1,250.00", "(5,000.00)")
 */
export function parseAmount(raw: string): number | null {
  if (!raw?.trim()) return null

  let cleaned = raw.trim()
    .replace(/₦/g, '')        // Naira symbol
    .replace(/NGN/gi, '')     // currency code
    .replace(/,/g, '')        // thousand separators
    .replace(/\s/g, '')       // whitespace

  // Parentheses mean negative in accounting notation: (1,000.00) → -1000
  const isNegative = cleaned.startsWith('(') && cleaned.endsWith(')')
  if (isNegative) {
    cleaned = cleaned.slice(1, -1)
  }

  // Remove any remaining non-numeric chars except dot and minus
  cleaned = cleaned.replace(/[^0-9.-]/g, '')

  const value = parseFloat(cleaned)
  if (isNaN(value)) return null

  // We always store amounts as positive — direction is in `type`
  return Math.abs(value)
}

// ════════════════════════════════════════════════════════════
// TYPE RESOLUTION
// ════════════════════════════════════════════════════════════

/**
 * Resolves the raw type string from any bank format into 'debit' | 'credit'.
 * Handles all known conventions: Dr/Cr, D/C, Debit/Credit, DEBIT/CREDIT,
 * Out/In, Withdrawal/Deposit, PURCHASE/PAYMENT, etc.
 *
 * @param raw - Type string as it appeared in the bank statement
 */
export function resolveType(raw: string): 'debit' | 'credit' | null {
  const t = raw?.trim().toLowerCase() ?? ''

  // Debit indicators
  if (
    t === 'dr' || t === 'd' || t === 'debit' ||
    t === 'out' || t === 'withdrawal' || t === 'withdraw' ||
    t === 'purchase' || t === 'payment' || t === 'charge' ||
    t === 'money out' || t === 'outflow' || t === 'debit transfer' ||
    t === 'pos debit' || t === 'atm withdrawal'
  ) return 'debit'

  // Credit indicators
  if (
    t === 'cr' || t === 'c' || t === 'credit' ||
    t === 'in' || t === 'deposit' || t === 'inflow' ||
    t === 'reversal' || t === 'refund' || t === 'cashback' ||
    t === 'money in' || t === 'credit transfer' || t === 'received'
  ) return 'credit'

  // Contains-based fallback for compound strings
  if (t.includes('debit') || t.includes(' dr') || t.startsWith('dr')) return 'debit'
  if (t.includes('credit') || t.includes(' cr') || t.startsWith('cr')) return 'credit'

  return null
}

// ════════════════════════════════════════════════════════════
// BALANCE PARSING
// ════════════════════════════════════════════════════════════

/**
 * Parses a balance string, returning null if empty or unparseable.
 * Balance may be negative (overdraft accounts).
 */
function parseBalance(raw: string | null): number | null {
  if (!raw?.trim()) return null

  const cleaned = raw.trim()
    .replace(/₦/g, '')
    .replace(/NGN/gi, '')
    .replace(/,/g, '')
    .replace(/\s/g, '')

  const isNegative = cleaned.startsWith('(') && cleaned.endsWith(')')
  const numeric    = isNegative
    ? cleaned.slice(1, -1)
    : cleaned.replace(/[^0-9.-]/g, '')

  const value = parseFloat(numeric)
  return isNaN(value) ? null : (isNegative ? -Math.abs(value) : value)
}
