import { useState } from "react";
import { FileText, Trash2, Edit2, Check, X, RefreshCw } from "lucide-react";
import { cn, formatDate, formatNaira } from "@/lib/utils";
import { STATEMENT_COLORS } from "@/lib/constants";
import Badge from "@/components/ui/Badge";
import { useTransactionsStore } from "@/store/transactions.store";
import { useStatementsStore } from "@/store/statements.store";
import type { Statement } from "@/types";

// ════════════════════════════════════════════════════════════
// STATEMENT CARD — one uploaded statement shown in the list
// ════════════════════════════════════════════════════════════

interface StatementCardProps {
  statement: Statement;
  onEdit: (id: string, bankName: string, colorTag: string) => Promise<void>;
  onDelete: (statement: Statement) => Promise<void>;
  isDeleting?: boolean;
}

/**
 * Card displaying a single uploaded statement.
 * Shows: color dot, bank label, file name, transaction count,
 *        date range, total debits, active toggle, edit/delete actions.
 * Inline edit mode allows renaming the bank label and changing color.
 */
export default function StatementCard({
  statement,
  onEdit,
  onDelete,
  isDeleting,
}: StatementCardProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(statement.bankName);
  const [editColor, setEditColor] = useState(statement.colorTag);
  const [saving, setSaving] = useState(false);

  const isActive = useStatementsStore((s) => s.activeIds.has(statement.id));
  const toggleActive = useStatementsStore((s) => s.toggleActive);

  // Compute total debits for this statement from the store
  const totalDebits = useTransactionsStore((s) =>
    s.transactions
      .filter((t) => t.statementId === statement.id && t.type === "debit")
      .reduce((sum, t) => sum + t.amount, 0),
  );

  const handleSaveEdit = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      await onEdit(statement.id, editName.trim(), editColor);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditName(statement.bankName);
    setEditColor(statement.colorTag);
    setEditing(false);
  };

  const periodText =
    statement.periodStart && statement.periodEnd
      ? `${formatDate(new Date(statement.periodStart))} – ${formatDate(new Date(statement.periodEnd))}`
      : "Date range unknown";

  return (
    <div
      className={cn(
        "bg-white rounded-card border shadow-card transition-all duration-200",
        isActive ? "border-surface-border" : "border-surface-border opacity-60",
      )}
    >
      {/* Color accent bar at top */}
      <div
        className="h-1 rounded-t-card"
        style={{ backgroundColor: statement.colorTag }}
        aria-hidden="true"
      />

      <div className="p-4 flex items-start gap-3">
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-btn flex items-center justify-center shrink-0 mt-0.5"
          style={{ backgroundColor: `${statement.colorTag}1A` }}
        >
          <FileText size={18} style={{ color: statement.colorTag }} />
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {editing ? (
            /* ── Inline edit mode ── */
            <div className="flex flex-col gap-3">
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                aria-label="Bank name"
                placeholder="Bank name"
                className="h-9 px-3 rounded-input border border-surface-border text-sm focus:outline-none focus:ring-2 focus:ring-green-accent/30 focus:border-green-primary"
                maxLength={40}
              />
              {/* Color picker */}
              <div className="flex gap-1.5 flex-wrap">
                {STATEMENT_COLORS.map(({ value }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setEditColor(value)}
                    aria-label={`Select statement color ${value}`}
                    title={`Select statement color ${value}`}
                    className={cn(
                      "w-6 h-6 rounded-chip border-2 transition-all",
                      editColor === value
                        ? "border-gray-700 scale-110"
                        : "border-transparent",
                    )}
                    style={{ backgroundColor: value }}
                  />
                ))}
              </div>
              {/* Save / cancel */}
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  disabled={saving || !editName.trim()}
                  className="flex items-center gap-1.5 px-3 h-8 rounded-btn bg-green-primary text-white text-xs font-medium disabled:opacity-50"
                >
                  {saving ? (
                    <RefreshCw size={12} className="animate-spin" />
                  ) : (
                    <Check size={12} />
                  )}
                  Save
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="flex items-center gap-1.5 px-3 h-8 rounded-btn border border-surface-border text-xs font-medium text-gray-600"
                >
                  <X size={12} /> Cancel
                </button>
              </div>
            </div>
          ) : (
            /* ── Display mode ── */
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-gray-900 truncate">
                  {statement.bankName}
                </h3>
                {!statement.isCategorized && (
                  <Badge variant="warning">Categorising…</Badge>
                )}
              </div>

              <p className="text-xs text-data-secondary mt-0.5 truncate">
                {statement.fileName}
              </p>

              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                <span className="text-xs text-data-secondary">
                  {statement.transactionCount} transactions
                </span>
                <span className="text-xs text-data-secondary">
                  {periodText}
                </span>
                {totalDebits > 0 && (
                  <span className="text-xs font-medium text-data-alert">
                    {formatNaira(totalDebits)} spent
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Action buttons */}
        {!editing && (
          <div className="flex items-center gap-1 shrink-0">
            {/* Active toggle */}
            <button
              onClick={() => toggleActive(statement.id)}
              type="button"
              className={cn(
                "w-10 h-6 rounded-chip border-2 transition-all relative",
                isActive
                  ? "bg-green-primary border-green-primary"
                  : "bg-surface-muted border-surface-border",
              )}
              aria-label={
                isActive ? "Exclude from analysis" : "Include in analysis"
              }
              aria-pressed={isActive}
              title={isActive ? "Exclude from analysis" : "Include in analysis"}
            >
              <span
                className={cn(
                  "absolute top-0.5 w-4 h-4 rounded-chip bg-white shadow transition-all",
                  isActive ? "left-[18px]" : "left-0.5",
                )}
              />
            </button>

            {/* Edit */}
            <button
              onClick={() => setEditing(true)}
              type="button"
              className="p-1.5 rounded-btn text-gray-400 hover:text-gray-700 hover:bg-surface-muted transition-colors"
              aria-label="Edit statement"
              title="Edit statement"
            >
              <Edit2 size={14} />
            </button>

            {/* Delete */}
            <button
              type="button"
              onClick={() => onDelete(statement)}
              disabled={isDeleting}
              className="p-1.5 rounded-btn text-gray-400 hover:text-data-alert hover:bg-red-50 transition-colors disabled:opacity-40"
              aria-label="Delete statement"
              title="Delete statement"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
