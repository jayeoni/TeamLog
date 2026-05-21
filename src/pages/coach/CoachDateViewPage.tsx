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
        const a = athleteSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as AppUser[]
        const l = logSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as DailyLog[]
        setAthletes(a)
        setLogs(l)
        const fb: Record<string, string> = {}
        l.forEach((log) => { if (log.coachFeedback) fb[log.id] = log.coachFeedback })
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

  const logMap = Object.fromEntries(logs.map((l) => [l.athleteId, l]))

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
      setLogs((prev) => prev.map((l) => (l.id === logId ? { ...l, coachFeedback: fb } : l)))
    } finally {
      setSavingFeedback(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => <div key={i} className="card h-20 animate-pulse" />)}
      </div>
    )
  }

  const painCount = logs.filter((l) => l.painArea?.trim()).length
  const feedbackCount = logs.filter((l) => l.coachFeedback).length

  return (
    <div className="space-y-4">
      {/* Date nav */}
      <div className="card p-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-ghost !p-1.5">
          <ChevronLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="kicker">$ date.view --ymd={ymd}</div>
          <div className="font-mono text-base font-semibold tracking-tight text-[var(--color-pulse-ink)]">
            {formatKoreanDate(ymd)}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => navigate2(-1)} className="btn-outline !py-1 !px-2 !text-[10px]">
            <ChevronLeft size={12} /> prev
          </button>
          <button
            onClick={() => navigate2(1)}
            disabled={ymd >= todayYMD()}
            className="btn-outline !py-1 !px-2 !text-[10px] disabled:opacity-30"
          >
            next <ChevronRight size={12} />
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {[
          { k: 'total',    v: athletes.length,                                  tone: 'text-[var(--color-pulse-ink)]' },
          { k: 'logged',   v: logs.length,                                      tone: 'text-[var(--color-pulse-ok)]' },
          { k: 'missing',  v: Math.max(0, athletes.length - logs.length),        tone: 'text-[var(--color-pulse-warn)]' },
          { k: 'pain',     v: painCount,                                         tone: 'text-[var(--color-pulse-warn)]' },
          { k: 'feedback', v: `${feedbackCount}/${logs.length || 0}`,            tone: 'text-[var(--color-pulse-cool)]' },
        ].map(({ k, v, tone }) => (
          <div key={k} className="card p-2.5 flex items-baseline gap-2">
            <span className="label !mb-0">{k}</span>
            <span className={`ml-auto font-mono text-base font-semibold tabular-nums ${tone}`}>{v}</span>
          </div>
        ))}
      </div>

      {/* Athlete cards */}
      {athletes.map((athlete) => {
        const log = logMap[athlete.id]
        const isExpanded = expanded === athlete.id
        return (
          <div key={athlete.id} className="card overflow-hidden">
            <button
              onClick={() => log && setExpanded(isExpanded ? null : athlete.id)}
              className="w-full flex items-center gap-3 p-3.5 hover:bg-[var(--color-pulse-hover)] transition-colors"
            >
              <div className="w-8 h-8 rounded-[3px] border hairline-strong bg-[var(--color-pulse-hover)] flex items-center justify-center font-mono text-xs font-semibold text-[var(--color-pulse-ink)] flex-shrink-0">
                {athlete.name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[var(--color-pulse-ink)]">{athlete.name}</span>
                  {!log ? <span className="badge-gray">미작성</span>
                    : log.coachFeedback ? <span className="badge-green">피드백 완료</span>
                    : <span className="badge-blue">피드백 대기</span>}
                </div>
                {log && (
                  <div className="flex items-center gap-3 mt-1.5">
                    <ConditionStars value={log.condition} size="sm" />
                    {log.sleep != null && (
                      <span className="font-mono text-[10px] text-[var(--color-pulse-sub)]">sleep={log.sleep}h</span>
                    )}
                    {log.weight != null && (
                      <span className="font-mono text-[10px] text-[var(--color-pulse-sub)]">weight={log.weight}kg</span>
                    )}
                    <PainBadge painArea={log.painArea} />
                  </div>
                )}
              </div>
              {log && (isExpanded
                ? <ChevronUp size={14} className="text-[var(--color-pulse-sub)] flex-shrink-0" />
                : <ChevronDown size={14} className="text-[var(--color-pulse-sub)] flex-shrink-0" />)}
            </button>

            {log && isExpanded && (
              <div className="px-4 pb-4 border-t hairline pt-3 space-y-3 bg-[var(--color-pulse-panel2)]">
                {log.goal && <Field code="01" label="goal">{log.goal}</Field>}
                {log.training && <Field code="02" label="training"><span className="whitespace-pre-wrap">{log.training}</span></Field>}
                {log.selfReview && <Field code="06" label="self.review">{log.selfReview}</Field>}

                {/* Feedback */}
                <div className="pt-2 border-t hairline">
                  <div className="font-mono text-[10px] text-[var(--color-pulse-sub)] mb-2">
                    <span className="text-[var(--color-pulse-sub2)]">[fb]</span> coach.feedback
                    {log.coachFeedback && (
                      <span className="ml-2 text-[var(--color-pulse-ok)]">✓ sent</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <textarea
                      value={feedbacks[log.id] ?? ''}
                      onChange={(e) => setFeedbacks((prev) => ({ ...prev, [log.id]: e.target.value }))}
                      className="input-field min-h-[60px] resize-none flex-1 text-sm"
                      placeholder="피드백을 입력하세요..."
                    />
                    <button
                      onClick={() => saveFeedback(log.id)}
                      disabled={savingFeedback === log.id || !feedbacks[log.id]?.trim()}
                      className="btn-primary self-end"
                    >
                      <Send size={12} />
                      {savingFeedback === log.id ? '...' : 'send()'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {athletes.length === 0 && (
        <div className="card p-10 text-center">
          <p className="font-mono text-[11px] text-[var(--color-pulse-sub)]">// 팀에 선수가 없습니다</p>
        </div>
      )}
    </div>
  )
}

function Field({ code, label, children }: { code: string; label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 items-start">
      <div className="label !mb-0">
        <span className="text-[var(--color-pulse-sub2)] mr-1">[{code}]</span>{label}
      </div>
      <div className="text-sm text-[var(--color-pulse-ink)] leading-relaxed min-w-0">{children}</div>
    </div>
  )
}
