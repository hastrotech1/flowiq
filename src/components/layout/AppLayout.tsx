import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import BottomNav from "./BottomNav";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import "./Layout.css";

// ════════════════════════════════════════════════════════════
// APP LAYOUT
// Wraps every protected page. Handles:
//   - Mobile: TopBar + scrollable content + BottomNav
//   - Desktop (lg+): fixed Sidebar + TopBar + scrollable content
// ════════════════════════════════════════════════════════════

interface AppLayoutProps {
  children: React.ReactNode;
  /** Page title shown in the TopBar */
  title: string;
  /** Optional right-side action slot in the TopBar */
  action?: React.ReactNode;
  /** Hides the TopBar — used on pages with a custom hero header */
  hideTopBar?: boolean;
}

/**
 * Root layout wrapper for all authenticated pages.
 * Renders the appropriate navigation chrome based on viewport size.
 * Content area is scrollable; nav chrome is fixed/sticky.
 */
export default function AppLayout({
  children,
  title,
  action,
  hideTopBar = false,
}: AppLayoutProps) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => {
    const frame = requestAnimationFrame(() => setSidebarOpen(false));
    return () => cancelAnimationFrame(frame);
  }, [location.pathname]);

  // Close sidebar on desktop resize (prevents stale open state)
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setSidebarOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div className="layout-container">
      {/* ── Desktop Sidebar (lg+) ── */}
      <aside className="layout-sidebar">
        <Sidebar />
      </aside>

      {/* ── Mobile Sidebar overlay ── */}
      {sidebarOpen && (
        <>
          {/* Backdrop */}
          <div
            className="layout-sidebar-mobile open"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          {/* Drawer */}
          <aside className="layout-sidebar-drawer">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </aside>
        </>
      )}

      {/* ── Main content column ── */}
      <div className="layout-content">
        {/* TopBar */}
        {!hideTopBar && (
          <TopBar
            title={title}
            action={action}
            onMenuClick={() => setSidebarOpen(true)}
          />
        )}

        {/* Scrollable page content */}
        <main className="layout-main" id="main-content">
          {children}
        </main>

        {/* ── Mobile BottomNav (hidden on lg+) ── */}
        <BottomNav />
      </div>
    </div>
  );
}
