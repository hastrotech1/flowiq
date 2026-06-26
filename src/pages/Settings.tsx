import { useState } from "react";
import { User, Trash2, RefreshCw, Shield, ChevronRight } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import PageWrapper, {
  SectionCard,
  SectionHeader,
} from "@/components/layout/PageWrapper";
import { useAuthStore } from "@/store/auth.store";
import { useAuth } from "@/hooks/useAuth";
import { useStatements } from "@/hooks/useStatements";
import { useTransactionsStore } from "@/store/transactions.store";
import { useStatementsStore } from "@/store/statements.store";
import { categorizeNarrations } from "@/appwrite/functions";
import { updateTransactionCategories } from "@/appwrite/database";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import "./Settings.css";

/**
 * Settings page.
 *
 * Sections:
 * 1. Profile — user name, email, avatar
 * 2. Data — re-run AI categorisation, clear all data
 * 3. Account — sign out, delete account (placeholder)
 * 4. About — app version, links
 */
export default function SettingsPage() {
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const { signOut } = useAuth();
  const { statements } = useStatements();
  const transactions = useTransactionsStore((s) => s.transactions);
  const updateTx = useTransactionsStore((s) => s.updateTransaction);
  const storeUpdate = useStatementsStore((s) => s.updateStatement);

  const [rerunning, setRerunning] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  /** Re-runs AI narration categorisation across ALL transactions */
  const handleRerunCategorization = async () => {
    if (transactions.length === 0) return;
    setRerunning(true);
    try {
      const unique = [
        ...new Set(transactions.map((t) => t.narration).filter(Boolean)),
      ];
      const map = await categorizeNarrations(unique);

      const updates = transactions
        .filter((t) => t.narration && map[t.narration])
        .map((t) => ({ id: t.id, normalizedCategory: map[t.narration] }));

      await updateTransactionCategories(updates);

      // Update store
      updates.forEach(({ id, normalizedCategory }) =>
        updateTx(id, { normalizedCategory }),
      );

      // Mark all statements as categorized
      statements.forEach((s) => storeUpdate(s.id, { isCategorized: true }));

      toast.success(`Re-categorised ${updates.length} transactions.`);
    } catch {
      toast.error("Categorisation failed. Please try again.");
    } finally {
      setRerunning(false);
    }
  };

  return (
    <AppLayout title="Settings">
      <PageWrapper>
        {/* ── Profile ── */}
        <SectionCard>
          <SectionHeader title="Profile" />
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-green-primary/20 flex items-center justify-center shrink-0">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user?.name}
                  className="w-14 h-14 rounded-full object-cover"
                />
              ) : (
                <User size={24} className="text-green-primary" />
              )}
            </div>
            <div>
              <p className="text-base font-semibold text-gray-900">
                {user?.name ?? "—"}
              </p>
              <p className="text-sm text-data-secondary">
                {user?.email ?? "—"}
              </p>
              <p className="text-xs text-data-secondary mt-1">
                Signed in with Google
              </p>
            </div>
          </div>
        </SectionCard>

        {/* ── Data management ── */}
        <SectionCard noPadding>
          <SectionHeader
            title="Data"
            subtitle="Manage your uploaded statements and analysis"
            className="px-4 pt-4"
          />

          <SettingsRow
            icon={<RefreshCw size={16} />}
            label="Re-run AI Categorisation"
            description={`Re-categorise all ${transactions.length.toLocaleString()} transactions using the latest AI model`}
            action={
              <button
                onClick={handleRerunCategorization}
                disabled={rerunning || transactions.length === 0}
                className="settings-button settings-button--primary"
              >
                {rerunning ? (
                  <RefreshCw size={12} className="animate-spin" />
                ) : null}
                {rerunning ? "Running…" : "Run"}
              </button>
            }
          />

          <SettingsRow
            icon={<Trash2 size={16} />}
            label="Clear All Data"
            description="Delete all statements and transactions. This cannot be undone."
            danger
            action={
              confirmClear ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="settings-button settings-button--neutral"
                  >
                    Cancel
                  </button>
                  <button
                    className="settings-button settings-button--danger"
                    onClick={() => {
                      // TODO: implement full data wipe in a later polish step
                      toast.info("Data clear coming in the next update.");
                      setConfirmClear(false);
                    }}
                  >
                    Confirm Delete
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmClear(true)}
                  className="settings-button settings-button--danger-ghost"
                >
                  Clear
                </button>
              )
            }
          />
        </SectionCard>

        {/* ── Account ── */}
        <SectionCard noPadding>
          <SectionHeader title="Account" className="px-4 pt-4" />

          <SettingsRow
            icon={<Shield size={16} />}
            label="Privacy & Security"
            description="Your data is stored securely in Appwrite and never sold."
            action={<ChevronRight size={16} className="text-data-secondary" />}
          />

          <SettingsRow
            icon={<User size={16} />}
            label="Sign Out"
            description="Sign out of your FlowIQ account"
            action={
              <button
                onClick={signOut}
                className="settings-button settings-button--neutral"
              >
                Sign Out
              </button>
            }
          />
        </SectionCard>

        {/* ── About ── */}
        <SectionCard>
          <SectionHeader title="About" />
          <div className="flex flex-col gap-1.5 text-sm text-data-secondary">
            <p>FlowIQ · Version 1.0.0</p>
            <p>Built with React, Appwrite, and Anthropic Claude</p>
            <p className="text-xs mt-1 text-data-secondary/60">
              Your money, finally making sense.
            </p>
          </div>
        </SectionCard>
      </PageWrapper>
    </AppLayout>
  );
}

// ── Settings row ───────────────────────────────────────────

interface SettingsRowProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  action?: React.ReactNode;
  danger?: boolean;
}

function SettingsRow({
  icon,
  label,
  description,
  action,
  danger,
}: SettingsRowProps) {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5 border-b border-surface-border last:border-0">
      <span
        className={cn(
          "shrink-0",
          danger ? "text-data-alert" : "text-data-secondary",
        )}
      >
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-medium",
            danger ? "text-data-alert" : "text-gray-800",
          )}
        >
          {label}
        </p>
        <p className="text-xs text-data-secondary mt-0.5 leading-relaxed">
          {description}
        </p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
