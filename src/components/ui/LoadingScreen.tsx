import { TrendingUp } from "lucide-react";
import "./LoadingScreen.css";

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
    <div className="loading-screen">
      {/* Animated app icon */}
      <div className="loading-icon">
        <TrendingUp size={30} />
      </div>

      {/* Wordmark */}
      <div className="loading-wordmark">
        <span className="loading-wordmark-base">Flow</span>
        <span className="loading-wordmark-accent">IQ</span>
      </div>

      {/* Spinner */}
      <div className="loading-spinner" />
    </div>
  );
}
