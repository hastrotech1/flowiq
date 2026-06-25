import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { formatNaira, formatNairaCompact, stringToColor, truncate } from '@/lib/utils'

// ════════════════════════════════════════════════════════════
// CATEGORY DONUT CHART — spend breakdown by category
// ════════════════════════════════════════════════════════════

interface CategoryEntry {
  category: string
  total:    number
  count:    number
}

interface CategoryDonutChartProps {
  data:    CategoryEntry[]
  height?: number
}

/**
 * Donut chart showing spend distribution across categories.
 * Each slice gets a deterministic color from stringToColor().
 * Shows centre total. Custom legend listed below the chart.
 * Used on Dashboard (top 6) and full Categories page.
 */
export default function CategoryDonutChart({ data, height = 200 }: CategoryDonutChartProps) {
  if (data.length === 0) return null

  const total      = data.reduce((s, d) => s + d.total, 0)
  const chartSlices = data.slice(0, 8)   // max 8 slices for readability

  return (
    <div className="flex flex-col gap-3">
      {/* Donut */}
      <div className="relative" style={{ height }}>
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={chartSlices}
              dataKey="total"
              nameKey="category"
              cx="50%"
              cy="50%"
              innerRadius="58%"
              outerRadius="80%"
              paddingAngle={2}
              strokeWidth={0}
            >
              {chartSlices.map((entry) => (
                <Cell
                  key={entry.category}
                  fill={stringToColor(entry.category)}
                />
              ))}
            </Pie>
            <Tooltip content={<DonutTooltip total={total} />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Centre label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] text-data-secondary uppercase tracking-wide">Total</span>
          <span className="text-base font-bold text-gray-900 tabular-nums font-amount">
            {formatNairaCompact(total)}
          </span>
        </div>
      </div>

      {/* Legend list */}
      <div className="flex flex-col gap-1.5">
        {chartSlices.map((entry) => {
          const pct = total > 0 ? ((entry.total / total) * 100).toFixed(1) : '0'
          return (
            <div key={entry.category} className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: stringToColor(entry.category) }}
              />
              <span className="text-xs text-gray-700 flex-1 truncate">
                {truncate(entry.category, 24)}
              </span>
              <span className="text-xs text-data-secondary tabular-nums">{pct}%</span>
              <span className="text-xs font-medium text-gray-800 tabular-nums font-amount">
                {formatNairaCompact(entry.total)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Custom tooltip ─────────────────────────────────────────

interface DonutTooltipProps {
  active?:  boolean
  payload?: { name: string; value: number }[]
  total:    number
}

function DonutTooltip({ active, payload, total }: DonutTooltipProps) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  const pct  = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0'

  return (
    <div className="bg-white border border-surface-border rounded-card shadow-card px-3 py-2 text-xs font-sans">
      <p className="font-semibold text-gray-800 mb-0.5">{item.name}</p>
      <p className="text-data-secondary">{formatNaira(item.value)} · {pct}%</p>
    </div>
  )
}
