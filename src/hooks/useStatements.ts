import { useCallback } from 'react'
import { useStatementsStore } from '@/store/statements.store'
import { useTransactionsStore } from '@/store/transactions.store'
import { useAuthStore } from '@/store/auth.store'
import {
  createStatement,
  fetchStatements,
  updateStatement as dbUpdateStatement,
  deleteStatement as dbDeleteStatement,
  saveTransactions,
  fetchTransactions,
  deleteStatementTransactions,
  updateTransactionCategories,
} from '@/appwrite/database'
import { uploadStatementFile, deleteStatementFile } from '@/appwrite/storage'
import { runParsePipeline, runNormalizationFromMapping, runDeduplication } from '@/parsers'
import { categorizeNarrations } from '@/appwrite/functions'
import type { ColumnMapping, Statement } from '@/types'

/**
 * Hook that orchestrates the full statement lifecycle:
 * load → upload → parse → normalize → save → categorize → delete.
 *
 * All Appwrite calls go through this hook.
 * Components call these functions; stores are updated as side-effects.
 */
export function useStatements() {
  const user               = useAuthStore((s) => s.user)
  const { statements, isLoading, error,
          setStatements, addStatement,
          updateStatement: storeUpdate,
          removeStatement, setLoading, setError } = useStatementsStore()
  const { setTransactions, addTransactions,
          removeByStatement }                                                 = useTransactionsStore()

  // ── Load all statements + transactions for current user ──────
  /**
   * Fetches all statements and their transactions from Appwrite on login.
   * Runs deduplication after loading to flag inter-account transfers.
   * Called once from the Dashboard or a top-level data loader.
   */
  const loadAll = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const [stmts, txs] = await Promise.all([
        fetchStatements(user.id),
        fetchTransactions(user.id),
      ])
      setStatements(stmts)
      // Run deduplication across all loaded transactions
      const deduped = runDeduplication(txs)
      setTransactions(deduped)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [user, setStatements, setTransactions, setLoading, setError])

  // ── Upload + parse pipeline (auto-detected format) ───────────
  /**
   * Full upload pipeline for auto-detected bank formats.
   * Steps: validate → upload file → create statement record →
   *        parse → normalize → save transactions → categorize (AI).
   *
   * @param file      - The uploaded File object
   * @param bankName  - User-provided label e.g. "GTBank Savings"
   * @param colorTag  - Hex color string chosen by user
   * @returns { needsMapping, rawHeaders, rawGrid, columnMapping, tempStatementId }
   *          If needsMapping=true, caller must show ColumnMapperUI then call
   *          completeWithMapping() to finish.
   */
  const uploadAndParse = useCallback(async (
    file:      File,
    bankName:  string,
    colorTag:  string,
  ) => {
    if (!user) throw new Error('Not authenticated')
    setLoading(true)
    setError(null)

    try {
      // 1. Upload raw file to Appwrite Storage
      const uploaded = await uploadStatementFile(file)

      // 2. Create stub statement record in DB (gets a real ID)
      const stmt = await createStatement({
        userId:           user.id,
        bankName,
        fileId:           uploaded.$id,
        fileName:         file.name,
        colorTag,
        uploadedAt:       new Date().toISOString(),
        periodStart:      null,
        periodEnd:        null,
        transactionCount: 0,
        isCategorized:    false,
      })

      // 3. Run parse pipeline
      const result = await runParsePipeline(file, stmt.id, user.id)

      if (result.needsMapping) {
        // Parser couldn't auto-detect — caller must show ColumnMapperUI
        return {
          needsMapping:    true as const,
          rawHeaders:      result.rawHeaders,
          rawGrid:         result.rawGrid,
          columnMapping:   result.columnMapping,
          tempStatementId: stmt.id,
          tempFileId:      uploaded.$id,
          detectedBank:    result.detectedBank,
        }
      }

      // 4. Save normalized transactions
      await _finalize(stmt, result.transactions, result.detectedBank)
      return { needsMapping: false as const }

    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
      throw e
    } finally {
      setLoading(false)
    }
  }, [user, setLoading, setError])

  // ── Complete upload after manual column mapping ───────────────
  /**
   * Resumes the upload pipeline after the user confirms column mapping
   * in the ColumnMapperUI. Normalizes using the confirmed mapping,
   * then saves and categorizes transactions.
   *
   * @param rawGrid         - Raw 2D grid from the initial parse
   * @param mapping         - User-confirmed ColumnMapping
   * @param statementId     - The stub statement ID from uploadAndParse
   */
  const completeWithMapping = useCallback(async (
    rawGrid:     string[][],
    mapping:     ColumnMapping,
    statementId: string,
  ) => {
    if (!user) throw new Error('Not authenticated')
    setLoading(true)
    try {
      const txs  = runNormalizationFromMapping(rawGrid, mapping, statementId, user.id)
      const stmt = useStatementsStore.getState().statements.find((s) => s.id === statementId)
      if (!stmt) throw new Error('Statement not found')
      await _finalize(stmt, txs, null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed')
      throw e
    } finally {
      setLoading(false)
    }
  }, [user, setLoading, setError])

  // ── Shared finalization: save txs + update statement + categorize ──
  /**
   * Saves transactions to Appwrite, updates the statement record
   * with counts and date range, runs AI categorization, then
   * re-runs deduplication across all transactions.
   */
  const _finalize = async (
    stmt:         Statement,
    txs:          Awaited<ReturnType<typeof runNormalizationFromMapping>>,
    _detectedBank: string | null,
  ) => {
    if (txs.length === 0) throw new Error('No transactions found in this file.')

    // Compute period from transactions
    const dates      = txs.map((t) => t.date.getTime())
    const periodStart = new Date(Math.min(...dates)).toISOString()
    const periodEnd   = new Date(Math.max(...dates)).toISOString()

    // Save transactions to Appwrite
    await saveTransactions(txs.map(({ id: _id, ...rest }) => rest))

    // Update statement with final counts
    const updated = await dbUpdateStatement(stmt.id, {
      transactionCount: txs.length,
    })

    // Fetch back with real IDs (saveTransactions generates them server-side)
    const savedTxs = await fetchTransactions(user!.id, [stmt.id])

    // Add to stores
    storeUpdate(stmt.id, { ...updated, periodStart, periodEnd })
    addStatement({ ...stmt, ...updated, periodStart, periodEnd })
    addTransactions(savedTxs)

    // Re-run deduplication across everything
    const allTxs   = useTransactionsStore.getState().transactions
    const deduped  = runDeduplication(allTxs)
    setTransactions(deduped)

    // AI categorization (non-blocking — runs in background)
    _runCategorization(stmt.id, savedTxs)
  }

  // ── AI categorization (background) ───────────────────────────
  /**
   * Sends unique narrations to the AI for clustering into categories.
   * Runs after transactions are saved — does not block the upload flow.
   * Updates transaction records in Appwrite and in the store when done.
   */
  const _runCategorization = async (
    statementId: string,
    txs: Awaited<ReturnType<typeof fetchTransactions>>,
  ) => {
    try {
      // Extract unique narrations (skip blanks)
      const uniqueNarrations = [...new Set(
        txs.map((t) => t.narration).filter(Boolean)
      )]
      if (uniqueNarrations.length === 0) return

      // Call AI proxy
      const categoryMap = await categorizeNarrations(uniqueNarrations)

      // Build update list
      const updates = txs
        .filter((t) => t.narration && categoryMap[t.narration])
        .map((t) => ({ id: t.id, normalizedCategory: categoryMap[t.narration] }))

      if (updates.length === 0) return

      // Persist to Appwrite
      await updateTransactionCategories(updates)

      // Update statement flag
      await dbUpdateStatement(statementId, { isCategorized: true })
      storeUpdate(statementId, { isCategorized: true })

      // Update store
      const txStore = useTransactionsStore.getState()
      updates.forEach(({ id, normalizedCategory }) => {
        txStore.updateTransaction(id, { normalizedCategory })
      })
    } catch {
      // Categorization failure is non-fatal — user can retry from Settings
    }
  }

  // ── Update statement label / color ───────────────────────────
  /**
   * Updates the display name or color tag on an existing statement.
   * Persists to Appwrite and updates the store immediately (optimistic).
   */
  const editStatement = useCallback(async (
    id:      string,
    updates: Partial<Pick<Statement, 'bankName' | 'colorTag'>>,
  ) => {
    storeUpdate(id, updates)   // optimistic update
    try {
      await dbUpdateStatement(id, updates)
    } catch (e) {
      // Rollback on failure by re-fetching
      await loadAll()
      throw e
    }
  }, [storeUpdate, loadAll])

  // ── Delete statement + all its transactions ───────────────────
  /**
   * Deletes a statement and all its associated transactions from
   * Appwrite Storage, the DB, and the Zustand stores.
   */
  const deleteStatement = useCallback(async (stmt: Statement) => {
    // Remove from store immediately (optimistic)
    removeStatement(stmt.id)
    removeByStatement(stmt.id)

    try {
      await Promise.all([
        deleteStatementTransactions(stmt.id),
        dbDeleteStatement(stmt.id),
        deleteStatementFile(stmt.fileId),
      ])
    } catch (e) {
      // Rollback — reload everything
      await loadAll()
      throw e
    }
  }, [removeStatement, removeByStatement, loadAll])

  return {
    statements,
    isLoading,
    error,
    loadAll,
    uploadAndParse,
    completeWithMapping,
    editStatement,
    deleteStatement,
  }
}
