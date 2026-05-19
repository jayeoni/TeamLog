import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuthStore } from '../../store/authStore'
import { todayYMD, formatKoreanDate } from '../../utils/dateUtils'
import ConditionStars from '../../components/shared/ConditionStars'
import PainBadge from '../../components/shared/PainBadge'
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Send } from 'lucide-react'
import type { AppUser, DailyLog } from '../../types'

export default function CoachDateViewPage() {
  const { date } = useParams<{ date: string }>()
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const ymd = date ?? todayYMD()
  const [athletes, setAthletes] = useState<AppUser[]>([])
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({})
  const [savingFeedback, setSavingFeedback] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.teamId) { setLoading(false); return }

    const fetchData = async () => {
      try {
        const [athleteSnap, logSnap] = await Promise.all([
          getDocs(query(
            collection(db, 'users'),
            where('teamId', '==', user.teamId),
            where('role', '==', 'athlete')
          )),
          getDocs(query(
            collection(db, 'dailyLogs'),
            where('teamId', '==', user.teamId),
            where('date', '==', ymd)
          )),
        ])
        const a = athleteSnap.docs.map(d => ({ id: d.id, ...d.data() })) as AppUser[]
        const l = logSnap.docs.map(d => ({ id: d.id, ...d.data() })) as DailyLog[]
        setAthletes(a)
        setLogs(l)
        const fb: Record<string, string> = {}
        l.forEach(log => { if (log.coachFeedback) fb[log.id] = log.coachFeedback })
        setFeedbacks(fb)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, ymd])

  const navigate2 = (dir: -1 | 1) => {
    const d = new Date(ymd)
    d.setDate(d.getDate() + dir)
    navigate(`/coach/date/${d.toISOString().slice(0, 10)}`)
  }

  const logMap = Object.fromEntries(logs.map(l => [l.athleteId, l]))

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

  if (loading) {
    return <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="card h-20 animate-pulse" />)}</div>
  }

  return (
    <div className="space-y-4">
      {/* Date nav */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2">
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <p className="font-semibold text-gray-900 dark:text-white">{formatKoreanDate(ymd)}</p>
          <p className="text-xs text-gray-400">{logs.length}/{athletes.length}명 작성</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => navigate2(-1)} className="btn-ghost p-2">
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => navigate2(1)}
            disabled={ymd >= todayYMD()}
            className="btn-ghost p-2 disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Athlete cards */}
      {athletes.map(athlete => {
        const log = logMap[athlete.id]
        const isExpanded = expanded === athlete.id

        return (
          <div key={athlete.id} className="card overflow-hidden">
            {/* Summary row */}
            <button
              onClick={() => setExpanded(isExpanded ? null : athlete.id)}
              className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                  {athlete.name?.charAt(0)}
                </span>
              </div>

              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{athlete.name}</span>
                  {log ? (
                    <span className="badge-green">작성 완료</span>
                  ) : (
                    <span className="badge-gray">미작성</span>
                  )}
                  {log?.coachFeedback && <span className="badge-blue">피드백 완료</span>}
                </div>
                {log && (
                  <div className="flex items-center gap-3 mt-1">
                    <ConditionStars value={log.condition} size="sm" />
                    {log.sleep !== null && log.sleep !== undefined && (
                      <span className="text-xs text-gray-400">수면 {log.sleep}h</span>
                    )}
                    {log.weight !== null && log.weight !== undefined && (
                      <span className="text-xs text-gray-400">체중 {log.weight}kg</span>
                    )}
                    <PainBadge painArea={log.painArea} />
                  </div>
                )}
              </div>

              {log && (isExpanded ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />)}
            </button>

            {/* Expanded detail */}
            {log && isExpanded && (
              <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800 pt-3 space-y-3">
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

                {/* Feedback input */}
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

      {athletes.length === 0 && (
        <div className="card p-8 text-center">
          <p className="text-sm text-gray-400">팀에 선수가 없습니다.</p>
        </div>
      )}
    </div>
  )
}
