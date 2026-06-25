import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { cn, formatNaira, formatDate, formatNarration, truncate } from '@/lib/utils'
import { useStatementsStore } from '@/store/statements.store'
import type { Transaction } from '@/types'

// ════════════════════════════════════════════════════════════
// RECENT TRANSACTION LIST — compact list used on Dashboard
// ════════════════════════════════════════════════════════════

interface RecentTransactionListProps {
  transactions: Transaction[]
}

/**
 * Compact transaction list for the Dashboard "Recent Activity" section.
 * Shows: direction icon (colored), narration, date, amount.
 * Color-coded: debits red, credits green.
 * Links to the full Transactions page are handled by the parent.
 */
export default function RecentTransactionList({ transactions }: RecentTransactionListProps) {
  if (transactions.length === 0) return null

  return (
    <div className="flex flex-col divide-y divide-surface-border">
      {transactions.map((tx) => (
        <TransactionRow key={tx.id} tx={tx} />
      ))}
    </div>
  )
}

// ── Individual row ─────────────────────────────────────────

interface TransactionRowProps {
  tx: Transaction
}

/**
 * Single compact transaction row.
 * Left: colored direction icon + narration + bank source.
 * Right: amount (red=debit, green=credit) + date.
 */
function TransactionRow({ tx }: TransactionRowProps) {
  const isDebit   = tx.type === 'debit'
  const statement = useStatementsStore((s) =>
    s.statements.find((st) => st.id === tx.statementId)
  )

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-surface-muted/60 transition-colors">

      {/* Direction icon */}
      <div className={cn(
        'w-9 h-9 rounded-btn flex items-center justify-center shrink-0',
        isDebit ? 'bg-red-50' : 'bg-green-subtle',
      )}>
        {isDebit
          ? <ArrowUpRight   size={16} className="text-data-alert"    />
          : <ArrowDownLeft  size={16} className="text-data-positive"  />
        }
      </div>

      {/* Narration + bank */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate leading-snug">
          {truncate(formatNarration(tx.narration), 32)}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {statement && (
            <>
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: statement.colorTag }}
              />
              <span className="text-[11px] text-data-secondary truncate">
                {statement.bankName}
              </span>
              <span className="text-[11px] text-data-secondary">·</span>
            </>
          )}
          <span className="text-[11px] text-data-secondary">
            {formatDate(tx.date)}
          </span>
        </div>
      </div>

      {/* Amount */}
      <div className="text-right shrink-0">
        <p className={cn(
          'text-sm font-semibold tabular-nums font-amount',
          isDebit ? 'amount-debit' : 'amount-credit',
        )}>
          {isDebit ? '−' : '+'}{formatNaira(tx.amount)}
        </p>
        {tx.normalizedCategory && (
          <p className="text-[10px] text-data-secondary mt-0.5 truncate max-w-[80px]">
            {tx.normalizedCategory}
          </p>
        )}
      </div>
    </div>
  )
}
