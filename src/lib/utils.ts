import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges Tailwind CSS classes safely, resolving conflicts.
 * Drop-in replacement for `clsx` that handles Tailwind specificity.
 * Used by every component for conditional class composition.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a number as Nigerian Naira currency.
 * Always uses NGN locale with the ₦ symbol.
 * @example formatNaira(1500000) → "₦1,500,000.00"
 */
export function formatNaira(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style:    'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Formats a number as a compact Naira amount for charts/cards.
 * @example formatNairaCompact(1500000) → "₦1.5M"
 */
export function formatNairaCompact(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) {
    return `₦${(amount / 1_000_000).toFixed(1)}M`
  }
  if (Math.abs(amount) >= 1_000) {
    return `₦${(amount / 1_000).toFixed(1)}K`
  }
  return formatNaira(amount)
}

/**
 * Formats a Date object to a readable display string.
 * @example formatDate(new Date('2024-03-15')) → "Mar 15, 2024"
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-NG', {
    day:   'numeric',
    month: 'short',
    year:  'numeric',
  }).format(date)
}

/**
 * Formats a Date to a short day-month string for charts.
 * @example formatDateShort(new Date('2024-03-15')) → "15 Mar"
 */
export function formatDateShort(date: Date): string {
  return new Intl.DateTimeFormat('en-NG', {
    day:   '2-digit',
    month: 'short',
  }).format(date)
}

/**
 * Returns a safe display string for narration values.
 * Falls back to "No Narration" if empty, null, or whitespace-only.
 */
export function formatNarration(narration: string | null | undefined): string {
  const trimmed = narration?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : 'No Narration'
}

/**
 * Generates a deterministic color from a string.
 * Used to assign consistent colors to narration categories.
 */
export function stringToColor(str: string): string {
  const palette = [
    '#00A86B', '#1E3A5F', '#F97316', '#8B5CF6',
    '#EC4899', '#06B6D4', '#EAB308', '#64748B',
  ]
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return palette[Math.abs(hash) % palette.length]
}

/**
 * Truncates a string to a max length with ellipsis.
 * @example truncate("Long narration text", 20) → "Long narration tex..."
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 3) + '...'
}

/**
 * Returns the ISO week number for a given date.
 * Used for "filter by week" grouping.
 */
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

/**
 * Checks if two dates fall on the same calendar day.
 */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
  )
}

/**
 * Generates a random UUID v4.
 * Used as fallback when crypto.randomUUID is unavailable.
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
