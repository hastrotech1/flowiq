import { cn } from '@/lib/utils'
import { DATE_FILTER_PRESETS } from '@/lib/constants'
import { useFiltersStore } from '@/store/filters.store'
import type { DateFilterPreset } from '@/types'

// ════════════════════════════════════════════════════════════
// DATE FILTER BAR — horizontal scrollable preset pills
// ════════════════════════════════════════════════════════════

/**
 * Horizontally scrollable row of date filter preset pills.
 * Selecting a preset updates the global filters store.
 * Used at the top of Dashboard, Transactions, Categories pages.
 */
export default function DateFilterBar() {
  const datePreset    = useFiltersStore((s) => s.datePreset)
  const setDatePreset = useFiltersStore((s) => s.setDatePreset)

  return (
    <div
      className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5"
      role="group"
      aria-label="Date filter"
    >
      {DATE_FILTER_PRESETS.filter((p) => p.value !== 'custom').map((preset) => {
        const isActive = datePreset === preset.value

        return (
          <button
            key={preset.value}
            onClick={() => setDatePreset(preset.value as DateFilterPreset)}
            className={cn(
              'shrink-0 h-8 px-3.5 rounded-chip text-xs font-medium',
              'transition-all duration-150 whitespace-nowrap',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-accent/40',
              isActive
                ? 'bg-green-primary text-white shadow-sm'
                : 'bg-white border border-surface-border text-data-secondary hover:border-green-primary/40 hover:text-gray-700',
            )}
            aria-pressed={isActive}
          >
            {preset.label}
          </button>
        )
      })}
    </div>
  )
}
