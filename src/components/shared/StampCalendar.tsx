import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getCalendarGrid, toYMD, todayYMD } from '../../utils/dateUtils'
import type { CalendarStamp } from '../../types'

interface Props {
  stamps: CalendarStamp[]
  onDateClick: (ymd: string) => void
  selectedDate?: string
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

export default function StampCalendar({ stamps, onDateClick, selectedDate }: Props) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const grid = getCalendarGrid(year, month)
  const stampMap = Object.fromEntries(stamps.map((s) => [s.date, s]))
  const todayStr = todayYMD()

  const prev = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  const next = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  return (
    <div className="card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prev} className="btn-ghost p-2">
          <ChevronLeft size={16} />
        </button>
        <span className="font-semibold text-gray-900 dark:text-white">
          {year}년 {month + 1}월
        </span>
        <button onClick={next} className="btn-ghost p-2">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((d, i) => (
          <div
            key={d}
            className={`text-center text-xs font-semibold py-1 ${
              i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-400'
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-y-1">
        {grid.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} />
          const ymd = toYMD(date)
          const stamp = stampMap[ymd]
          const isToday = ymd === todayStr
          const isSelected = ymd === selectedDate
          const isFuture = ymd > todayStr
          const dow = date.getDay()

          return (
            <button
              key={ymd}
              onClick={() => !isFuture && onDateClick(ymd)}
              disabled={isFuture}
              className={`
                relative flex flex-col items-center py-1.5 rounded-xl transition-colors duration-100
                ${isFuture ? 'opacity-30 cursor-default' : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800'}
                ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''}
              `}
            >
              <span
                className={`
                  text-sm w-7 h-7 flex items-center justify-center rounded-full font-medium
                  ${isToday ? 'bg-indigo-600 text-white' : ''}
                  ${!isToday && dow === 0 ? 'text-red-500 dark:text-red-400' : ''}
                  ${!isToday && dow === 6 ? 'text-blue-500 dark:text-blue-400' : ''}
                  ${!isToday && dow !== 0 && dow !== 6 ? 'text-gray-700 dark:text-gray-300' : ''}
                `}
              >
                {date.getDate()}
              </span>

              {/* Stamp dots */}
              <div className="flex gap-0.5 mt-0.5 h-2 items-center">
                {stamp?.hasLog && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="일지 작성" />
                )}
                {stamp?.hasFeedback && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" title="코치 피드백" />
                )}
                {stamp?.hasPain && (
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" title="통증/부상" />
                )}
                {!stamp?.hasLog && !isFuture && ymd <= todayStr && (
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" title="미작성" />
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex-wrap">
        {[
          { color: 'bg-emerald-500', label: '작성 완료' },
          { color: 'bg-blue-500', label: '피드백' },
          { color: 'bg-orange-500', label: '통증' },
          { color: 'bg-gray-300 dark:bg-gray-600', label: '미작성' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${color}`} />
            <span className="text-xs text-gray-400">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
