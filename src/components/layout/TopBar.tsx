import { Menu } from "lucide-react";

// ════════════════════════════════════════════════════════════
// TOPBAR — sticky header, visible on all screen sizes
// Mobile: hamburger menu + page title + optional action
// Desktop: page title + optional action (no hamburger — sidebar is always visible)
// ════════════════════════════════════════════════════════════

interface TopBarProps {
  /** Page title displayed in the center/left of the bar */
  title: string;
  /** Optional right-side slot — upload button, filter toggle, etc. */
  action?: React.ReactNode;
  /** Opens the mobile sidebar drawer — only used on mobile */
  onMenuClick: () => void;
}

/**
 * Sticky top bar present on every authenticated page.
 * On mobile it includes a hamburger button that opens the sidebar drawer.
 * On desktop the hamburger is hidden because the sidebar is always visible.
 */
export default function TopBar({ title, action, onMenuClick }: TopBarProps) {
  return (
    <header className="layout-topbar">
      {/* Left slot — hamburger on mobile, hidden on desktop */}
      <button
        onClick={onMenuClick}
        className="layout-topbar-menu"
        aria-label="Open navigation menu"
      >
        <Menu size={20} />
      </button>

      {/* Page title */}
      <h1 className="layout-topbar-title">{title}</h1>

      {/* Right action slot */}
      <div className="layout-topbar-action">{action ?? null}</div>
    </header>
  );
}
