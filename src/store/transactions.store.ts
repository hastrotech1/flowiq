import { create } from 'zustand'
import type { Transaction } from '@/types'

/**
 * Global transactions state slice.
 * Holds the full normalised transaction list in memory.
 * All filtering/aggregation runs client-side against this array —
 * we never re-fetch from Appwrite for filter changes.
 */
interface TransactionsState {
  transactions: Transaction[]
  isLoading:    boolean
  error:        string | null

  setTransactions:    (txs: Transaction[]) => void
  addTransactions:    (txs: Transaction[]) => void
  updateTransaction:  (id: string, updates: Partial<Transaction>) => void
  removeByStatement:  (statementId: string) => void
  setLoading:         (loading: boolean) => void
  setError:           (error: string | null) => void
  reset:              () => void
}

export const useTransactionsStore = create<TransactionsState>((set) => ({
  transactions: [],
  isLoading:    false,
  error:        null,

  /** Replaces the full transaction list (on initial load) */
  setTransactions: (transactions) => set({ transactions }),

  /** Appends new transactions without duplicating existing ones */
  addTransactions: (newTxs) =>
    set((state) => {
      const existingIds = new Set(state.transactions.map((t) => t.id))
      const unique      = newTxs.filter((t) => !existingIds.has(t.id))
      return { transactions: [...state.transactions, ...unique] }
    }),

  /** Merges partial updates into a single transaction */
  updateTransaction: (id, updates) =>
    set((state) => ({
      transactions: state.transactions.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    })),

  /** Removes all transactions belonging to a deleted statement */
  removeByStatement: (statementId) =>
    set((state) => ({
      transactions: state.transactions.filter(
        (t) => t.statementId !== statementId
      ),
    })),

  setLoading: (isLoading) => set({ isLoading }),
  setError:   (error) => set({ error }),
  reset:      () => set({ transactions: [], error: null }),
}))
