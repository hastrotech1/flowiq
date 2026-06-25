import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  ArrowLeftRight,
  Tag,
  Lightbulb,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/lib/constants'

// ════════════════════════════════════════════════════════════
// BOTTOM NAV — mobile only (hidden on lg+)
// Fixed to the bottom of the viewport with safe area support.
// Shows 5 primary nav items as icon + label tabs.
// ════════════════════════════════════════════════════════════

const NAV_ITEMS = [
  { to: ROUTES.dashboard,     label: 'Home',         Icon: LayoutDashboard },
  { to: ROUTES.statements,    label: 'Statements',   Icon: FileText        },
  { to: ROUTES.transactions,  label: 'Transactions', Icon: ArrowLeftRight  },
  { to: ROUTES.categories,    label: 'Categories',   Icon: Tag             },
  { to: ROUTES.insights,      label: 'Insights',     Icon: Lightbulb       },
] as const

/**
 * Mobile bottom navigation bar.
 * Sticks to the bottom of the screen and respects device safe areas.
 * Only visible on screens narrower than the lg breakpoint (1024px).
 * Active route is highlighted with the primary green color.
 */
export default function BottomNav() {
  const location = useLocation()

  return (
    <nav
      className={cn(
        'lg:hidden fixed bottom-0 inset-x-0 z-30',
        'bg-white border-t border-surface-border',
        // Safe area padding for notched devices (iPhone X+)
        'pb-[env(safe-area-inset-bottom)]',
      )}
      aria-label="Main navigation"
    >
      <div className="flex items-stretch h-16">
        {NAV_ITEMS.map(({ to, label, Icon }) => {
          const isActive = location.pathname === to

          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5',
                'text-xs font-medium transition-colors duration-150',
                'focus-visible:outline-none focus-visible:bg-green-subtle',
                '-webkit-tap-highlight-color: transparent',
                isActive
                  ? 'text-green-primary'
                  : 'text-data-secondary hover:text-gray-700',
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Active indicator pill above icon */}
              <span
                className={cn(
                  'w-8 h-0.5 rounded-chip mb-1 transition-all duration-200',
                  isActive ? 'bg-green-primary' : 'bg-transparent',
                )}
                aria-hidden="true"
              />

              <Icon
                size={20}
                strokeWidth={isActive ? 2.5 : 1.8}
                className="transition-all duration-150"
                aria-hidden="true"
              />
              <span>{label}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
