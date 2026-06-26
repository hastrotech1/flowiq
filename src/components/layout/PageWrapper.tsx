// ════════════════════════════════════════════════════════════
// PAGE WRAPPER — standard content width + spacing
// Use inside AppLayout's children to constrain content width
// and apply consistent vertical spacing between sections.
// ════════════════════════════════════════════════════════════

interface PageWrapperProps {
  children: React.ReactNode;
  /** Extra classes applied to the outer wrapper */
  className?: string;
  /** Remove max-width constraint — useful for full-bleed tables */
  fluid?: boolean;
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
export default function PageWrapper({
  children,
  className,
  fluid,
}: PageWrapperProps) {
  const classes = ["page-wrapper", !fluid && "compact", className]
    .filter(Boolean)
    .join(" ");

  return <div className={classes}>{children}</div>;
}

// ════════════════════════════════════════════════════════════
// SECTION CARD — white card container used throughout pages
// ════════════════════════════════════════════════════════════

interface SectionCardProps {
  children: React.ReactNode;
  className?: string;
  /** Removes padding — for tables/lists that bleed to edges */
  noPadding?: boolean;
}

/**
 * Standard white card container.
 * Used for each distinct section on a page (chart, table, filter bar, etc.)
 */
export function SectionCard({
  children,
  className,
  noPadding,
}: SectionCardProps) {
  const classes = ["section-card", noPadding && "no-padding", className]
    .filter(Boolean)
    .join(" ");

  return <div className={classes}>{children}</div>;
}

// ════════════════════════════════════════════════════════════
// SECTION HEADER — label + optional right action inside a card
// ════════════════════════════════════════════════════════════

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Card section header with optional subtitle and right-side action slot.
 * Use at the top of a SectionCard to label the section.
 */
export function SectionHeader({
  title,
  subtitle,
  action,
  className,
}: SectionHeaderProps) {
  const headerClasses = ["section-header", className].filter(Boolean).join(" ");

  return (
    <div className={headerClasses}>
      <div className="section-header-content">
        <h2 className="section-header-title">{title}</h2>
        {subtitle && <p className="section-header-subtitle">{subtitle}</p>}
      </div>
      {action && <div className="section-header-action">{action}</div>}
    </div>
  );
}
