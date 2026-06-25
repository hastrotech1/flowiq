import { create } from 'zustand'
import type { Statement } from '@/types'

/**
 * Global statements state slice.
 * Holds all uploaded statement records for the current user.
 * The `activeIds` set controls which statements are included
 * in the current analysis view (user can toggle on/off).
 */
interface StatementsState {
  statements:   Statement[]
  activeIds:    Set<string>   // statement IDs currently included in analysis
  isLoading:    boolean
  error:        string | null

  setStatements:    (statements: Statement[]) => void
  addStatement:     (statement: Statement) => void
  updateStatement:  (id: string, updates: Partial<Statement>) => void
  removeStatement:  (id: string) => void
  toggleActive:     (id: string) => void
  setAllActive:     (ids: string[]) => void
  setLoading:       (loading: boolean) => void
  setError:         (error: string | null) => void
  reset:            () => void
}

export const useStatementsStore = create<StatementsState>((set) => ({
  statements:  [],
  activeIds:   new Set(),
  isLoading:   false,
  error:       null,

  /** Replaces the full statement list and activates all by default */
  setStatements: (statements) =>
    set({
      statements,
      activeIds: new Set(statements.map((s) => s.id)),
    }),

  /** Appends a newly uploaded statement and auto-activates it */
  addStatement: (statement) =>
    set((state) => ({
      statements: [statement, ...state.statements],
      activeIds:  new Set([...state.activeIds, statement.id]),
    })),

  /** Merges partial updates into an existing statement record */
  updateStatement: (id, updates) =>
    set((state) => ({
      statements: state.statements.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    })),

  /** Removes a statement and deactivates it */
  removeStatement: (id) =>
    set((state) => {
      const activeIds = new Set(state.activeIds)
      activeIds.delete(id)
      return {
        statements: state.statements.filter((s) => s.id !== id),
        activeIds,
      }
    }),

  /** Toggles a statement in/out of the active analysis set */
  toggleActive: (id) =>
    set((state) => {
      const activeIds = new Set(state.activeIds)
      activeIds.has(id) ? activeIds.delete(id) : activeIds.add(id)
      return { activeIds }
    }),

  /** Replaces the active set entirely (e.g. "select all" / "deselect all") */
  setAllActive: (ids) => set({ activeIds: new Set(ids) }),

  setLoading: (isLoading) => set({ isLoading }),
  setError:   (error) => set({ error }),
  reset:      () => set({ statements: [], activeIds: new Set(), error: null }),
}))
