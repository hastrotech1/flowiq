import { useCallback } from "react";
import { useStatementsStore } from "@/store/statements.store";
import { useTransactionsStore } from "@/store/transactions.store";
import { useAuthStore } from "@/store/auth.store";
import {
  loadStatementsSnapshot,
  createStatementDraft,
  completeStatementImport,
  updateStatementDisplay,
  deleteStatementCascade,
  markStatementImportFailed,
} from "@/services/statements.service";
import { runParsePipeline, runNormalizationFromMapping } from "@/parsers";
import type { ColumnMapping, Statement } from "@/types";

/**
 * Hook that orchestrates the full statement lifecycle:
 * load → upload → parse → normalize → save → categorize → delete.
 *
 * All Appwrite calls go through this hook.
 * Components call these functions; stores are updated as side-effects.
 */
export function useStatements() {
  const user = useAuthStore((s) => s.user);
  const { statements, isLoading, error, setStatements, setLoading, setError } =
    useStatementsStore();
  const { setTransactions } = useTransactionsStore();

  const refreshStores = useCallback(
    async (userId: string) => {
      const snapshot = await loadStatementsSnapshot(userId);
      setStatements(snapshot.statements);
      setTransactions(snapshot.transactions);
    },
    [setStatements, setTransactions],
  );

  // ── Load all statements + transactions for current user ──────
  /**
   * Fetches all statements and their transactions from Appwrite on login.
   * Runs deduplication after loading to flag inter-account transfers.
   * Called once from the Dashboard or a top-level data loader.
   */
  const loadAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      await refreshStores(user.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [user, setLoading, setError, refreshStores]);

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
  const uploadAndParse = useCallback(
    async (file: File, bankName: string, colorTag: string) => {
      if (!user) throw new Error("Not authenticated");
      setLoading(true);
      setError(null);

      let draft: Awaited<ReturnType<typeof createStatementDraft>> | null = null;

      try {
        draft = await createStatementDraft(
          file,
          user.id,
          bankName,
          colorTag,
        );
        const statement = draft.statement;
        setStatements([
          statement,
          ...statements.filter((s) => s.id !== statement.id),
        ]);

        const result = await runParsePipeline(
          file,
          statement.id,
          user.id,
        );

        if (result.needsMapping) {
          return {
            needsMapping: true as const,
            rawHeaders: result.rawHeaders,
            rawGrid: result.rawGrid,
            columnMapping: result.columnMapping,
            tempStatementId: statement.id,
            tempFileId: draft.uploadedFileId,
            detectedBank: result.detectedBank,
          };
        }

        await completeStatementImport(
          user.id,
          statement,
          result.transactions,
        );
        await refreshStores(user.id);
        return { needsMapping: false as const };
      } catch (e) {
        if (draft) await markStatementImportFailed(draft.statement.id, e);
        await refreshStores(user.id);
        setError(e instanceof Error ? e.message : "Upload failed");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [user, statements, setStatements, setLoading, setError, refreshStores],
  );

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
  const completeWithMapping = useCallback(
    async (
      rawGrid: string[][],
      mapping: ColumnMapping,
      statementId: string,
    ) => {
      if (!user) throw new Error("Not authenticated");
      setLoading(true);
      try {
        const stmt = useStatementsStore
          .getState()
          .statements.find((s) => s.id === statementId);
        if (!stmt) throw new Error("Statement not found");
        const txs = runNormalizationFromMapping(
          rawGrid,
          mapping,
          statementId,
          user.id,
        );
        await completeStatementImport(user.id, stmt, txs);
        await refreshStores(user.id);
      } catch (e) {
        await markStatementImportFailed(statementId, e);
        await refreshStores(user.id);
        setError(e instanceof Error ? e.message : "Import failed");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [user, setLoading, setError, refreshStores],
  );

  // ── Update statement label / color ───────────────────────────
  /**
   * Updates the display name or color tag on an existing statement.
   * Persists to Appwrite and updates the store immediately (optimistic).
   */
  const editStatement = useCallback(
    async (
      id: string,
      updates: Partial<Pick<Statement, "bankName" | "colorTag">>,
    ) => {
      try {
        await updateStatementDisplay(id, updates);
      } catch (e) {
        await loadAll();
        throw e;
      }
    },
    [loadAll],
  );

  // ── Delete statement + all its transactions ───────────────────
  /**
   * Deletes a statement and all its associated transactions from
   * Appwrite Storage, the DB, and the Zustand stores.
   */
  const deleteStatement = useCallback(
    async (stmt: Statement) => {
      try {
        await deleteStatementCascade(stmt);
      } catch (e) {
        await loadAll();
        throw e;
      }
    },
    [loadAll],
  );

  return {
    statements,
    isLoading,
    error,
    loadAll,
    uploadAndParse,
    completeWithMapping,
    editStatement,
    deleteStatement,
  };
}
