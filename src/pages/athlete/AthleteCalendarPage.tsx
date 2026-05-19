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
        const s: CalendarStamp[] = snap.docs.map(d => {
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
    return <div className="card h-80 animate-pulse" />
  }

  return (
    <div className="space-y-4">
      <StampCalendar
        stamps={stamps}
        onDateClick={handleDateClick}
        selectedDate={todayYMD()}
      />

      <div className="card p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          날짜를 클릭하면 해당 날의 훈련일지를 확인하거나 작성할 수 있어요.
        </p>
      </div>
    </div>
  )
}
