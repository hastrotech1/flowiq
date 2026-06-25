import { ID, Query } from 'appwrite'
import { databases } from './client'
import { APPWRITE_CONFIG, TRANSACTIONS_PAGE_SIZE } from '@/lib/constants'
import type { Statement, Transaction } from '@/types'

const DB  = APPWRITE_CONFIG.databaseId
const COL = APPWRITE_CONFIG.collections

// ════════════════════════════════════════════════════════════
// STATEMENT OPERATIONS
// ════════════════════════════════════════════════════════════

/**
 * Saves a new statement record to the Appwrite database.
 * Called after a file is uploaded and transactions are parsed.
 *
 * @param data - Statement fields (minus id/createdAt, set by Appwrite)
 * @returns The created Appwrite document
 */
export async function createStatement(
  data: Omit<Statement, 'id'>
): Promise<Statement> {
  const doc = await databases.createDocument(
    DB,
    COL.statements,
    ID.unique(),
    data,
  )
  return mapStatement(doc)
}

/**
 * Fetches all statements belonging to the current user.
 * Ordered by uploadedAt descending (newest first).
 *
 * @param userId - The Appwrite user $id
 */
export async function fetchStatements(userId: string): Promise<Statement[]> {
  const res = await databases.listDocuments(DB, COL.statements, [
    Query.equal('userId', userId),
    Query.orderDesc('uploadedAt'),
    Query.limit(100),
  ])
  return res.documents.map(mapStatement)
}

/**
 * Updates mutable fields on an existing statement.
 * Used for: renaming bank label, changing color tag,
 * updating isCategorized after AI pass runs.
 *
 * @param statementId - Appwrite document ID of the statement
 * @param updates     - Partial statement fields to update
 */
export async function updateStatement(
  statementId: string,
  updates: Partial<Pick<Statement, 'bankName' | 'colorTag' | 'isCategorized' | 'transactionCount'>>
): Promise<Statement> {
  const doc = await databases.updateDocument(DB, COL.statements, statementId, updates)
  return mapStatement(doc)
}

/**
 * Deletes a statement document from the database.
 * Note: also call deleteStatementFile() and deleteStatementTransactions()
 * to fully remove all associated data.
 *
 * @param statementId - Appwrite document ID of the statement
 */
export async function deleteStatement(statementId: string): Promise<void> {
  await databases.deleteDocument(DB, COL.statements, statementId)
}

// ════════════════════════════════════════════════════════════
// TRANSACTION OPERATIONS
// ════════════════════════════════════════════════════════════

/**
 * Batch-saves parsed transactions to Appwrite.
 * Appwrite doesn't have a native batch write, so we chunk into
 * parallel Promise.all calls of 25 at a time to avoid rate limits.
 *
 * @param transactions - Array of transactions to persist
 */
export async function saveTransactions(
  transactions: Omit<Transaction, 'id'>[]
): Promise<void> {
  const CHUNK_SIZE = 25

  for (let i = 0; i < transactions.length; i += CHUNK_SIZE) {
    const chunk = transactions.slice(i, i + CHUNK_SIZE)
    await Promise.all(
      chunk.map((tx) =>
        databases.createDocument(DB, COL.transactions, ID.unique(), {
          ...tx,
          // Dates must be stored as ISO strings in Appwrite
          date:      tx.date instanceof Date ? tx.date.toISOString() : tx.date,
        })
      )
    )
  }
}

/**
 * Fetches all transactions for a user, paginating through results.
 * Appwrite max limit per query is 100; this fetches all pages.
 *
 * @param userId       - The Appwrite user $id
 * @param statementIds - Optional filter to specific statements only
 */
export async function fetchTransactions(
  userId: string,
  statementIds?: string[]
): Promise<Transaction[]> {
  const allTransactions: Transaction[] = []
  let   offset = 0
  let   hasMore = true

  while (hasMore) {
    const queries = [
      Query.equal('userId', userId),
      Query.orderDesc('date'),
      Query.limit(TRANSACTIONS_PAGE_SIZE),
      Query.offset(offset),
    ]

    // Optionally scope to specific statements
    if (statementIds && statementIds.length > 0) {
      queries.push(Query.equal('statementId', statementIds))
    }

    const res = await databases.listDocuments(DB, COL.transactions, queries)
    allTransactions.push(...res.documents.map(mapTransaction))

    offset  += TRANSACTIONS_PAGE_SIZE
    hasMore  = res.documents.length === TRANSACTIONS_PAGE_SIZE
  }

  return allTransactions
}

/**
 * Deletes all transactions belonging to a specific statement.
 * Called when the user removes a statement — cleans up child records.
 *
 * @param statementId - The parent statement's Appwrite ID
 */
export async function deleteStatementTransactions(statementId: string): Promise<void> {
  let hasMore = true

  while (hasMore) {
    const res = await databases.listDocuments(DB, COL.transactions, [
      Query.equal('statementId', statementId),
      Query.limit(100),
    ])

    if (res.documents.length === 0) { hasMore = false; break }

    await Promise.all(
      res.documents.map((doc) =>
        databases.deleteDocument(DB, COL.transactions, doc.$id)
      )
    )

    hasMore = res.documents.length === 100
  }
}

/**
 * Updates the normalizedCategory on a batch of transactions.
 * Called after the AI clustering pass assigns categories.
 *
 * @param updates - Array of { id, normalizedCategory } pairs
 */
export async function updateTransactionCategories(
  updates: { id: string; normalizedCategory: string }[]
): Promise<void> {
  const CHUNK_SIZE = 25
  for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
    const chunk = updates.slice(i, i + CHUNK_SIZE)
    await Promise.all(
      chunk.map(({ id, normalizedCategory }) =>
        databases.updateDocument(DB, COL.transactions, id, { normalizedCategory })
      )
    )
  }
}

// ════════════════════════════════════════════════════════════
// DOCUMENT MAPPERS
// Maps Appwrite document shape → our typed interfaces
// ════════════════════════════════════════════════════════════

/**
 * Maps a raw Appwrite statement document to our Statement type.
 * Appwrite adds $id, $createdAt etc — we extract what we need.
 */
function mapStatement(doc: Record<string, unknown>): Statement {
  return {
    id:               doc.$id as string,
    userId:           doc.userId as string,
    bankName:         doc.bankName as string,
    fileId:           doc.fileId as string,
    fileName:         doc.fileName as string,
    colorTag:         doc.colorTag as string,
    uploadedAt:       doc.uploadedAt as string,
    periodStart:      (doc.periodStart as string) ?? null,
    periodEnd:        (doc.periodEnd as string)   ?? null,
    transactionCount: doc.transactionCount as number,
    isCategorized:    doc.isCategorized as boolean,
  }
}

/**
 * Maps a raw Appwrite transaction document to our Transaction type.
 * Converts date strings back to Date objects.
 */
function mapTransaction(doc: Record<string, unknown>): Transaction {
  return {
    id:                    doc.$id as string,
    statementId:           doc.statementId as string,
    userId:                doc.userId as string,
    date:                  new Date(doc.date as string),
    amount:                doc.amount as number,
    type:                  doc.type as 'debit' | 'credit',
    narration:             doc.narration as string,
    normalizedCategory:    (doc.normalizedCategory as string)  ?? null,
    balance:               (doc.balance as number)             ?? null,
    isInterAccountTransfer: doc.isInterAccountTransfer as boolean,
    transferPairId:         (doc.transferPairId as string)     ?? null,
    createdAt:              doc.$createdAt as string,
  }
}
