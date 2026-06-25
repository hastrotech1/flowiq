import { cn } from '@/lib/utils'

// ════════════════════════════════════════════════════════════
// PAGE WRAPPER — standard content width + spacing
// Use inside AppLayout's children to constrain content width
// and apply consistent vertical spacing between sections.
// ════════════════════════════════════════════════════════════

interface PageWrapperProps {
  children:   React.ReactNode
  /** Extra classes applied to the outer wrapper */
  className?: string
  /** Remove max-width constraint — useful for full-bleed tables */
  fluid?:     boolean
}

/**
 * Standard page content wrapper.
 * Constrains content to a readable max-width on wide screens
 * and provides consistent vertical rhythm via gap.
 *
 * Usage:
 *   <AppLayout title="Dashboard">
 *     <PageWrapper>
 *       <SummaryCards />
 *       <SpendChart />
 *     </PageWrapper>
 *   </AppLayout>
 */
export default function PageWrapper({ children, className, fluid }: PageWrapperProps) {
  return (
    <div
      className={cn(
        'w-full mx-auto flex flex-col gap-4 lg:gap-6',
        !fluid && 'max-w-5xl',
        className,
      )}
    >
      {children}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// SECTION CARD — white card container used throughout pages
// ════════════════════════════════════════════════════════════

interface SectionCardProps {
  children:   React.ReactNode
  className?: string
  /** Removes padding — for tables/lists that bleed to edges */
  noPadding?: boolean
}

/**
 * Standard white card container.
 * Used for each distinct section on a page (chart, table, filter bar, etc.)
 */
export function SectionCard({ children, className, noPadding }: SectionCardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-card border border-surface-border shadow-card',
        !noPadding && 'p-4 lg:p-5',
        className,
      )}
    >
      {children}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// SECTION HEADER — label + optional right action inside a card
// ════════════════════════════════════════════════════════════

interface SectionHeaderProps {
  title:      string
  subtitle?:  string
  action?:    React.ReactNode
  className?: string
}

/**
 * Card section header with optional subtitle and right-side action slot.
 * Use at the top of a SectionCard to label the section.
 */
export function SectionHeader({ title, subtitle, action, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-3 mb-4', className)}>
      <div>
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {subtitle && (
          <p className="text-xs text-data-secondary mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
