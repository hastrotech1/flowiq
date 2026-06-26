/**
 * Bank format detector.
 * Inspects the header row of a parsed spreadsheet/CSV to identify
 * which Nigerian bank the statement came from, and what column
 * layout to expect. Returns null if the bank is unrecognised.
 */

export type KnownBank =
  | 'GTBank'
  | 'Access'
  | 'Zenith'
  | 'FirstBank'
  | 'UBA'
  | 'Stanbic'
  | 'OPay'
  | 'Kuda'
  | 'Moniepoint'
  | 'Palmpay'
  | 'Unknown'

/**
 * Describes the column layout of a known bank statement format.
 * Fields map to the actual header strings used in that bank's export.
 */
export interface BankFormat {
  bank:       KnownBank
  /** Header string for the transaction date column */
  dateCol:    string
  /**
   * If the bank uses a single amount column with Dr/Cr suffix
   * or a signed number, set `amountCol`. Otherwise null.
   */
  amountCol:  string | null
  /**
   * Some banks use separate Debit and Credit columns.
   * Set both debitCol + creditCol and leave amountCol null.
   */
  debitCol:   string | null
  creditCol:  string | null
  /**
   * Column that indicates direction (Dr/Cr, Debit/Credit, D/C).
   * Only relevant when amountCol is set. Null for split-column layouts.
   */
  typeCol:    string | null
  narrationCol: string
  balanceCol:   string | null
}

/**
 * Fingerprints for each supported bank.
 * `signatures` are distinctive header strings (lowercased) that
 * must ALL be present for the bank to be positively identified.
 */
const BANK_SIGNATURES: Array<{
  bank:       KnownBank
  signatures: string[]
  format:     BankFormat
}> = [
  {
    bank:       'GTBank',
    signatures: ['trans. date', 'debit', 'credit', 'balance', 'transaction details'],
    format: {
      bank:         'GTBank',
      dateCol:      'Trans. Date',
      amountCol:    null,
      debitCol:     'Debit',
      creditCol:    'Credit',
      typeCol:      null,
      narrationCol: 'Transaction Details',
      balanceCol:   'Balance',
    },
  },
  {
    bank:       'Access',
    signatures: ['transaction date', 'debit amount', 'credit amount', 'transaction description'],
    format: {
      bank:         'Access',
      dateCol:      'Transaction Date',
      amountCol:    null,
      debitCol:     'Debit Amount',
      creditCol:    'Credit Amount',
      typeCol:      null,
      narrationCol: 'Transaction Description',
      balanceCol:   'Balance',
    },
  },
  {
    bank:       'Zenith',
    signatures: ['value date', 'debit', 'credit', 'remarks'],
    format: {
      bank:         'Zenith',
      dateCol:      'Value Date',
      amountCol:    null,
      debitCol:     'Debit',
      creditCol:    'Credit',
      typeCol:      null,
      narrationCol: 'Remarks',
      balanceCol:   'Balance',
    },
  },
  {
    bank:       'FirstBank',
    signatures: ['posting date', 'dr/cr', 'amount', 'narration'],
    format: {
      bank:         'FirstBank',
      dateCol:      'Posting Date',
      amountCol:    'Amount',
      debitCol:     null,
      creditCol:    null,
      typeCol:      'Dr/Cr',
      narrationCol: 'Narration',
      balanceCol:   'Balance',
    },
  },
  {
    bank:       'UBA',
    signatures: ['tran date', 'tran type', 'tran amount', 'tran particulars'],
    format: {
      bank:         'UBA',
      dateCol:      'Tran Date',
      amountCol:    'Tran Amount',
      debitCol:     null,
      creditCol:    null,
      typeCol:      'Tran Type',
      narrationCol: 'Tran Particulars',
      balanceCol:   'Running Balance',
    },
  },
  {
    bank:       'Stanbic',
    signatures: ['date', 'debit', 'credit', 'description', 'reference'],
    format: {
      bank:         'Stanbic',
      dateCol:      'Date',
      amountCol:    null,
      debitCol:     'Debit',
      creditCol:    'Credit',
      typeCol:      null,
      narrationCol: 'Description',
      balanceCol:   'Balance',
    },
  },
  {
    bank:       'Kuda',
    signatures: ['date', 'money out', 'money in', 'narration'],
    format: {
      bank:         'Kuda',
      dateCol:      'Date',
      amountCol:    null,
      debitCol:     'Money Out',
      creditCol:    'Money In',
      typeCol:      null,
      narrationCol: 'Narration',
      balanceCol:   'Balance',
    },
  },
  {
    bank:       'Moniepoint',
    signatures: ['transaction time', 'type', 'amount', 'description', 'status'],
    format: {
      bank:         'Moniepoint',
      dateCol:      'Transaction Time',
      amountCol:    'Amount',
      debitCol:     null,
      creditCol:    null,
      typeCol:      'Type',
      narrationCol: 'Description',
      balanceCol:   'Balance Before',
    },
  },
  {
    bank:       'OPay',
    signatures: ['time', 'transaction type', 'amount(ngn)', 'merchant'],
    format: {
      bank:         'OPay',
      dateCol:      'Time',
      amountCol:    'Amount(NGN)',
      debitCol:     null,
      creditCol:    null,
      typeCol:      'Transaction Type',
      narrationCol: 'Merchant',
      balanceCol:   null,
    },
  },
  {
    bank:       'Palmpay',
    signatures: ['date', 'transaction type', 'amount', 'note'],
    format: {
      bank:         'Palmpay',
      dateCol:      'Date',
      amountCol:    'Amount',
      debitCol:     null,
      creditCol:    null,
      typeCol:      'Transaction Type',
      narrationCol: 'Note',
      balanceCol:   'Balance',
    },
  },
]

/**
 * Attempts to identify the bank from a set of column header strings.
 * Matching is case-insensitive and strips extra whitespace.
 *
 * @param headers - Column headers extracted from the first row of the file
 * @returns The matched BankFormat, or null if unrecognised
 */
export function detectBankFormat(headers: string[]): BankFormat | null {
  const normalised = headers.map((h) => h.toLowerCase().trim())
  const scored = BANK_SIGNATURES.map((entry) => {
    const matched = entry.signatures.filter((sig) =>
      normalised.some((h) => h === sig || h.includes(sig)),
    )
    const exactMatches = entry.signatures.filter((sig) =>
      normalised.some((h) => h === sig),
    ).length

    return {
      entry,
      matchedCount: matched.length,
      score: matched.length * 10 + exactMatches,
    }
  })
    .filter(({ matchedCount, entry }) => matchedCount === entry.signatures.length)
    .sort((a, b) => b.score - a.score)

  if (scored.length === 0) return null
  if (scored.length > 1 && scored[0].score === scored[1].score) return null

  return scored[0].entry.format
}

/**
 * Finds the actual header string in a row that best matches a target.
 * Case-insensitive, partial match. Returns the original casing from headers.
 *
 * @param headers - Array of actual header strings from the file
 * @param target  - The header name we're looking for
 */
export function findHeader(headers: string[], target: string): string | null {
  const t = target.toLowerCase().trim()
  return headers.find((h) => h.toLowerCase().trim().includes(t)) ?? null
}
