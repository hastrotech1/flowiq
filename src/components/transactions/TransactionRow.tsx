import { useState } from 'react'
import { ArrowUpRight, ArrowDownLeft, ChevronDown, ChevronUp } from 'lucide-react'
import { cn, formatNaira, formatDate, formatNarration, truncate } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import { useStatementsStore } from '@/store/statements.store'
import type { Transaction } from '@/types'

// ════════════════════════════════════════════════════════════
// TRANSACTION ROW — single row in the transactions table
// Expandable to show full narration, category, balance, bank
// ════════════════════════════════════════════════════════════

interface TransactionRowProps {
  transaction: Transaction
}

/**
 * A single transaction row with tap-to-expand detail panel.
 *
 * Collapsed: direction icon | narration (truncated) | date | amount
 * Expanded:  + full narration, category badge, balance, bank source,
 *              transfer flag if applicable
 *
 * Color rules:
 *   Debit  → red amount, red icon background
 *   Credit → green amount, green icon background
 */
export default function TransactionRow({ transaction: tx }: TransactionRowProps) {
  const [expanded, setExpanded] = useState(false)
  const isDebit = tx.type === 'debit'

  const statement = useStatementsStore((s) =>
    s.statements.find((st) => st.id === tx.statementId)
  )

  return (
    <div
      className={cn(
        'border-b border-surface-border last:border-0',
        'transition-colors duration-100',
        expanded ? 'bg-surface-muted/40' : 'hover:bg-surface-muted/30',
      )}
    >
      {/* ── Collapsed row ── */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left focus-visible:outline-none focus-visible:bg-surface-muted"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-label={`${formatNarration(tx.narration)}, ${isDebit ? 'debit' : 'credit'} ${formatNaira(tx.amount)}`}
      >
        {/* Direction icon */}
        <div
          className={cn(
            'w-9 h-9 rounded-btn flex items-center justify-center shrink-0',
            isDebit ? 'bg-red-50' : 'bg-green-subtle',
          )}
          aria-hidden="true"
        >
          {isDebit
            ? <ArrowUpRight  size={16} className="text-data-alert"    />
            : <ArrowDownLeft size={16} className="text-data-positive"  />
          }
        </div>

        {/* Narration + date */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 leading-snug truncate">
            {truncate(formatNarration(tx.narration), 36)}
          </p>
          <p className="text-[11px] text-data-secondary mt-0.5">
            {formatDate(tx.date)}
            {tx.normalizedCategory && (
              <span className="text-data-secondary/60"> · {tx.normalizedCategory}</span>
            )}
          </p>
        </div>

        {/* Amount + expand chevron */}
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={cn(
              'text-sm font-semibold tabular-nums font-amount',
              isDebit ? 'amount-debit' : 'amount-credit',
            )}
          >
            {isDebit ? '−' : '+'}{formatNaira(tx.amount)}
          </span>
          {expanded
            ? <ChevronUp  size={14} className="text-data-secondary" />
            : <ChevronDown size={14} className="text-data-secondary" />
          }
        </div>
      </button>

      {/* ── Expanded detail panel ── */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 flex flex-col gap-2.5 animate-fade-in">

          {/* Full narration */}
          <div>
            <p className="text-[10px] uppercase tracking-wide text-data-secondary font-medium mb-0.5">
              Full Narration
            </p>
            <p className="text-sm text-gray-700 leading-relaxed break-words">
              {formatNarration(tx.narration)}
            </p>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap gap-2">
            {/* Type badge */}
            <Badge variant={isDebit ? 'debit' : 'credit'}>
              {isDebit ? 'Debit' : 'Credit'}
            </Badge>

            {/* Category badge */}
            {tx.normalizedCategory && (
              <Badge variant="neutral">{tx.normalizedCategory}</Badge>
            )}

            {/* Transfer flag */}
            {tx.isInterAccountTransfer && (
              <Badge variant="warning">Inter-account Transfer</Badge>
            )}
          </div>

          {/* Balance + bank source */}
          <div className="flex items-center gap-4 flex-wrap">
            {tx.balance !== null && (
              <div>
                <p className="text-[10px] uppercase tracking-wide text-data-secondary font-medium">
                  Balance After
                </p>
                <p className="text-sm font-medium text-gray-800 tabular-nums font-amount">
                  {formatNaira(tx.balance)}
                </p>
              </div>
            )}

            {statement && (
              <div>
                <p className="text-[10px] uppercase tracking-wide text-data-secondary font-medium">
                  Account
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: statement.colorTag }}
                    aria-hidden="true"
                  />
                  <p className="text-sm font-medium text-gray-800">
                    {statement.bankName}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
