import { cn } from '@/lib/utils'

// ════════════════════════════════════════════════════════════
// SKELETON — loading placeholder components
// Used while data is being fetched from Appwrite.
// Matches the exact shape of the real content so there's
// no layout shift when data arrives.
// ════════════════════════════════════════════════════════════

interface SkeletonProps {
  className?: string
}

/**
 * Base skeleton block — animated shimmer placeholder.
 * Compose with width/height Tailwind classes to match real content.
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-surface-muted rounded-btn',
        className,
      )}
      aria-hidden="true"
    />
  )
}

/**
 * Skeleton for a StatCard — matches the 4-card dashboard row.
 */
export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-card border border-surface-border shadow-card border-l-4 border-l-surface-muted p-4 flex flex-col gap-2">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-7 w-36 mt-1" />
      <Skeleton className="h-3 w-20" />
    </div>
  )
}

/**
 * Skeleton for a transaction row in the table.
 */
export function TransactionRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-border last:border-0">
      <Skeleton className="w-9 h-9 rounded-btn shrink-0" />
      <div className="flex-1 flex flex-col gap-1.5">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-2.5 w-24" />
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-2.5 w-16" />
      </div>
    </div>
  )
}

/**
 * Skeleton for the Statements page — statement cards.
 */
export function StatementCardSkeleton() {
  return (
    <div className="bg-white rounded-card border border-surface-border shadow-card p-4 flex items-center gap-4">
      <Skeleton className="w-10 h-10 rounded-btn shrink-0" />
      <div className="flex-1 flex flex-col gap-2">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-2.5 w-24" />
      </div>
      <Skeleton className="h-8 w-20 rounded-btn" />
    </div>
  )
}

/**
 * Skeleton for a chart area — used on Dashboard/Categories.
 */
export function ChartSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div
      className="w-full rounded-btn bg-surface-muted animate-pulse"
      style={{ height }}
      aria-hidden="true"
    />
  )
}
