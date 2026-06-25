import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { formatNairaCompact, formatNaira, formatDateShort } from '@/lib/utils'
import type { DailyAggregate } from '@/types'

// ════════════════════════════════════════════════════════════
// SPEND TREND CHART — area chart of daily debits over time
// ════════════════════════════════════════════════════════════

interface SpendTrendChartProps {
  data:    DailyAggregate[]
  height?: number
}

/**
 * Daily spend trend — filled area chart.
 * X-axis: dates. Y-axis: total debits per day.
 * Uses the brand green for the area fill with a gradient.
 * Tooltip shows exact Naira amount on hover.
 */
export default function SpendTrendChart({ data, height = 220 }: SpendTrendChartProps) {
  // Map DailyAggregate to chart-friendly shape
  const chartData = data.map((d) => ({
    date:    d.date,
    label:   formatDateShort(new Date(d.date)),
    debits:  d.totalDebits,
    credits: d.totalCredits,
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        {/* Gradient fill definitions */}
        <defs>
          <linearGradient id="debitGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#00A86B" stopOpacity={0.18} />
            <stop offset="95%" stopColor="#00A86B" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="creditGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#00C27A" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#00C27A" stopOpacity={0.02} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />

        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: '#94A3B8', fontFamily: 'Poppins, sans-serif' }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tickFormatter={(v) => formatNairaCompact(v)}
          tick={{ fontSize: 10, fill: '#94A3B8', fontFamily: 'Poppins, sans-serif' }}
          axisLine={false}
          tickLine={false}
          width={56}
        />

        <Tooltip content={<SpendTooltip />} />

        {/* Debit area (money out) */}
        <Area
          type="monotone"
          dataKey="debits"
          name="Spent"
          stroke="#EF4444"
          strokeWidth={2}
          fill="url(#debitGrad)"
          dot={false}
          activeDot={{ r: 4, fill: '#EF4444', strokeWidth: 0 }}
        />

        {/* Credit area (money in) */}
        <Area
          type="monotone"
          dataKey="credits"
          name="Received"
          stroke="#00C27A"
          strokeWidth={2}
          fill="url(#creditGrad)"
          dot={false}
          activeDot={{ r: 4, fill: '#00C27A', strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ── Custom tooltip ────────────────────────────────────────

interface TooltipPayload {
  name:  string
  value: number
  color: string
}

interface CustomTooltipProps {
  active?:  boolean
  payload?: TooltipPayload[]
  label?:   string
}

/**
 * Custom tooltip shown on chart hover.
 * Displays date + formatted Naira amounts for debits and credits.
 */
function SpendTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null

  return (
    <div className="bg-white border border-surface-border rounded-card shadow-card px-3 py-2.5 text-xs font-sans">
      <p className="font-semibold text-gray-700 mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: p.color }}
          />
          <span className="text-data-secondary">{p.name}:</span>
          <span className="font-medium text-gray-800 tabular-nums">
            {formatNaira(p.value)}
          </span>
        </div>
      ))}
    </div>
  )
}
