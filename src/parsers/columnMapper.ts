import type { ColumnMapping } from '@/types'

// ════════════════════════════════════════════════════════════
// COLUMN MAPPER LOGIC
// Drives the ColumnMapperUI component in src/components/upload/
// ════════════════════════════════════════════════════════════

/**
 * Represents one row in the column mapping form.
 * Each ColumnField maps a required schema field to a user-selected
 * column from their statement file.
 */
export interface ColumnField {
  /** Internal schema key */
  key:         keyof ColumnMapping
  /** Label shown in the mapping UI */
  label:       string
  /** Whether the user must fill this in to proceed */
  required:    boolean
  /** Helper text shown under the dropdown */
  description: string
}

/**
 * All configurable fields in a column mapping, in display order.
 * The UI renders these as dropdown rows, each with the rawHeaders
 * as options.
 */
export const COLUMN_FIELDS: ColumnField[] = [
  {
    key:         'date',
    label:       'Transaction Date',
    required:    true,
    description: 'The column containing the date of each transaction.',
  },
  {
    key:         'narration',
    label:       'Narration / Description',
    required:    true,
    description: 'What the transaction was for (merchant name, transfer reference, etc.).',
  },
  {
    key:         'debitCol',
    label:       'Debit Column (Money Out)',
    required:    false,
    description: 'If your bank uses separate Debit and Credit columns, select the Debit one here.',
  },
  {
    key:         'creditCol',
    label:       'Credit Column (Money In)',
    required:    false,
    description: 'If your bank uses separate Debit and Credit columns, select the Credit one here.',
  },
  {
    key:         'amount',
    label:       'Amount Column (single column)',
    required:    false,
    description: 'If all amounts are in one column (positive = credit, negative = debit), select it here.',
  },
  {
    key:         'type',
    label:       'Type / Direction Column',
    required:    false,
    description: 'The column that says "Dr", "Cr", "Debit", "Credit", etc. Only needed with a single amount column.',
  },
  {
    key:         'balance',
    label:       'Balance Column (optional)',
    required:    false,
    description: 'Running account balance after each transaction. Leave blank if not available.',
  },
]

/**
 * Validates a user-submitted column mapping before running normalization.
 * Returns an array of error strings (empty if valid).
 *
 * Rules:
 * - date and narration are always required
 * - Either (debitCol + creditCol) OR (amount) must be filled in
 * - If amount is set without debitCol/creditCol, type should also be set
 *   (though we'll attempt to infer it if missing)
 *
 * @param mapping   - The mapping as filled in by the user
 * @param headers   - Available headers (for validating selections exist)
 */
export function validateColumnMapping(
  mapping: ColumnMapping,
  headers: string[],
): string[] {
  const errors: string[] = []
  const headerSet = new Set(headers.map((h) => h.toLowerCase().trim()))

  /** Checks that a selected column name actually exists in the file */
  const headerExists = (col: string | null) =>
    !col || headerSet.has(col.toLowerCase().trim())

  if (!mapping.date?.trim()) {
    errors.push('Transaction Date column is required.')
  } else if (!headerExists(mapping.date)) {
    errors.push(`Date column "${mapping.date}" was not found in your file.`)
  }

  if (!mapping.narration?.trim()) {
    errors.push('Narration / Description column is required.')
  } else if (!headerExists(mapping.narration)) {
    errors.push(`Narration column "${mapping.narration}" was not found in your file.`)
  }

  const hasSplitCols = mapping.debitCol && mapping.creditCol
  const hasSingleCol = mapping.amount

  if (!hasSplitCols && !hasSingleCol) {
    errors.push(
      'You must select either (Debit + Credit columns) or a single Amount column.'
    )
  }

  if (hasSplitCols) {
    if (!headerExists(mapping.debitCol)) {
      errors.push(`Debit column "${mapping.debitCol}" was not found in your file.`)
    }
    if (!headerExists(mapping.creditCol)) {
      errors.push(`Credit column "${mapping.creditCol}" was not found in your file.`)
    }
  }

  if (hasSingleCol && !headerExists(mapping.amount)) {
    errors.push(`Amount column "${mapping.amount}" was not found in your file.`)
  }

  return errors
}

/**
 * Produces a human-readable summary of the mapping for a confirmation step.
 * Displayed to the user before they click "Confirm and Import".
 *
 * @param mapping - Confirmed ColumnMapping
 */
export function describeMappingSummary(mapping: ColumnMapping): string[] {
  const lines: string[] = []

  lines.push(`Date: "${mapping.date}"`)
  lines.push(`Narration: "${mapping.narration}"`)

  if (mapping.debitCol && mapping.creditCol) {
    lines.push(`Money Out (Debit): "${mapping.debitCol}"`)
    lines.push(`Money In (Credit): "${mapping.creditCol}"`)
  } else if (mapping.amount) {
    lines.push(`Amount: "${mapping.amount}"`)
    if (mapping.type) lines.push(`Type/Direction: "${mapping.type}"`)
  }

  if (mapping.balance) {
    lines.push(`Balance: "${mapping.balance}"`)
  } else {
    lines.push('Balance: not available in this file')
  }

  return lines
}

/**
 * Creates a blank ColumnMapping pre-filled with best-guess values
 * from the heuristic detection pass. The UI shows these as defaults
 * so the user only needs to correct wrong guesses, not start from scratch.
 *
 * @param partial - The best-guess mapping from the heuristic detector
 */
export function createMappingDraft(partial: Partial<ColumnMapping>): ColumnMapping {
  return {
    date:      partial.date      ?? '',
    narration: partial.narration ?? '',
    amount:    partial.amount    ?? null,
    type:      partial.type      ?? null,
    debitCol:  partial.debitCol  ?? null,
    creditCol: partial.creditCol ?? null,
    balance:   partial.balance   ?? null,
  }
}
