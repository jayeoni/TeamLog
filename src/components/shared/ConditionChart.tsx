import {
  AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis, Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts'
import { useThemeStore } from '../../store/themeStore'
import type { DailyLog } from '../../types'

interface Props {
  logs: DailyLog[] // desc order (newest first)
}

const ACCENT  = '#C7F23A' // condition
const ACCENT2 = '#5BE0B6' // sleep
const COOL    = '#5BA8FF' // duration

/**
 * PULSE condition / sleep / duration trend. Same recharts stack as before,
 * just re-skinned: chartreuse fill, mono tick labels, terminal-style tooltip.
 */
export default function ConditionChart({ logs }: Props) {
  const { isDark } = useThemeStore()

  if (logs.length < 3) return null

  const data = [...logs]
    .reverse()
    .slice(-30)
    .map((l) => {
      const [, m, d] = l.date.split('-')
      return {
        label: `${parseInt(m)}/${parseInt(d)}`,
        condition: l.condition ?? null,
        sleep: l.sleep ?? null,
        duration: l.duration ?? null,
      }
    })

  const hasSleep = data.some((d) => d.sleep !== null)
  const hasDuration = data.some((d) => d.duration !== null)

  const sub  = isDark ? '#7B8194' : '#6E7382'
  const sub2 = isDark ? '#4F5564' : '#A0A4B0'
  const grid = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(10,11,15,0.06)'
  const panel = isDark ? '#11131A' : '#FFFFFF'
  const line2 = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(10,11,15,0.14)'

  const tooltipStyle = {
    backgroundColor: panel,
    border: `1px solid ${line2}`,
    borderRadius: 4,
    fontSize: 11,
    fontFamily: '"JetBrains Mono", monospace',
    padding: '6px 8px',
  }
  const labelStyle = { color: sub, fontSize: 10 }
  const tickProps = { fill: sub2, fontSize: 9, fontFamily: '"JetBrains Mono", monospace' }

  // Reused panels around each chart
  const ChartHeader = ({ kicker, value, unit }: { kicker: string; value: string; unit?: string }) => (
    <div className="flex items-baseline justify-between mb-1">
      <span className="font-mono text-[10px] text-[var(--color-pulse-sub)]">{kicker}</span>
      <span className="font-mono text-[10px] text-[var(--color-pulse-ink)]">
        {value}
        {unit && <span className="text-[var(--color-pulse-sub)] ml-1">{unit}</span>}
      </span>
    </div>
  )

  // Stats
  const condVals = data.map((d) => d.condition).filter((v): v is number => v != null)
  const condMean = condVals.length ? (condVals.reduce((a, b) => a + b, 0) / condVals.length).toFixed(1) : '—'

  return (
    <div className="card p-4 space-y-4">
      <div className="flex items-baseline justify-between">
        <span className="kicker-muted">trend.30d</span>
        <span className="font-mono text-[11px] text-[var(--color-pulse-sub)]">
          n=<span className="text-[var(--color-pulse-ink)]">{data.length}</span>
        </span>
      </div>

      {/* Condition */}
      <div>
        <ChartHeader kicker="condition" value={`mean=${condMean}`} />
        <ResponsiveContainer width="100%" height={100}>
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
            <defs>
              <linearGradient id="pulseCondGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={ACCENT} stopOpacity={0.35} />
                <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={grid} vertical={false} />
            <XAxis dataKey="label" tick={tickProps} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={tickProps} tickLine={false} axisLine={false} width={16} />
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={labelStyle}
              formatter={(v: number) => [`${v}.0 / 5`, 'condition']}
              cursor={{ stroke: ACCENT, strokeOpacity: 0.4, strokeDasharray: '2 2' }}
            />
            <Area
              type="monotone"
              dataKey="condition"
              stroke={ACCENT}
              strokeWidth={1.6}
              fill="url(#pulseCondGrad)"
              dot={{ r: 1.6, fill: ACCENT, strokeWidth: 0 }}
              activeDot={{ r: 3, fill: ACCENT, stroke: panel, strokeWidth: 1.5 }}
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Sleep */}
      {hasSleep && (
        <div>
          <ChartHeader kicker="sleep" value="h" />
          <ResponsiveContainer width="100%" height={70}>
            <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
              <CartesianGrid stroke={grid} vertical={false} />
              <XAxis dataKey="label" tick={tickProps} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis domain={[0, 12]} ticks={[0, 4, 8, 12]} tick={tickProps} tickLine={false} axisLine={false} width={16} />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={labelStyle}
                formatter={(v: number) => [`${v}h`, 'sleep']}
                cursor={{ fill: ACCENT2, fillOpacity: 0.08 }}
              />
              <Bar dataKey="sleep" fill={ACCENT2} radius={[1, 1, 0, 0]} maxBarSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Duration */}
      {hasDuration && (
        <div>
          <ChartHeader kicker="duration" value="min" />
          <ResponsiveContainer width="100%" height={70}>
            <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
              <CartesianGrid stroke={grid} vertical={false} />
              <XAxis dataKey="label" tick={tickProps} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={tickProps} tickLine={false} axisLine={false} width={24} />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={labelStyle}
                formatter={(v: number) => [`${v}min`, 'duration']}
                cursor={{ fill: COOL, fillOpacity: 0.08 }}
              />
              <Bar dataKey="duration" fill={COOL} radius={[1, 1, 0, 0]} maxBarSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
