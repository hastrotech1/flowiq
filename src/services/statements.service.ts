import type { Statement, Transaction } from "@/types";
import { runDeduplication } from "@/parsers";
import {
  createStatement,
  fetchStatements,
  updateStatement,
  deleteStatement as dbDeleteStatement,
  saveTransactions,
  fetchTransactions,
  deleteStatementTransactions,
  updateTransactionCategories,
} from "@/appwrite/database";
import { uploadStatementFile, deleteStatementFile } from "@/appwrite/storage";
import { categorizeNarrations } from "@/appwrite/functions";
import { AppError, toAppError } from "@/lib/errors";

export async function loadStatementsSnapshot(userId: string) {
  const [statements, transactions] = await Promise.all([
    fetchStatements(userId),
    fetchTransactions(userId),
  ]);

  return { statements, transactions: runDeduplication(transactions) };
}

export async function createStatementDraft(
  file: File,
  userId: string,
  bankName: string,
  colorTag: string,
) {
  const uploaded = await uploadStatementFile(file);
  const statement = await createStatement({
    userId,
    bankName,
    fileId: uploaded.$id,
    fileName: file.name,
    colorTag,
    uploadedAt: new Date().toISOString(),
    periodStart: null,
    periodEnd: null,
    transactionCount: 0,
    isCategorized: false,
    importStatus: "pending",
    failureReason: null,
  });

  return { uploadedFileId: uploaded.$id, statement };
}

export async function completeStatementImport(
  userId: string,
  statement: Statement,
  transactions: Transaction[],
) {
  if (transactions.length === 0) {
    throw new AppError("No transactions found in this file.", "validation");
  }

  const dates = transactions.map((t) => t.date.getTime());
  const periodStart = new Date(Math.min(...dates)).toISOString();
  const periodEnd = new Date(Math.max(...dates)).toISOString();

  try {
    // saveTransactions returns committed IDs but we re-fetch from DB below
    await saveTransactions(transactions.map(toPersistedTransaction));
    const updated = await updateStatement(statement.id, {
      transactionCount: transactions.length,
      periodStart,
      periodEnd,
      importStatus: "complete",
      failureReason: null,
    });
    const savedTxs = await fetchTransactions(userId, [statement.id]);

    await categorizeImportedTransactions(statement.id, savedTxs);

    return {
      statement: updated,
      savedTransactions: savedTxs,
      periodStart,
      periodEnd,
    };
  } catch (error) {
    await markStatementImportFailed(statement.id, error);
    throw toAppError(error, "storage", "Failed to complete statement import");
  }
}

export async function rollbackStatementImport(statement: Statement) {
  await Promise.allSettled([
    deleteStatementTransactions(statement.id),
    deleteStatementFile(statement.fileId),
    dbDeleteStatement(statement.id),
  ]);
}

export async function markStatementImportFailed(
  statementId: string,
  error: unknown,
) {
  const message =
    error instanceof Error ? error.message : "Import did not complete.";
  await Promise.allSettled([
    deleteStatementTransactions(statementId),
    updateStatement(statementId, {
      importStatus: "failed",
      failureReason: message,
      transactionCount: 0,
    }),
  ]);
}

export async function updateStatementDisplay(
  id: string,
  updates: Partial<Pick<Statement, "bankName" | "colorTag">>,
) {
  return updateStatement(id, updates);
}

export async function deleteStatementCascade(statement: Statement) {
  await Promise.all([
    deleteStatementTransactions(statement.id),
    dbDeleteStatement(statement.id),
    deleteStatementFile(statement.fileId),
  ]);
}

async function categorizeImportedTransactions(
  statementId: string,
  txs: Transaction[],
) {
  const uniqueNarrations = [
    ...new Set(txs.map((t) => t.narration).filter(Boolean)),
  ];
  if (uniqueNarrations.length === 0) return;

  const categoryMap = await categorizeNarrations(uniqueNarrations);
  const updates = txs
    .filter((t) => t.narration && categoryMap[t.narration])
    .map((t) => ({ id: t.id, normalizedCategory: categoryMap[t.narration] }));

  if (updates.length === 0) return;

  await updateTransactionCategories(updates);
  await updateStatement(statementId, { isCategorized: true });
}

function toPersistedTransaction(tx: Transaction): Omit<Transaction, "id"> {
  return {
    statementId: tx.statementId,
    userId: tx.userId,
    date: tx.date,
    amount: tx.amount,
    type: tx.type,
    narration: tx.narration,
    normalizedCategory: tx.normalizedCategory,
    balance: tx.balance,
    isInterAccountTransfer: tx.isInterAccountTransfer,
    transferPairId: tx.transferPairId,
    createdAt: tx.createdAt,
  };
}
