import {
  AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useThemeStore } from '../../store/themeStore'
import type { DailyLog } from '../../types'

interface Props {
  logs: DailyLog[]  // desc order (newest first)
}

export default function ConditionChart({ logs }: Props) {
  const { isDark } = useThemeStore()

  if (logs.length < 3) return null

  const data = [...logs]
    .reverse()
    .slice(-30)
    .map(l => {
      const [, m, d] = l.date.split('-')
      return {
        label: `${parseInt(m)}/${parseInt(d)}`,
        condition: l.condition ?? null,
        sleep: l.sleep ?? null,
        duration: l.duration ?? null,
      }
    })

  const hasSleep = data.some(d => d.sleep !== null)
  const hasDuration = data.some(d => d.duration !== null)

  const tickColor = isDark ? '#9ca3af' : '#6b7280'
  const tooltipStyle = {
    backgroundColor: isDark ? '#1f2937' : '#ffffff',
    border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
    borderRadius: 8,
    fontSize: 11,
  }
  const tickProps = { fill: tickColor, fontSize: 9 }

  return (
    <div className="card p-4 space-y-4">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">컨디션 추이</p>

      {/* Condition */}
      <div>
        <p className="text-xs text-gray-400 mb-1">컨디션</p>
        <ResponsiveContainer width="100%" height={100}>
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
            <defs>
              <linearGradient id="condGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" tick={tickProps} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={tickProps} tickLine={false} axisLine={false} width={16} />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v: any) => [`${'★'.repeat(v)}${'☆'.repeat(5 - v)}`, '컨디션']}
            />
            <Area
              type="monotone"
              dataKey="condition"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#condGrad)"
              dot={{ r: 2, fill: '#6366f1', strokeWidth: 0 }}
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Sleep */}
      {hasSleep && (
        <div>
          <p className="text-xs text-gray-400 mb-1">수면 (h)</p>
          <ResponsiveContainer width="100%" height={70}>
            <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
              <XAxis dataKey="label" tick={tickProps} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis domain={[0, 12]} ticks={[0, 4, 8, 12]} tick={tickProps} tickLine={false} axisLine={false} width={16} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v}h`, '수면']} />
              <Bar dataKey="sleep" fill="#10b981" radius={[2, 2, 0, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Duration */}
      {hasDuration && (
        <div>
          <p className="text-xs text-gray-400 mb-1">운동 시간 (분)</p>
          <ResponsiveContainer width="100%" height={70}>
            <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
              <XAxis dataKey="label" tick={tickProps} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={tickProps} tickLine={false} axisLine={false} width={24} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v}분`, '운동']} />
              <Bar dataKey="duration" fill="#3b82f6" radius={[2, 2, 0, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
