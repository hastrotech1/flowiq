import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { formatNairaCompact, formatNaira } from '@/lib/utils'
import type { MonthlyAggregate } from '@/types'

// ════════════════════════════════════════════════════════════
// MONTHLY BAR CHART — grouped bars: debits vs credits per month
// ════════════════════════════════════════════════════════════

interface MonthlyBarChartProps {
  data:    MonthlyAggregate[]
  height?: number
}

/**
 * Grouped bar chart showing monthly debits (red) vs credits (green).
 * Each month gets two side-by-side bars.
 * Used on the Dashboard and Reports pages.
 */
export default function MonthlyBarChart({ data, height = 220 }: MonthlyBarChartProps) {
  const chartData = data.map((m) => ({
    label:   m.label,
    Spent:   m.totalDebits,
    Received: m.totalCredits,
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={chartData}
        margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
        barCategoryGap="30%"
        barGap={3}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />

        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: '#94A3B8', fontFamily: 'Poppins, sans-serif' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => formatNairaCompact(v)}
          tick={{ fontSize: 10, fill: '#94A3B8', fontFamily: 'Poppins, sans-serif' }}
          axisLine={false}
          tickLine={false}
          width={56}
        />

        <Tooltip content={<MonthlyTooltip />} />

        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, fontFamily: 'Poppins, sans-serif', paddingTop: 8 }}
        />

        {/* Debits — red (money out) */}
        <Bar dataKey="Spent"    fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={32} />
        {/* Credits — green (money in) */}
        <Bar dataKey="Received" fill="#00C27A" radius={[4, 4, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Custom tooltip ────────────────────────────────────────

interface TooltipPayload {
  name:  string
  value: number
  fill:  string
}

interface CustomTooltipProps {
  active?:  boolean
  payload?: TooltipPayload[]
  label?:   string
}

function MonthlyTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null

  return (
    <div className="bg-white border border-surface-border rounded-card shadow-card px-3 py-2.5 text-xs font-sans">
      <p className="font-semibold text-gray-700 mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.fill }} />
          <span className="text-data-secondary">{p.name}:</span>
          <span className="font-medium text-gray-800 tabular-nums">
            {formatNaira(p.value)}
          </span>
        </div>
      ))}
    </div>
  )
}
