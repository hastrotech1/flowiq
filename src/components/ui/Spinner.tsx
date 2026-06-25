import { cn } from '@/lib/utils'

// ════════════════════════════════════════════════════════════
// SPINNER — reusable loading indicator
// ════════════════════════════════════════════════════════════

interface SpinnerProps {
  size?:      'sm' | 'md' | 'lg'
  className?: string
  /** Accessible label for screen readers */
  label?:     string
}

const SIZE_MAP = {
  sm: 'w-4 h-4 border-[1.5px]',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-2',
}

/**
 * Circular loading spinner.
 * Uses the brand green primary color.
 *
 * Usage:
 *   <Spinner size="sm" />
 *   <Spinner size="lg" label="Loading transactions…" />
 */
export default function Spinner({ size = 'md', className, label }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label ?? 'Loading'}
      className={cn(
        'inline-block rounded-full animate-spin',
        'border-green-primary/20 border-t-green-primary',
        SIZE_MAP[size],
        className,
      )}
    />
  )
}
