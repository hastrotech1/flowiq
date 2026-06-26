import { z } from 'zod'

// ════════════════════════════════════════════════════════════
// CORE DOMAIN TYPES
// ════════════════════════════════════════════════════════════

/**
 * A single financial transaction normalised from any bank format.
 * This is the central data model everything else is built around.
 */
export interface Transaction {
  /** Unique ID — either from Appwrite DB or generated client-side */
  id: string

  /** ID of the Statement this transaction belongs to */
  statementId: string

  /** Appwrite user ID of the owner */
  userId: string

  /** Transaction date parsed from the bank statement */
  date: Date

  /**
   * Transaction amount — always a positive number.
   * Use `type` to determine if it's a debit or credit.
   */
  amount: number

  /** Whether money left (debit) or arrived (credit) */
  type: 'debit' | 'credit'

  /**
   * Raw narration/description string from the bank statement.
   * May be empty — use formatNarration() for display.
   */
  narration: string

  /**
   * AI-assigned category label (e.g. "Airtime", "Food & Dining").
   * Null until the AI clustering pass has run.
   */
  normalizedCategory: string | null

  /**
   * Running account balance after this transaction, if available
   * in the source statement. Not all banks include this.
   */
  balance: number | null

  /**
   * True if this transaction has been identified as a transfer
   * between the user's own accounts (e.g. GTBank → Zenith).
   * These are excluded from total-spend calculations.
   */
  isInterAccountTransfer: boolean

  /**
   * ID of the matching transaction in the other statement,
   * if this is an inter-account transfer.
   */
  transferPairId: string | null

  /** ISO timestamp when this record was created in our DB */
  createdAt: string
}

// ────────────────────────────────────────────────────────────

/**
 * A user-uploaded bank statement file.
 * One statement → many transactions.
 */
export interface Statement {
  /** Appwrite document ID */
  id: string

  /** Appwrite user ID of the owner */
  userId: string

  /** User-provided label, e.g. "GTBank Savings" */
  bankName: string

  /** Appwrite Storage file ID of the raw uploaded file */
  fileId: string

  /** Original filename of the upload */
  fileName: string

  /** Color tag chosen by the user for visual differentiation */
  colorTag: string

  /** ISO date string of the upload */
  uploadedAt: string

  /** ISO date of the earliest transaction in this statement */
  periodStart: string | null

  /** ISO date of the latest transaction in this statement */
  periodEnd: string | null

  /** Total number of transactions parsed from this statement */
  transactionCount: number

  /** Whether AI categorisation has been run on this statement */
  isCategorized: boolean

  /** Import lifecycle state for detecting incomplete uploads */
  importStatus: 'pending' | 'complete' | 'failed'

  /** User-facing failure reason when importStatus is failed */
  failureReason: string | null
}

// ────────────────────────────────────────────────────────────

/**
 * A grouped category produced by AI narration clustering.
 * Each category aggregates multiple matching transactions.
 */
export interface TransactionCategory {
  /** Category display name, e.g. "Airtime & Data" */
  name: string

  /** Hex color for charts/chips */
  color: string

  /** All transaction IDs in this category */
  transactionIds: string[]

  /** Total amount spent across all transactions in this category */
  totalAmount: number

  /** Number of transactions in this category */
  count: number

  /** Average amount per transaction */
  averageAmount: number
}

// ────────────────────────────────────────────────────────────

/**
 * The authenticated Appwrite user, simplified for app usage.
 */
export interface AppUser {
  id:     string
  email:  string
  name:   string
  avatar: string | null
}

// ════════════════════════════════════════════════════════════
// FILTER TYPES
// ════════════════════════════════════════════════════════════

/** All possible date range preset keys */
export type DateFilterPreset =
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'last_3_months'
  | 'last_6_months'
  | 'this_year'
  | 'custom'

/**
 * The active filter state applied to the transaction view.
 * All fields are optional — an empty filter shows all transactions.
 */
export interface TransactionFilters {
  /** Date preset or 'custom' */
  datePreset: DateFilterPreset | null

  /** Custom date range start (only used when datePreset === 'custom') */
  dateFrom: Date | null

  /** Custom date range end (only used when datePreset === 'custom') */
  dateTo: Date | null

  /** Filter to transactions from specific statements only */
  statementIds: string[]

  /** Filter by debit, credit, or both */
  transactionType: 'debit' | 'credit' | 'all'

  /** Narration search string — fuzzy matches against transaction.narration */
  narrationSearch: string

  /** Filter to a specific AI category */
  category: string | null

  /** Exclude inter-account transfers from results */
  excludeTransfers: boolean
}

// ════════════════════════════════════════════════════════════
// ANALYSIS / AGGREGATION TYPES
// ════════════════════════════════════════════════════════════

/**
 * Summary metrics for a given set of transactions.
 * Produced by the aggregation engine in src/analysis/aggregations.ts.
 */
export interface TransactionSummary {
  totalDebits:      number
  totalCredits:     number
  netFlow:          number   // credits - debits
  transactionCount: number
  averageDebitAmount:  number
  averageCreditAmount: number
  largestDebit:     Transaction | null
  largestCredit:    Transaction | null
  smallestDebit:    Transaction | null
}

/**
 * Daily aggregated totals — used for the balance trend chart.
 */
export interface DailyAggregate {
  date:         string   // 'YYYY-MM-DD'
  totalDebits:  number
  totalCredits: number
  netFlow:      number
  count:        number
}

/**
 * Monthly aggregated totals — used for monthly comparison charts.
 */
export interface MonthlyAggregate {
  month:        string   // 'YYYY-MM'
  label:        string   // 'Jan 2024'
  totalDebits:  number
  totalCredits: number
  netFlow:      number
  count:        number
}

/**
 * A detected recurring expense pattern.
 */
export interface RecurringExpense {
  narration:           string
  normalizedCategory:  string | null
  occurrences:         number
  averageAmount:       number
  totalAmount:         number
  /** Approximate interval between occurrences in days */
  intervalDays:        number
  lastSeen:            Date
  transactions:        Transaction[]
}

// ════════════════════════════════════════════════════════════
// PARSER TYPES
// ════════════════════════════════════════════════════════════

/**
 * A raw parsed row before normalisation.
 * Output from any bank-specific or generic parser.
 */
export interface RawTransaction {
  date:        string   // raw string before Date parsing
  amount:      string   // raw string before number parsing
  type:        string   // raw Dr/Cr/Debit/Credit string
  narration:   string
  balance:     string | null
  [key: string]: string | null   // allow extra columns
}

/**
 * Column mapping from user's spreadsheet columns to our schema.
 * Used by the column-mapping UI when auto-detection fails.
 */
export interface ColumnMapping {
  date:      string
  amount:    string | null
  type:      string | null   // null if amount is always positive and type is a separate column
  debitCol:  string | null   // separate debit column (some banks split DR/CR)
  creditCol: string | null   // separate credit column
  narration: string
  balance:   string | null
}

/**
 * Result of attempting to parse an uploaded file.
 */
export interface ParseResult {
  success:      boolean
  rows:         RawTransaction[]
  detectedBank: string | null   // e.g. "GTBank", null if unknown
  columnMapping: ColumnMapping | null
  /** Human-readable error if success === false */
  error:        string | null
}

// ════════════════════════════════════════════════════════════
// ZOD SCHEMAS (runtime validation)
// ════════════════════════════════════════════════════════════

/**
 * Validates environment variables are present at startup.
 * Throws a descriptive error if any required var is missing.
 */
export const EnvSchema = z.object({
  VITE_APPWRITE_ENDPOINT:                   z.string().url(),
  VITE_APPWRITE_PROJECT_ID:                 z.string().min(1),
  VITE_APPWRITE_DATABASE_ID:                z.string().min(1),
  VITE_APPWRITE_STATEMENTS_COLLECTION_ID:   z.string().min(1),
  VITE_APPWRITE_TRANSACTIONS_COLLECTION_ID: z.string().min(1),
  VITE_APPWRITE_STATEMENTS_BUCKET_ID:       z.string().min(1),
  VITE_APPWRITE_AI_PROXY_FUNCTION_ID:       z.string().min(1),
})

/** Validates a raw transaction row has the minimum required fields */
export const RawTransactionSchema = z.object({
  date:      z.string().min(1, 'Date is required'),
  amount:    z.string().min(1, 'Amount is required'),
  type:      z.string(),
  narration: z.string(),
  balance:   z.string().nullable(),
})
