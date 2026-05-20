import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuthStore } from '../../store/authStore'
import { todayYMD, formatKoreanDate, weekStartYMD } from '../../utils/dateUtils'
import ConditionStars from '../../components/shared/ConditionStars'
import PainBadge from '../../components/shared/PainBadge'
import { Users, AlertTriangle, CalendarDays, ChevronRight, ClipboardList, TrendingUp } from 'lucide-react'
import type { AppUser, DailyLog } from '../../types'

export default function CoachDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const today = todayYMD()

  const [athletes, setAthletes] = useState<AppUser[]>([])
  const [todayLogs, setTodayLogs] = useState<DailyLog[]>([])
  const [weekLogs, setWeekLogs] = useState<DailyLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.teamId) { setLoading(false); return }

    const fetchData = async () => {
      try {
        const [athleteSnap, logSnap, weekSnap] = await Promise.all([
          getDocs(query(
            collection(db, 'users'),
            where('teamId', '==', user.teamId),
            where('role', '==', 'athlete')
          )),
          getDocs(query(
            collection(db, 'dailyLogs'),
            where('teamId', '==', user.teamId),
            where('date', '==', today)
          )),
          getDocs(query(
            collection(db, 'dailyLogs'),
            where('teamId', '==', user.teamId),
            where('date', '>=', weekStartYMD()),
            where('date', '<=', today)
          )),
        ])

        setAthletes(athleteSnap.docs.map(d => ({ id: d.id, ...d.data() })) as AppUser[])
        setTodayLogs(logSnap.docs.map(d => ({ id: d.id, ...d.data() })) as DailyLog[])
        setWeekLogs(weekSnap.docs.map(d => ({ id: d.id, ...d.data() })) as DailyLog[])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, today])

  const logMap = Object.fromEntries(todayLogs.map(l => [l.athleteId, l]))
  const writtenCount = todayLogs.length
  const missingCount = athletes.length - writtenCount
  const painCount = todayLogs.filter(l => l.painArea?.trim()).length
  const pendingFeedback = todayLogs.filter(l => !l.coachFeedback).length
  const weekTotal = athletes.length * 7
  const weekPct = weekTotal > 0 ? Math.round((weekLogs.length / weekTotal) * 100) : 0

  if (loading) {
    return <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="card h-24 animate-pulse" />)}</div>
  }

  if (!user?.teamId) {
    return (
      <div className="card p-8 text-center">
        <Users size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
        <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-1">팀이 없습니다</h3>
        <p className="text-sm text-gray-400 mb-4">팀을 만들어 선수를 초대하세요.</p>
        <button onClick={() => navigate('/coach/team')} className="btn-primary">
          팀 만들기
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Greeting */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          안녕하세요, {user?.name} 코치님
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{formatKoreanDate(today)}</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: '전체 선수', value: athletes.length, icon: Users, color: 'text-indigo-500' },
          { label: '오늘 작성', value: writtenCount, icon: ClipboardList, color: 'text-emerald-500' },
          { label: '미작성', value: missingCount, icon: CalendarDays, color: 'text-gray-400' },
          { label: '통증', value: painCount, icon: AlertTriangle, color: 'text-orange-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-3 text-center">
            <Icon size={18} className={`mx-auto mb-1 ${color}`} />
            <div className="text-xl font-bold text-gray-900 dark:text-white">{value}</div>
            <div className="text-xs text-gray-400 leading-tight mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Team record rate */}
      {athletes.length > 0 && (
        <div className="card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={15} className="text-indigo-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">팀 주간 기록률</h3>
            <span className="ml-auto text-xs text-gray-400">이번 주 {weekLogs.length}/{weekTotal}건</span>
          </div>
          <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${weekPct}%` }} />
          </div>
          <p className="text-right text-xs font-semibold text-indigo-600 dark:text-indigo-400">{weekPct}%</p>
        </div>
      )}

      {/* Quick date navigation */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">날짜별 조회</h3>
          <button
            onClick={() => navigate(`/coach/date/${today}`)}
            className="flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 font-medium"
          >
            오늘 상세 <ChevronRight size={14} />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1">특정 날짜의 팀 전체 일지를 확인합니다.</p>
      </div>

      {/* Today's athlete list */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 dark:text-white">오늘 기록 현황</h3>
          {pendingFeedback > 0 && (
            <span className="badge-orange">{pendingFeedback}명 피드백 대기</span>
          )}
        </div>

        {athletes.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-gray-400">팀에 선수가 없습니다.</p>
            <button onClick={() => navigate('/coach/team')} className="mt-3 text-sm text-indigo-500 font-medium">
              팀 코드 확인하기
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {athletes.map(athlete => {
              const log = logMap[athlete.id]
              return (
                <button
                  key={athlete.id}
                  onClick={() => navigate(`/coach/athlete/${athlete.id}`)}
                  className="w-full flex items-center justify-between py-3 px-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {athlete.name?.charAt(0) ?? '?'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{athlete.name}</p>
                      <p className="text-xs text-gray-400">{athlete.specialty || athlete.sport}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {log ? (
                      <>
                        <ConditionStars value={log.condition} size="sm" />
                        {log.painArea?.trim() && <PainBadge painArea={log.painArea} />}
                        {!log.coachFeedback && (
                          <span className="badge-blue text-xs">피드백 필요</span>
                        )}
                      </>
                    ) : (
                      <span className="badge-gray">미작성</span>
                    )}
                    <ChevronRight size={14} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
