import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithGoogle } from "@/appwrite/auth";
import { useAuthStore } from "@/store/auth.store";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import "./Auth.css";

// ════════════════════════════════════════════════════════════
// AUTH PAGE
// Full-screen sign-in page with ambient canvas animation.
// Mirrors the HTML prototype in flowiq-auth.html.
// ════════════════════════════════════════════════════════════

/**
 * Auth page — the first screen the user sees.
 * - Animated FlowIQ wordmark (letter-by-letter cascade)
 * - Ambient canvas background (flowing lines + particles)
 * - Google OAuth button at the bottom
 * - If user is already authenticated, redirects to dashboard
 */
export default function AuthPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isChecked = useAuthStore((s) => s.isChecked);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("error") === "oauth_failed"
      ? "Google sign-in was cancelled or failed. Please try again."
      : null;
  });

  // ── Redirect if already authenticated ───────────────────
  useEffect(() => {
    if (isChecked && user) {
      navigate(ROUTES.dashboard, { replace: true });
    }
  }, [isChecked, user, navigate]);

  // ── Ambient canvas animation ─────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0,
      H = 0;
    let animFrame = 0;
    let tick = 0;

    interface Particle {
      x: number;
      y: number;
      r: number;
      dx: number;
      dy: number;
      alpha: number;
      life: number;
      maxLife: number;
    }

    interface FlowLine {
      pts: { x: number; yBase: number }[];
      phase: number;
      speed: number;
      amp: number;
      alpha: number;
      color: string;
    }

    let particles: Particle[] = [];
    let flowLines: FlowLine[] = [];

    /** Resize canvas to match CSS size (handles device pixel ratio) */
    const resize = () => {
      W = canvas.width = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
    };

    /** Create a new rising particle */
    const mkParticle = (): Particle => {
      const maxLife = Math.floor(Math.random() * 220 + 130);
      return {
        x: Math.random() * W,
        y: H + 4,
        r: Math.random() * 1.5 + 0.3,
        dx: (Math.random() - 0.5) * 0.3,
        dy: -(Math.random() * 0.45 + 0.15),
        alpha: Math.random() * 0.28 + 0.06,
        life: maxLife,
        maxLife,
      };
    };

    /** Create a sinusoidal flow line */
    const mkLine = (index: number): FlowLine => ({
      pts: Array.from({ length: 10 }, (_, i) => ({
        x: (i / 9) * W,
        yBase: H * (0.18 + index * 0.2),
      })),
      phase: Math.random() * Math.PI * 2,
      speed: 0.003 + Math.random() * 0.003,
      amp: 26 + Math.random() * 22,
      alpha: 0.032 + Math.random() * 0.028,
      color:
        index === 1
          ? cssColor("--color-green-accent")
          : cssColor("--color-green-primary"),
    });

    /** Seed all particles and flow lines */
    const init = () => {
      particles = Array.from({ length: 65 }, () => {
        const p = mkParticle();
        p.y = Math.random() * H;
        p.life = Math.floor(Math.random() * p.maxLife);
        return p;
      });
      flowLines = [0, 1, 2].map(mkLine);
    };

    /** Main render loop */
    const render = () => {
      ctx.clearRect(0, 0, W, H);
      tick++;

      // Draw sinusoidal flow lines
      flowLines.forEach((line) => {
        ctx.beginPath();
        line.pts.forEach((pt, i) => {
          const y =
            pt.yBase +
            Math.sin(tick * line.speed + i * 0.75 + line.phase) * line.amp;
          if (i === 0) {
            ctx.moveTo(pt.x, y);
          } else {
            ctx.lineTo(pt.x, y);
          }
        });
        ctx.strokeStyle = line.color;
        ctx.globalAlpha = line.alpha;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.globalAlpha = 1;
      });

      // Draw and update particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.dx;
        p.y += p.dy;
        p.life--;
        if (p.life <= 0) {
          particles[i] = mkParticle();
          continue;
        }
        const fade = p.life < 45 ? p.life / 45 : 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = cssColor("--color-green-primary");
        ctx.globalAlpha = p.alpha * fade;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      animFrame = requestAnimationFrame(render);
    };

    resize();
    init();
    render();

    window.addEventListener("resize", () => {
      resize();
      init();
    });
    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener("resize", () => {
        resize();
        init();
      });
    };
  }, []);

  // ── Google sign-in handler ───────────────────────────────
  const handleGoogleSignIn = async () => {
    if (signing) return;
    setSigning(true);
    setError(null);
    try {
      await signInWithGoogle();
      // Browser navigates away — no further state updates needed
    } catch {
      setSigning(false);
      setError("Sign-in failed. Please try again.");
    }
  };

  return (
    <div className="auth-page">
      {/* Ambient canvas background */}
      <canvas ref={canvasRef} className="auth-canvas" aria-hidden="true" />

      {/* Wordmark section — vertically centered */}
      <div className="auth-hero">
        {/* Icon + Wordmark row */}
        <div className="auth-brand">
          {/* App icon */}
          <div className="auth-icon" aria-hidden="true">
            <svg
              width="30"
              height="30"
              viewBox="0 0 30 30"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M4 22 Q9 8 15 15 Q21 22 26 6"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="26" cy="6" r="3" fill="currentColor" />
            </svg>
          </div>

          {/* Animated wordmark */}
          <h1 className="auth-wordmark" aria-label="FlowIQ">
            <AnimatedLetters />
          </h1>
        </div>

        {/* Tagline */}
        <p className="auth-tagline">Your money, finally making sense</p>
      </div>

      {/* Bottom CTA section */}
      <div className="auth-footer">
        {/* Error message */}
        {error && <p className="auth-error">{error}</p>}

        {/* Google sign-in button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={signing}
          className={cn("auth-button", signing && "auth-button--loading")}
          aria-label="Continue with Google"
        >
          {signing ? (
            /* Loading spinner while OAuth redirect is in-flight */
            <div className="auth-spinner" />
          ) : (
            /* Official Google G mark */
            <GoogleLogo />
          )}
          <span>{signing ? "Redirecting…" : "Continue with Google"}</span>
        </button>

        {/* Legal copy */}
        <p className="auth-legal">
          By continuing, you agree to FlowIQ's Terms of Service and Privacy
          Policy
        </p>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ════════════════════════════════════════════════════════════

/**
 * Animates the FlowIQ wordmark letter by letter.
 * Each letter has a staggered CSS animation delay.
 * IQ letters render in accent green.
 */
function AnimatedLetters() {
  const letters = [
    { char: "F", accent: false },
    { char: "l", accent: false },
    { char: "o", accent: false },
    { char: "w", accent: false },
    { char: "I", accent: true },
    { char: "Q", accent: true },
  ];

  return (
    <>
      {letters.map(({ char, accent }, i) => (
        <span
          key={i}
          className={cn("auth-letter", accent && "auth-letter--accent")}
        >
          {char}
        </span>
      ))}
    </>
  );
}

/** Official Google G logo mark SVG */
function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="var(--color-google-blue)"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="var(--color-google-green)"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="var(--color-google-yellow)"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="var(--color-google-red)"
      />
    </svg>
  );
}

function cssColor(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}
