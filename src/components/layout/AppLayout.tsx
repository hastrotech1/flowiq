import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import BottomNav from './BottomNav'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import { cn } from '@/lib/utils'

// ════════════════════════════════════════════════════════════
// APP LAYOUT
// Wraps every protected page. Handles:
//   - Mobile: TopBar + scrollable content + BottomNav
//   - Desktop (lg+): fixed Sidebar + TopBar + scrollable content
// ════════════════════════════════════════════════════════════

interface AppLayoutProps {
  children:  React.ReactNode
  /** Page title shown in the TopBar */
  title:     string
  /** Optional right-side action slot in the TopBar */
  action?:   React.ReactNode
  /** Hides the TopBar — used on pages with a custom hero header */
  hideTopBar?: boolean
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
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  // Close sidebar on desktop resize (prevents stale open state)
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setSidebarOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <div className="flex h-[100dvh] bg-surface-gray overflow-hidden">

      {/* ── Desktop Sidebar (lg+) ── */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0">
        <Sidebar />
      </aside>

      {/* ── Mobile Sidebar overlay ── */}
      {sidebarOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          {/* Drawer */}
          <aside className="fixed inset-y-0 left-0 z-50 w-72 lg:hidden animate-slide-in-right">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </aside>
        </>
      )}

      {/* ── Main content column ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* TopBar */}
        {!hideTopBar && (
          <TopBar
            title={title}
            action={action}
            onMenuClick={() => setSidebarOpen(true)}
          />
        )}

        {/* Scrollable page content */}
        <main
          className={cn(
            'flex-1 overflow-y-auto overflow-x-hidden',
            // Bottom padding accounts for the mobile BottomNav height + safe area
            'pb-[calc(72px+env(safe-area-inset-bottom))] lg:pb-6',
            'px-4 lg:px-6 pt-4 lg:pt-6',
          )}
          id="main-content"
        >
          {children}
        </main>

        {/* ── Mobile BottomNav (hidden on lg+) ── */}
        <BottomNav />
      </div>
    </div>
  )
}
