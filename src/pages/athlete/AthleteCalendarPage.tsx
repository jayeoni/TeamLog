import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuthStore } from '../../store/authStore'
import { todayYMD } from '../../utils/dateUtils'
import StampCalendar from '../../components/shared/StampCalendar'
import type { CalendarStamp } from '../../types'

export default function AthleteCalendarPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [stamps, setStamps] = useState<CalendarStamp[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const fetchStamps = async () => {
      try {
        const q = query(collection(db, 'dailyLogs'), where('athleteId', '==', user.id))
        const snap = await getDocs(q)
        const s: CalendarStamp[] = snap.docs.map((d) => {
          const data = d.data()
          return {
            date: data.date,
            hasLog: true,
            hasFeedback: !!data.coachFeedback,
            hasPain: !!data.painArea?.trim(),
            condition: data.condition ?? null,
          }
        })
        setStamps(s)
      } finally {
        setLoading(false)
      }
    }
    fetchStamps()
  }, [user])

  const handleDateClick = (ymd: string) => {
    navigate(`/athlete/log/${ymd}`)
  }

  if (loading) {
    return <div className="card h-96 animate-pulse" />
  }

  const written = stamps.filter((s) => s.hasLog).length
  const feedback = stamps.filter((s) => s.hasFeedback).length
  const pain = stamps.filter((s) => s.hasPain).length

  return (
    <div className="space-y-4">
      {/* Header strip */}
      <div className="flex items-baseline gap-3 flex-wrap">
        <span className="kicker">$ calendar.view --athlete={user?.name}</span>
        <span className="kicker-muted">// 셀을 클릭해 해당 날의 일지를 엽니다</span>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { k: 'logged',   v: written,  tone: 'text-[var(--color-pulse-ink)]' },
          { k: 'feedback', v: feedback, tone: 'text-[var(--color-pulse-cool)]' },
          { k: 'pain',     v: pain,     tone: 'text-[var(--color-pulse-warn)]' },
        ].map(({ k, v, tone }) => (
          <div key={k} className="card p-3">
            <span className="label !mb-0">{k}</span>
            <div className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${tone}`}>{v}</div>
          </div>
        ))}
      </div>

      <StampCalendar stamps={stamps} onDateClick={handleDateClick} selectedDate={todayYMD()} />
    </div>
  )
}
