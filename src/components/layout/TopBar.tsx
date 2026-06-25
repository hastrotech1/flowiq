import { Menu } from 'lucide-react'
import { cn } from '@/lib/utils'

// ════════════════════════════════════════════════════════════
// TOPBAR — sticky header, visible on all screen sizes
// Mobile: hamburger menu + page title + optional action
// Desktop: page title + optional action (no hamburger — sidebar is always visible)
// ════════════════════════════════════════════════════════════

interface TopBarProps {
  /** Page title displayed in the center/left of the bar */
  title:         string
  /** Optional right-side slot — upload button, filter toggle, etc. */
  action?:       React.ReactNode
  /** Opens the mobile sidebar drawer — only used on mobile */
  onMenuClick:   () => void
}

/**
 * Sticky top bar present on every authenticated page.
 * On mobile it includes a hamburger button that opens the sidebar drawer.
 * On desktop the hamburger is hidden because the sidebar is always visible.
 */
export default function TopBar({ title, action, onMenuClick }: TopBarProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-20 h-14 shrink-0',
        'flex items-center justify-between',
        'bg-white/90 backdrop-blur-sm',
        'border-b border-surface-border',
        'px-4 lg:px-6',
        // Top safe area for notched phones
        'pt-[env(safe-area-inset-top)]',
      )}
    >
      {/* Left slot — hamburger on mobile, hidden on desktop */}
      <button
        onClick={onMenuClick}
        className={cn(
          'lg:hidden p-2 -ml-2 rounded-btn',
          'text-gray-500 hover:text-gray-800 hover:bg-surface-muted',
          'transition-colors focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-green-accent/40',
        )}
        aria-label="Open navigation menu"
      >
        <Menu size={20} />
      </button>

      {/* Page title */}
      <h1
        className={cn(
          'text-base font-semibold text-gray-900',
          // On mobile: centered. On desktop: left-aligned (no hamburger offset needed)
          'absolute left-1/2 -translate-x-1/2 lg:static lg:translate-x-0',
        )}
      >
        {title}
      </h1>

      {/* Right action slot */}
      <div className="flex items-center gap-2 min-w-[40px] justify-end">
        {action ?? null}
      </div>
    </header>
  )
}
