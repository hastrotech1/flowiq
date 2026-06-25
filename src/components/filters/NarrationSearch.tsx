import { useRef } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFiltersStore } from '@/store/filters.store'

// ════════════════════════════════════════════════════════════
// NARRATION SEARCH — live search input for transaction narrations
// ════════════════════════════════════════════════════════════

interface NarrationSearchProps {
  className?: string
  placeholder?: string
}

/**
 * Controlled search input wired to the global filters store.
 * Updates `narrationSearch` on every keystroke — filtering is
 * applied client-side in useTransactions via applyFilters().
 *
 * Shows a clear (×) button when the field has a value.
 */
export default function NarrationSearch({
  className,
  placeholder = 'Search narration…',
}: NarrationSearchProps) {
  const inputRef         = useRef<HTMLInputElement>(null)
  const narrationSearch  = useFiltersStore((s) => s.narrationSearch)
  const setNarrationSearch = useFiltersStore((s) => s.setNarrationSearch)

  const clear = () => {
    setNarrationSearch('')
    inputRef.current?.focus()
  }

  return (
    <div className={cn('relative flex items-center', className)}>
      {/* Search icon */}
      <Search
        size={15}
        className="absolute left-3 text-data-secondary pointer-events-none"
        aria-hidden="true"
      />

      <input
        ref={inputRef}
        type="search"
        value={narrationSearch}
        onChange={(e) => setNarrationSearch(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full h-10 pl-9 pr-8 rounded-input border border-surface-border',
          'text-sm bg-white placeholder:text-gray-400',
          'focus:outline-none focus:ring-2 focus:ring-green-accent/30 focus:border-green-primary',
          'transition-colors',
        )}
        aria-label="Search by narration"
      />

      {/* Clear button */}
      {narrationSearch && (
        <button
          onClick={clear}
          className="absolute right-2.5 p-0.5 rounded text-gray-400 hover:text-gray-700 transition-colors"
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
