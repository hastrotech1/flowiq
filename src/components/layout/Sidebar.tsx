import { NavLink } from "react-router-dom";
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
} from "lucide-react";
import { ROUTES } from "@/lib/constants";
import { useAuthStore } from "@/store/auth.store";
import { useAuth } from "@/hooks/useAuth";

// ════════════════════════════════════════════════════════════
// SIDEBAR — desktop only (hidden on mobile, shown lg+)
// Fixed left column, full height, dark green brand surface.
// ════════════════════════════════════════════════════════════

/** Primary nav items (main sections) */
const PRIMARY_NAV = [
  { to: ROUTES.dashboard, label: "Dashboard", Icon: LayoutDashboard },
  { to: ROUTES.statements, label: "Statements", Icon: FileText },
  { to: ROUTES.transactions, label: "Transactions", Icon: ArrowLeftRight },
  { to: ROUTES.categories, label: "Categories", Icon: Tag },
  { to: ROUTES.insights, label: "AI Insights", Icon: Lightbulb },
  { to: ROUTES.reports, label: "Reports", Icon: BarChart2 },
] as const;

/** Secondary nav items (utility) */
const SECONDARY_NAV = [
  { to: ROUTES.settings, label: "Settings", Icon: Settings },
] as const;

interface SidebarProps {
  /** Called when the mobile close button is clicked */
  onClose?: () => void;
}

/**
 * Desktop sidebar navigation.
 * Uses a dark shell background (matches the auth page aesthetic).
 * Active routes are highlighted with the primary green.
 * Displays user avatar and name at the bottom with a sign-out button.
 */
export default function Sidebar({ onClose }: SidebarProps) {
  const user = useAuthStore((s) => s.user);
  const { signOut } = useAuth();

  return (
    <div className="layout-sidebar-content">
      {/* ── Logo + close button (mobile only) ── */}
      <div className="layout-sidebar-header">
        <div className="layout-sidebar-logo">
          {/* App icon */}
          <div className="layout-sidebar-icon">
            <TrendingUp size={16} strokeWidth={2.5} />
          </div>
          <h1 className="layout-sidebar-title">
            Flow<span className="layout-sidebar-title-accent">IQ</span>
          </h1>
        </div>

        {/* Close button — only rendered in mobile drawer mode */}
        {onClose && (
          <button
            onClick={onClose}
            className="layout-sidebar-close"
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* ── Primary navigation ── */}
      <nav className="layout-sidebar-nav" aria-label="Primary">
        <p className="layout-sidebar-section">Menu</p>

        {PRIMARY_NAV.map(({ to, label, Icon }) => (
          <SidebarLink key={to} to={to} label={label} Icon={Icon} />
        ))}

        <div className="layout-sidebar-divider" />

        <p className="layout-sidebar-section">Account</p>

        {SECONDARY_NAV.map(({ to, label, Icon }) => (
          <SidebarLink key={to} to={to} label={label} Icon={Icon} />
        ))}
      </nav>

      {/* ── User profile + sign out ── */}
      <div className="layout-sidebar-footer">
        <div className="layout-sidebar-user">
          {/* Avatar — uses first letter of name as fallback */}
          <div className="layout-sidebar-avatar">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="layout-sidebar-avatar-img"
              />
            ) : (
              (user?.name?.[0]?.toUpperCase() ?? "U")
            )}
          </div>

          {/* Name + email */}
          <div className="layout-sidebar-userinfo">
            <p className="layout-sidebar-username">{user?.name ?? "User"}</p>
            <p className="layout-sidebar-useremail">{user?.email ?? ""}</p>
          </div>
        </div>

        {/* Sign out button */}
        <button onClick={signOut} className="layout-sidebar-signout">
          Sign out
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// SIDEBAR LINK — single nav item
// ════════════════════════════════════════════════════════════

interface SidebarLinkProps {
  to: string;
  label: string;
  Icon: React.ElementType;
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
        `layout-sidebar-link ${isActive ? "active" : ""}`
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            size={17}
            strokeWidth={isActive ? 2.5 : 1.8}
            aria-hidden="true"
          />
          {label}
        </>
      )}
    </NavLink>
  );
}
