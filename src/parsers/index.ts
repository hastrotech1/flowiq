import { parseStatementFile, buildRawRowsFromGrid, type GenericParseResult } from './generic'
import { normalizeTransactions } from './normalizer'
import { flagInterAccountTransfers, flagSelfTransfersByNarration } from './deduplicator'
import type { Transaction, ColumnMapping } from '@/types'

export type { GenericParseResult }
export { parseStatementFile }

// ════════════════════════════════════════════════════════════
// PIPELINE RESULT TYPE
// ════════════════════════════════════════════════════════════

export interface PipelineResult {
  /** Fully normalised, transfer-flagged transactions */
  transactions:  Transaction[]
  detectedBank:  string | null
  /** True when auto-detection succeeded — no user input needed */
  autoDetected:  boolean
  /**
   * True when the parser could not confidently detect columns.
   * The UI must show ColumnMapperUI before proceeding.
   */
  needsMapping:  boolean
  /** Raw headers for the ColumnMapperUI dropdown options */
  rawHeaders:    string[]
  /** First N rows preview for the ColumnMapperUI table */
  rawGrid:       string[][]
  /** The mapping used (auto-detected or user-confirmed) */
  columnMapping: ColumnMapping
}

// ════════════════════════════════════════════════════════════
// SINGLE-FILE PIPELINE
// Parse → Normalize → Flag self-transfers
// ════════════════════════════════════════════════════════════

/**
 * Runs the full parse pipeline on a single uploaded file.
 *
 * Flow:
 *   1. parseStatementFile()   → raw rows + column mapping
 *   2. normalizeTransactions() → typed Transaction[]
 *   3. flagSelfTransfersByNarration() → mark obvious own-account transfers
 *
 * If `needsMapping` is true, the caller must show the ColumnMapperUI
 * and then call runNormalizationFromMapping() once the user confirms.
 *
 * Cross-statement deduplication (flagInterAccountTransfers) is a
 * separate step — call runDeduplication() after all statements are loaded.
 *
 * @param file        - Uploaded File object (PDF / XLSX / XLS / CSV)
 * @param statementId - Appwrite statement document ID (pre-created)
 * @param userId      - Appwrite user $id
 */
export async function runParsePipeline(
  file:        File,
  statementId: string,
  userId:      string,
): Promise<PipelineResult> {
  // ── Step 1: parse raw rows ─────────────────────────────
  const parsed: GenericParseResult = await parseStatementFile(file)

  if (parsed.needsMapping) {
    // Return early — ColumnMapperUI must collect user confirmation
    // before normalisation can run. Resume with runNormalizationFromMapping().
    return {
      transactions:  [],
      detectedBank:  parsed.detectedBank,
      autoDetected:  false,
      needsMapping:  true,
      rawHeaders:    parsed.rawHeaders,
      rawGrid:       parsed.rawGrid,
      columnMapping: parsed.columnMapping,
    }
  }

  // ── Step 2: normalise raw rows → Transaction[] ─────────
  let transactions = normalizeTransactions(parsed.rows, statementId, userId)

  // ── Step 3: flag obvious self-transfers by narration ───
  transactions = flagSelfTransfersByNarration(transactions)

  return {
    transactions,
    detectedBank:  parsed.detectedBank,
    autoDetected:  true,
    needsMapping:  false,
    rawHeaders:    parsed.rawHeaders,
    rawGrid:       parsed.rawGrid,
    columnMapping: parsed.columnMapping,
  }
}

// ════════════════════════════════════════════════════════════
// MANUAL MAPPING PIPELINE
// Called after user confirms column mapping in ColumnMapperUI
// ════════════════════════════════════════════════════════════

/**
 * Resumes the pipeline after the user manually confirms column mapping.
 * Skips the parse step (already done) and runs from the stored rawGrid.
 *
 * @param rawGrid     - The 2D string grid returned from the initial parse
 * @param mapping     - User-confirmed ColumnMapping from the ColumnMapperUI
 * @param statementId - Appwrite statement document ID
 * @param userId      - Appwrite user $id
 */
export function runNormalizationFromMapping(
  rawGrid:     string[][],
  mapping:     ColumnMapping,
  statementId: string,
  userId:      string,
): Transaction[] {
  // Rebuild RawTransaction[] from the stored grid using the confirmed mapping
  const rawRows    = buildRawRowsFromGrid(rawGrid, mapping)
  let   txs        = normalizeTransactions(rawRows, statementId, userId)
  txs              = flagSelfTransfersByNarration(txs)
  return txs
}

// ════════════════════════════════════════════════════════════
// CROSS-STATEMENT DEDUPLICATION
// Run once after all statements are loaded
// ════════════════════════════════════════════════════════════

/**
 * Flags inter-account transfers across all of the user's statements.
 *
 * When to call:
 * - After initial load of all transactions from Appwrite
 * - After a new statement is uploaded (pass ALL transactions, not just new ones)
 *
 * Returns a new array — does not mutate the input.
 * Caller should update the Zustand transactions store and sync
 * the changed `isInterAccountTransfer` flags back to Appwrite.
 *
 * @param allTransactions - Full transaction list across ALL statements
 */
export function runDeduplication(allTransactions: Transaction[]): Transaction[] {
  return flagInterAccountTransfers(allTransactions)
}
