import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  ArrowLeftRight,
  Tag,
  Lightbulb,
} from "lucide-react";
import { ROUTES } from "@/lib/constants";

// ════════════════════════════════════════════════════════════
// BOTTOM NAV — mobile only (hidden on lg+)
// Fixed to the bottom of the viewport with safe area support.
// Shows 5 primary nav items as icon + label tabs.
// ════════════════════════════════════════════════════════════

const NAV_ITEMS = [
  { to: ROUTES.dashboard, label: "Home", Icon: LayoutDashboard },
  { to: ROUTES.statements, label: "Statements", Icon: FileText },
  { to: ROUTES.transactions, label: "Transactions", Icon: ArrowLeftRight },
  { to: ROUTES.categories, label: "Categories", Icon: Tag },
  { to: ROUTES.insights, label: "Insights", Icon: Lightbulb },
] as const;

/**
 * Mobile bottom navigation bar.
 * Sticks to the bottom of the screen and respects device safe areas.
 * Only visible on screens narrower than the lg breakpoint (1024px).
 * Active route is highlighted with the primary green color.
 */
export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="layout-bottomnav" aria-label="Main navigation">
      <div className="layout-bottomnav-items">
        {NAV_ITEMS.map(({ to, label, Icon }) => {
          const isActive = location.pathname === to;

          return (
            <NavLink
              key={to}
              to={to}
              className={`layout-bottomnav-link ${isActive ? "active" : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              {/* Active indicator pill above icon */}
              <span className="layout-bottomnav-indicator" aria-hidden="true" />

              <Icon
                size={20}
                strokeWidth={isActive ? 2.5 : 1.8}
                className="layout-bottomnav-icon"
                aria-hidden="true"
              />
              <span>{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
