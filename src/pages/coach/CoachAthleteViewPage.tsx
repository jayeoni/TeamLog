import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs, getDoc, orderBy, limit, updateDoc, doc } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuthStore } from '../../store/authStore'
import { formatKoreanDate } from '../../utils/dateUtils'
import ConditionStars from '../../components/shared/ConditionStars'
import PainBadge from '../../components/shared/PainBadge'
import StampCalendar from '../../components/shared/StampCalendar'
import { ChevronLeft, ChevronDown, ChevronUp, Send } from 'lucide-react'
import type { AppUser, DailyLog, CalendarStamp } from '../../types'

export default function CoachAthleteViewPage() {
  const { athleteId } = useParams<{ athleteId: string }>()
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const [athlete, setAthlete] = useState<AppUser | null>(null)
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [stamps, setStamps] = useState<CalendarStamp[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({})
  const [savingFeedback, setSavingFeedback] = useState<string | null>(null)

  useEffect(() => {
    if (!athleteId || !user) return

    const fetchData = async () => {
      try {
        // Fetch athlete first — simple getDoc, no index needed
        const athleteSnap = await getDoc(doc(db, 'users', athleteId))
        if (athleteSnap.exists()) {
          setAthlete({ id: athleteSnap.id, ...athleteSnap.data() } as AppUser)
        }

        // Fetch logs separately so a missing index doesn't hide the athlete
        try {
          const logSnap = await getDocs(query(
            collection(db, 'dailyLogs'),
            where('athleteId', '==', athleteId),
            where('teamId', '==', user.teamId),
            orderBy('date', 'desc'),
            limit(60)
          ))
          const l = logSnap.docs.map(d => ({ id: d.id, ...d.data() })) as DailyLog[]
          setLogs(l)
          setStamps(l.map(log => ({
            date: log.date,
            hasLog: true,
            hasFeedback: !!log.coachFeedback,
            hasPain: !!log.painArea?.trim(),
            condition: log.condition ?? null,
          })))
          const fb: Record<string, string> = {}
          l.forEach(log => { if (log.coachFeedback) fb[log.id] = log.coachFeedback })
          setFeedbacks(fb)
        } catch (logErr: any) {
          console.error('[logs fetch error]', logErr?.code, logErr?.message)
        }
      } catch (err: any) {
        console.error('[athlete fetch error]', err?.code, err?.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [athleteId, user])

  const saveFeedback = async (logId: string) => {
    const fb = feedbacks[logId]?.trim()
    if (!fb || !user) return
    setSavingFeedback(logId)
    try {
      await updateDoc(doc(db, 'dailyLogs', logId), {
        coachFeedback: fb,
        coachFeedbackAt: new Date().toISOString(),
        coachId: user.id,
      })
      setLogs(prev => prev.map(l => l.id === logId ? { ...l, coachFeedback: fb } : l))
    } finally {
      setSavingFeedback(null)
    }
  }

  const handleCalendarClick = (ymd: string) => {
    const log = logs.find(l => l.date === ymd)
    if (log) setExpanded(prev => prev === log.id ? null : log.id)
  }

  if (loading) {
    return <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="card h-32 animate-pulse" />)}</div>
  }

  if (!athlete) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-gray-400">선수를 찾을 수 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button onClick={() => navigate('/coach')} className="btn-ghost p-2 -ml-2">
          <ChevronLeft size={20} />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
            <span className="font-bold text-indigo-600 dark:text-indigo-400">{athlete.name?.charAt(0)}</span>
          </div>
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white">{athlete.name}</h2>
            <p className="text-xs text-gray-400">{athlete.specialty || athlete.sport}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="card p-3 text-center">
          <div className="text-xl font-bold text-gray-900 dark:text-white">{logs.length}</div>
          <div className="text-xs text-gray-400">총 일지</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-xl font-bold text-emerald-500">{logs.filter(l => l.coachFeedback).length}</div>
          <div className="text-xs text-gray-400">피드백</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-xl font-bold text-orange-500">{logs.filter(l => l.painArea?.trim()).length}</div>
          <div className="text-xs text-gray-400">통증 기록</div>
        </div>
      </div>

      {/* Calendar */}
      <StampCalendar
        stamps={stamps}
        onDateClick={handleCalendarClick}
      />

      {/* Log list */}
      <div className="space-y-2">
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm px-1">훈련일지 히스토리</h3>
        {logs.length === 0 && (
          <div className="card p-6 text-center">
            <p className="text-sm text-gray-400">작성된 일지가 없습니다.</p>
          </div>
        )}
        {logs.map(log => {
          const isExpanded = expanded === log.id
          return (
            <div key={log.id} className="card overflow-hidden">
              <button
                onClick={() => setExpanded(isExpanded ? null : log.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${log.painArea?.trim() ? 'bg-orange-500' : 'bg-emerald-500'}`} />
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{formatKoreanDate(log.date)}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <ConditionStars value={log.condition} size="sm" />
                      <PainBadge painArea={log.painArea} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {log.coachFeedback && <span className="badge-blue">피드백 완료</span>}
                  {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800 pt-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {log.startTime && (
                      <div>
                        <span className="text-xs font-semibold text-gray-400 uppercase">시작 시간</span>
                        <p className="text-gray-700 dark:text-gray-300">{log.startTime}</p>
                      </div>
                    )}
                    {log.duration !== null && log.duration !== undefined && (
                      <div>
                        <span className="text-xs font-semibold text-gray-400 uppercase">운동 시간</span>
                        <p className="text-gray-700 dark:text-gray-300">{log.duration}분</p>
                      </div>
                    )}
                    {log.sleep !== null && log.sleep !== undefined && (
                      <div>
                        <span className="text-xs font-semibold text-gray-400 uppercase">수면</span>
                        <p className="text-gray-700 dark:text-gray-300">{log.sleep}h</p>
                      </div>
                    )}
                    {log.weight !== null && log.weight !== undefined && (
                      <div>
                        <span className="text-xs font-semibold text-gray-400 uppercase">체중</span>
                        <p className="text-gray-700 dark:text-gray-300">{log.weight}kg</p>
                      </div>
                    )}
                  </div>
                  {log.goal && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">목표</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{log.goal}</p>
                    </div>
                  )}
                  {log.training && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">훈련 내용</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{log.training}</p>
                    </div>
                  )}
                  {log.selfReview && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">자기 평가</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{log.selfReview}</p>
                    </div>
                  )}

                  {/* Feedback */}
                  <div className="pt-1">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">코치 피드백</p>
                    <div className="flex gap-2">
                      <textarea
                        value={feedbacks[log.id] ?? ''}
                        onChange={e => setFeedbacks(prev => ({ ...prev, [log.id]: e.target.value }))}
                        className="input-field min-h-[60px] resize-none flex-1 text-sm"
                        placeholder="피드백을 입력하세요..."
                      />
                      <button
                        onClick={() => saveFeedback(log.id)}
                        disabled={savingFeedback === log.id || !feedbacks[log.id]?.trim()}
                        className="btn-primary px-3 self-end flex items-center gap-1"
                      >
                        <Send size={14} />
                        {savingFeedback === log.id ? '...' : '전송'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
