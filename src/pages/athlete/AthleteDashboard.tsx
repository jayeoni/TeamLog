import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuthStore } from '../../store/authStore'
import { todayYMD, formatKoreanDate, formatShortDate } from '../../utils/dateUtils'
import ConditionStars from '../../components/shared/ConditionStars'
import PainBadge from '../../components/shared/PainBadge'
import { PlusCircle, Calendar, MessageSquare, TrendingUp, Flame } from 'lucide-react'
import type { DailyLog } from '../../types'

export default function AthleteDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const today = todayYMD()

  const [todayLog, setTodayLog] = useState<DailyLog | null | undefined>(undefined)
  const [recentLogs, setRecentLogs] = useState<DailyLog[]>([])
  const [streak, setStreak] = useState(0)
  const [weekCount, setWeekCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const fetchData = async () => {
      try {
        const logsRef = collection(db, 'dailyLogs')
        const q = query(
          logsRef,
          where('athleteId', '==', user.id),
          orderBy('date', 'desc'),
          limit(30)
        )
        const snap = await getDocs(q)
        const logs = snap.docs.map(d => ({ id: d.id, ...d.data() })) as DailyLog[]

        const tl = logs.find(l => l.date === today) ?? null
        setTodayLog(tl)
        setRecentLogs(logs.slice(0, 5))

        // Week count (Mon–Sun)
        const now = new Date()
        const mon = new Date(now)
        const day = mon.getDay()
        mon.setDate(mon.getDate() - (day === 0 ? 6 : day - 1))
        const monStr = mon.toISOString().slice(0, 10)
        setWeekCount(logs.filter(l => l.date >= monStr && l.date <= today).length)

        // Streak
        let s = 0
        let d = new Date()
        for (const log of logs) {
          const dStr = d.toISOString().slice(0, 10)
          if (log.date === dStr) { s++; d.setDate(d.getDate() - 1) }
          else break
        }
        setStreak(s)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, today])

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card h-24" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Greeting */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          안녕하세요, {user?.name}님
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{formatKoreanDate(today)}</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <Flame size={20} className="mx-auto mb-1 text-orange-500" />
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{streak}</div>
          <div className="text-xs text-gray-400 mt-0.5">연속 기록</div>
        </div>
        <div className="card p-4 text-center">
          <TrendingUp size={20} className="mx-auto mb-1 text-indigo-500" />
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{weekCount}/7</div>
          <div className="text-xs text-gray-400 mt-0.5">이번 주</div>
        </div>
        <div className="card p-4 text-center">
          <MessageSquare size={20} className="mx-auto mb-1 text-emerald-500" />
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {recentLogs.filter(l => l.coachFeedback).length}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">피드백</div>
        </div>
      </div>

      {/* Today's log */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 dark:text-white">오늘의 훈련일지</h3>
          <button
            onClick={() => navigate(`/athlete/log/${today}`)}
            className="btn-primary flex items-center gap-1.5 text-sm px-3 py-2"
          >
            <PlusCircle size={15} />
            {todayLog ? '수정' : '작성'}
          </button>
        </div>

        {todayLog ? (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <ConditionStars value={todayLog.condition} size="sm" />
            </div>
            {todayLog.goal && (
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="text-xs font-semibold text-gray-400 mr-1.5">목표</span>
                {todayLog.goal}
              </p>
            )}
            {todayLog.training && (
              <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                <span className="text-xs font-semibold text-gray-400 mr-1.5">훈련</span>
                {todayLog.training}
              </p>
            )}
            <div className="flex gap-3 text-xs text-gray-400 flex-wrap">
              {todayLog.sleep !== null && todayLog.sleep !== undefined && (
                <span>수면 {todayLog.sleep}h</span>
              )}
              {todayLog.weight !== null && todayLog.weight !== undefined && (
                <span>체중 {todayLog.weight}kg</span>
              )}
              <PainBadge painArea={todayLog.painArea} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center py-4 text-center">
            <Calendar size={32} className="text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-sm text-gray-400">아직 오늘 일지를 작성하지 않았어요.</p>
          </div>
        )}
      </div>

      {/* Coach feedback */}
      {recentLogs.some(l => l.coachFeedback) && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">최근 코치 피드백</h3>
          <div className="space-y-3">
            {recentLogs.filter(l => l.coachFeedback).slice(0, 3).map(log => (
              <div key={log.id} className="flex gap-3">
                <div className="w-1 rounded-full bg-indigo-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-gray-400 mb-0.5">{formatShortDate(log.date)}</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{log.coachFeedback}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent logs */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 dark:text-white">최근 일지</h3>
          <button onClick={() => navigate('/athlete/calendar')} className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
            전체 보기
          </button>
        </div>
        {recentLogs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">기록이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {recentLogs.slice(0, 5).map(log => (
              <button
                key={log.id}
                onClick={() => navigate(`/athlete/log/${log.date}`)}
                className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{formatShortDate(log.date)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ConditionStars value={log.condition} size="sm" />
                  {log.painArea && <PainBadge painArea={log.painArea} />}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
