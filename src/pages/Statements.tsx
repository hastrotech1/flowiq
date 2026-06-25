import { useEffect, useState } from 'react'
import { Plus, FileText } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import PageWrapper, { SectionCard, SectionHeader } from '@/components/layout/PageWrapper'
import StatementCard from '@/components/upload/StatementCard'
import UploadModal from '@/components/upload/UploadModal'
import EmptyState from '@/components/ui/EmptyState'
import { StatementCardSkeleton } from '@/components/ui/Skeleton'
import { useStatements } from '@/hooks/useStatements'
import { useToast } from '@/components/ui/Toast'
import { useStatementsStore } from '@/store/statements.store'
import { useTransactionsStore } from '@/store/transactions.store'
import { formatNaira } from '@/lib/utils'
import type { Statement } from '@/types'

/**
 * Statements page — manages all uploaded bank statements.
 *
 * Features:
 * - List of all uploaded statements with color tags, counts, totals
 * - Active/inactive toggle per statement (controls analysis scope)
 * - Inline edit (rename / recolor)
 * - Delete with confirmation
 * - Upload modal (multi-step: form → [column mapper] → progress)
 * - Summary bar showing active statement count + combined total
 */
export default function StatementsPage() {
  const toast                         = useToast()
  const [showUpload, setShowUpload]   = useState(false)
  const [deletingId, setDeletingId]   = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Statement | null>(null)

  const { statements, isLoading, loadAll, editStatement, deleteStatement } = useStatements()
  const activeIds    = useStatementsStore((s) => s.activeIds)
  const setAllActive = useStatementsStore((s) => s.setAllActive)
  const allTxCount   = useTransactionsStore((s) => s.transactions.length)
  const totalSpent   = useTransactionsStore((s) =>
    s.transactions
      .filter((t) => t.type === 'debit' && !t.isInterAccountTransfer)
      .reduce((sum, t) => sum + t.amount, 0)
  )

  // Load all data on mount
  useEffect(() => { loadAll() }, [loadAll])

  // Handle delete with confirmation
  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return
    setDeletingId(confirmDelete.id)
    try {
      await deleteStatement(confirmDelete)
      toast.success(`"${confirmDelete.bankName}" deleted.`)
    } catch {
      toast.error('Failed to delete statement. Please try again.')
    } finally {
      setDeletingId(null)
      setConfirmDelete(null)
    }
  }

  const handleEdit = async (id: string, bankName: string, colorTag: string): Promise<void> => {
    try {
      await editStatement(id, { bankName, colorTag })
    } catch {
      toast.error('Failed to update statement.')
      throw new Error('edit failed')
    }
  }

  const activeCount = activeIds.size
  const allIds      = statements.map((s) => s.id)

  return (
    <AppLayout
      title="Statements"
      action={
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-1.5 h-9 px-3 rounded-btn bg-green-primary text-white text-sm font-medium hover:bg-green-deep transition-colors"
        >
          <Plus size={15} />
          <span className="hidden sm:inline">Upload</span>
        </button>
      }
    >
      <PageWrapper>

        {/* ── Summary bar ── */}
        {statements.length > 0 && !isLoading && (
          <SectionCard className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-6 flex-wrap">
              <div>
                <p className="text-xs text-data-secondary uppercase tracking-wide">Active</p>
                <p className="text-base font-bold text-gray-900">
                  {activeCount} / {statements.length} accounts
                </p>
              </div>
              <div>
                <p className="text-xs text-data-secondary uppercase tracking-wide">Total Transactions</p>
                <p className="text-base font-bold text-gray-900">{allTxCount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-data-secondary uppercase tracking-wide">Total Spent</p>
                <p className="text-base font-bold text-data-alert">{formatNaira(totalSpent)}</p>
              </div>
            </div>

            {/* Select all / deselect all */}
            <div className="flex gap-2">
              <button
                onClick={() => setAllActive(allIds)}
                className="text-xs font-medium text-green-primary hover:underline"
              >
                Select all
              </button>
              <span className="text-data-secondary">·</span>
              <button
                onClick={() => setAllActive([])}
                className="text-xs font-medium text-data-secondary hover:underline"
              >
                Deselect all
              </button>
            </div>
          </SectionCard>
        )}

        {/* ── Statement list ── */}
        <SectionCard noPadding>
          <SectionHeader
            title="Your Statements"
            subtitle="Toggle statements to include or exclude them from analysis"
            className="px-4 pt-4"
          />

          {isLoading ? (
            /* Skeleton loading state */
            <div className="flex flex-col gap-3 px-4 pb-4">
              {[1, 2, 3].map((i) => <StatementCardSkeleton key={i} />)}
            </div>
          ) : statements.length === 0 ? (
            /* Empty state */
            <EmptyState
              icon={<FileText size={24} />}
              title="No statements yet"
              description="Upload your first bank statement to start analysing your finances."
              action={
                <button
                  onClick={() => setShowUpload(true)}
                  className="flex items-center gap-2 h-10 px-4 rounded-btn bg-green-primary text-white text-sm font-medium hover:bg-green-deep transition-colors"
                >
                  <Plus size={15} /> Upload Statement
                </button>
              }
            />
          ) : (
            /* Statement cards */
            <div className="flex flex-col gap-3 px-4 pb-4">
              {statements.map((stmt) => (
                <StatementCard
                  key={stmt.id}
                  statement={stmt}
                  onEdit={handleEdit}
                  onDelete={(s) => { setConfirmDelete(s); return Promise.resolve() }}
                  isDeleting={deletingId === stmt.id}
                />
              ))}
            </div>
          )}
        </SectionCard>

      </PageWrapper>

      {/* ── Upload modal ── */}
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}

      {/* ── Delete confirmation modal ── */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6"
          onClick={(e) => e.target === e.currentTarget && setConfirmDelete(null)}
        >
          <div className="bg-white rounded-card w-full max-w-sm p-6 flex flex-col gap-4 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">Delete Statement?</h3>
            <p className="text-sm text-data-secondary leading-relaxed">
              This will permanently delete <strong>"{confirmDelete.bankName}"</strong> and all{' '}
              <strong>{confirmDelete.transactionCount}</strong> transactions associated with it.
              This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 h-10 rounded-btn border border-surface-border text-sm font-medium text-gray-700 hover:bg-surface-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={!!deletingId}
                className="flex-1 h-10 rounded-btn bg-data-alert text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-60"
              >
                {deletingId ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
