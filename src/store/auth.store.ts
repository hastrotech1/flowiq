import { create } from 'zustand'
import type { AppUser } from '@/types'

/**
 * Global auth state slice.
 * Consumed by useAuth hook and ProtectedRoute component.
 * Never access Appwrite directly from here — go through
 * src/appwrite/auth.ts then call the setters here.
 */
interface AuthState {
  user:        AppUser | null
  isLoading:   boolean
  isChecked:   boolean   // true once the initial session check has run

  setUser:     (user: AppUser | null) => void
  setLoading:  (loading: boolean) => void
  setChecked:  (checked: boolean) => void
  reset:       () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user:       null,
  isLoading:  true,   // start true — we don't know session state yet
  isChecked:  false,

  /** Called after successful OAuth redirect or session restore */
  setUser: (user) => set({ user }),

  /** Toggle loading spinner on auth operations */
  setLoading: (isLoading) => set({ isLoading }),

  /** Marks that the initial getCurrentUser() check has completed */
  setChecked: (isChecked) => set({ isChecked }),

  /** Clears all auth state on sign out */
  reset: () => set({ user: null, isLoading: false, isChecked: true }),
}))
