import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  ArrowLeftRight,
  Tag,
  Lightbulb,
  BarChart2,
  Settings,
  X,
  TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/lib/constants'
import { useAuthStore } from '@/store/auth.store'
import { useAuth } from '@/hooks/useAuth'

// ════════════════════════════════════════════════════════════
// SIDEBAR — desktop only (hidden on mobile, shown lg+)
// Fixed left column, full height, dark green brand surface.
// ════════════════════════════════════════════════════════════

/** Primary nav items (main sections) */
const PRIMARY_NAV = [
  { to: ROUTES.dashboard,    label: 'Dashboard',    Icon: LayoutDashboard },
  { to: ROUTES.statements,   label: 'Statements',   Icon: FileText        },
  { to: ROUTES.transactions, label: 'Transactions', Icon: ArrowLeftRight  },
  { to: ROUTES.categories,   label: 'Categories',   Icon: Tag             },
  { to: ROUTES.insights,     label: 'AI Insights',  Icon: Lightbulb       },
  { to: ROUTES.reports,      label: 'Reports',      Icon: BarChart2       },
] as const

/** Secondary nav items (utility) */
const SECONDARY_NAV = [
  { to: ROUTES.settings, label: 'Settings', Icon: Settings },
] as const

interface SidebarProps {
  /** Called when the mobile close button is clicked */
  onClose?: () => void
}

/**
 * Desktop sidebar navigation.
 * Uses a dark shell background (matches the auth page aesthetic).
 * Active routes are highlighted with the primary green.
 * Displays user avatar and name at the bottom with a sign-out button.
 */
export default function Sidebar({ onClose }: SidebarProps) {
  const user    = useAuthStore((s) => s.user)
  const { signOut } = useAuth()

  return (
    <div className="flex flex-col h-full bg-shell-surface border-r border-shell-border">

      {/* ── Logo + close button (mobile only) ── */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-shell-border shrink-0">
        <div className="flex items-center gap-2.5">
          {/* App icon */}
          <div className="w-8 h-8 rounded-[10px] bg-green-primary flex items-center justify-center shrink-0">
            <TrendingUp size={16} strokeWidth={2.5} className="text-white" />
          </div>
          <span className="text-lg font-extrabold tracking-tight">
            <span className="text-white">Flow</span>
            <span className="text-green-accent">IQ</span>
          </span>
        </div>

        {/* Close button — only rendered in mobile drawer mode */}
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-btn text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* ── Primary navigation ── */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-0.5" aria-label="Primary">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-white/30">
          Menu
        </p>

        {PRIMARY_NAV.map(({ to, label, Icon }) => (
          <SidebarLink key={to} to={to} label={label} Icon={Icon} />
        ))}

        <div className="my-3 border-t border-shell-border" />

        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-white/30">
          Account
        </p>

        {SECONDARY_NAV.map(({ to, label, Icon }) => (
          <SidebarLink key={to} to={to} label={label} Icon={Icon} />
        ))}
      </nav>

      {/* ── User profile + sign out ── */}
      <div className="px-3 pb-4 pt-3 border-t border-shell-border shrink-0">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-btn hover:bg-white/5 transition-colors group">
          {/* Avatar — uses first letter of name as fallback */}
          <div className="w-8 h-8 rounded-chip bg-green-primary/20 flex items-center justify-center shrink-0">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-8 h-8 rounded-chip object-cover"
              />
            ) : (
              <span className="text-sm font-semibold text-green-accent">
                {user?.name?.[0]?.toUpperCase() ?? 'U'}
              </span>
            )}
          </div>

          {/* Name + email */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate leading-tight">
              {user?.name ?? 'User'}
            </p>
            <p className="text-xs text-white/40 truncate leading-tight">
              {user?.email ?? ''}
            </p>
          </div>
        </div>

        {/* Sign out button */}
        <button
          onClick={signOut}
          className={cn(
            'w-full mt-2 h-9 rounded-btn text-sm font-medium',
            'text-white/50 hover:text-data-alert hover:bg-red-50/10',
            'transition-colors text-center',
          )}
        >
          Sign out
        </button>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// SIDEBAR LINK — single nav item
// ════════════════════════════════════════════════════════════

interface SidebarLinkProps {
  to:    string
  label: string
  Icon:  React.ElementType
}

/**
 * Individual sidebar navigation link.
 * Active state uses a green left border + green icon + light text.
 * Inactive state uses muted white text that brightens on hover.
 */
function SidebarLink({ to, label, Icon }: SidebarLinkProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-btn text-sm font-medium',
          'transition-all duration-150 relative',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-accent/40',
          isActive
            ? 'bg-green-primary/15 text-green-accent'
            : 'text-white/60 hover:text-white hover:bg-white/5',
        )
      }
    >
      {({ isActive }) => (
        <>
          {/* Active left border indicator */}
          {isActive && (
            <span
              className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-green-accent rounded-r-full"
              aria-hidden="true"
            />
          )}
          <Icon
            size={17}
            strokeWidth={isActive ? 2.5 : 1.8}
            aria-hidden="true"
          />
          {label}
        </>
      )}
    </NavLink>
  )
}
