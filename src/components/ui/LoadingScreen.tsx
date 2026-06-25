import { TrendingUp } from 'lucide-react'

// ════════════════════════════════════════════════════════════
// LOADING SCREEN — full-page spinner with FlowIQ branding
// Shown while session check is in-flight on first app load
// ════════════════════════════════════════════════════════════

/**
 * Full-screen branded loading screen.
 * Shown once on initial app load while useAuth checks for
 * an existing session. Replaces the blank white flash that
 * would otherwise appear before the session resolves.
 */
export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-shell flex flex-col items-center justify-center gap-5">
      {/* Animated app icon */}
      <div className="w-16 h-16 rounded-[20px] bg-green-primary flex items-center justify-center animate-scale-in shadow-lg shadow-green-primary/30">
        <TrendingUp size={30} strokeWidth={2.5} className="text-white" />
      </div>

      {/* Wordmark */}
      <div className="text-3xl font-extrabold tracking-tight">
        <span className="text-white">Flow</span>
        <span className="text-green-accent">IQ</span>
      </div>

      {/* Spinner */}
      <div className="w-6 h-6 border-2 border-green-primary/30 border-t-green-primary rounded-full animate-spin mt-2" />
    </div>
  )
}
