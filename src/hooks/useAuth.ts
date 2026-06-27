import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, signOut as appwriteSignOut } from "@/appwrite/auth";
import { useAuthStore } from "@/store/auth.store";
import { useTransactionsStore } from "@/store/transactions.store";
import { useStatementsStore } from "@/store/statements.store";
import { useFiltersStore } from "@/store/filters.store";
import { ROUTES } from "@/lib/constants";

/**
 * Primary auth hook. Handles:
 * - Initial session check on app mount
 * - Sign-out with full store reset
 * - Exposes current user + loading state to consumers
 *
 * Usage:
 *   const { user, isLoading, signOut } = useAuth()
 */
export function useAuth() {
  const navigate = useNavigate();

  const { user, isLoading, isChecked, setUser, setLoading, setChecked, reset } =
    useAuthStore();

  const resetTransactions = useTransactionsStore((s) => s.reset);
  const resetStatements = useStatementsStore((s) => s.reset);
  const resetFilters = useFiltersStore((s) => s.resetFilters);

  /**
   * Checks Appwrite for an active session on first mount.
   * Runs once — guarded by isChecked so it never re-runs.
   */
  useEffect(() => {
    if (isChecked) return;

    const checkSession = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch {
        // Network error or Appwrite misconfiguration
        setUser(null);
      } finally {
        setLoading(false);
        setChecked(true);
      }
    };

    checkSession();
  }, [isChecked, setUser, setLoading, setChecked]);

  /**
   * Signs out the current user:
   * 1. Calls Appwrite to delete the session cookie
   * 2. Resets all Zustand stores to clear in-memory data
   * 3. Redirects to the auth page
   */
  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await appwriteSignOut();
    } catch {
      // Session may already be expired — still clear local state
    } finally {
      reset();
      resetTransactions();
      resetStatements();
      resetFilters();
      navigate(ROUTES.auth, { replace: true });
    }
  }, [
    reset,
    resetTransactions,
    resetStatements,
    resetFilters,
    navigate,
    setLoading,
  ]);

  return { user, isLoading, isChecked, signOut };
}
