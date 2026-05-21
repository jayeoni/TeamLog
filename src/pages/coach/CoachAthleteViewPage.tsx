import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  collection, query, where, getDocs, getDoc, orderBy, limit, updateDoc, doc,
} from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuthStore } from '../../store/authStore'
import { formatKoreanDate, weekStartYMD, monthStartYMD, todayYMD } from '../../utils/dateUtils'
import ConditionStars from '../../components/shared/ConditionStars'
import PainBadge from '../../components/shared/PainBadge'
import StampCalendar from '../../components/shared/StampCalendar'
import ConditionChart from '../../components/shared/ConditionChart'
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
        const athleteSnap = await getDoc(doc(db, 'users', athleteId))
        if (athleteSnap.exists()) {
          setAthlete({ id: athleteSnap.id, ...athleteSnap.data() } as AppUser)
        }

        try {
          if (!user.teamId) return
          const logSnap = await getDocs(query(
            collection(db, 'dailyLogs'),
            where('athleteId', '==', athleteId),
            where('teamId', '==', user.teamId),
            orderBy('date', 'desc'),
            limit(60)
          ))
          const l = logSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as DailyLog[]
          setLogs(l)
          setStamps(l.map((log) => ({
            date: log.date,
            hasLog: true,
            hasFeedback: !!log.coachFeedback,
            hasPain: !!log.painArea?.trim(),
            condition: log.condition ?? null,
          })))
          const fb: Record<string, string> = {}
          l.forEach((log) => { if (log.coachFeedback) fb[log.id] = log.coachFeedback })
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
      setLogs((prev) => prev.map((l) => (l.id === logId ? { ...l, coachFeedback: fb } : l)))
    } finally {
      setSavingFeedback(null)
    }
  }

  const handleCalendarClick = (ymd: string) => {
    const log = logs.find((l) => l.date === ymd)
    if (log) setExpanded((prev) => (prev === log.id ? null : log.id))
  }

  const today = todayYMD()
  const weekStart = weekStartYMD()
  const monthStart = monthStartYMD()
  const daysElapsed = new Date().getDate()
  const weekLogCount = logs.filter((l) => l.date >= weekStart && l.date <= today).length
  const monthLogCount = logs.filter((l) => l.date >= monthStart && l.date <= today).length
  const weekPct = Math.round((weekLogCount / 7) * 100)
  const monthPct = Math.round((monthLogCount / daysElapsed) * 100)

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => <div key={i} className="card h-32 animate-pulse" />)}
      </div>
    )
  }

  if (!athlete) {
    return (
      <div className="card p-10 text-center">
        <p className="font-mono text-[11px] text-[var(--color-pulse-sub)]">// 선수를 찾을 수 없습니다</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button onClick={() => navigate('/coach')} className="btn-ghost !p-1.5 -ml-1">
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-[3px] border hairline-strong bg-[var(--color-pulse-hover)] flex items-center justify-center font-mono text-sm font-semibold text-[var(--color-pulse-ink)]">
            {athlete.name?.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="kicker">$ athlete.view --id={athlete.id.slice(0, 8)}</div>
            <h2 className="font-mono text-base font-semibold tracking-tight text-[var(--color-pulse-ink)] truncate">{athlete.name}</h2>
            <p className="font-mono text-[10px] text-[var(--color-pulse-sub)]">{athlete.specialty || athlete.sport}</p>
          </div>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-3 gap-2">
        <Kpi label="total.logs" value={logs.length} />
        <Kpi label="feedback"   value={logs.filter((l) => l.coachFeedback).length} tone="ok" />
        <Kpi label="pain.days"  value={logs.filter((l) => l.painArea?.trim()).length} tone="warn" />
      </div>

      {/* Record rates */}
      <div className="card p-4 space-y-3">
        <span className="label !mb-0">record.rate</span>
        <RateBar label="week"  value={weekLogCount}  total={7}            pct={weekPct}  tone="accent" />
        <RateBar label="month" value={monthLogCount} total={daysElapsed}  pct={monthPct} tone="ok" />
      </div>

      {/* Trend */}
      <ConditionChart logs={logs} />

      {/* Calendar */}
      <StampCalendar stamps={stamps} onDateClick={handleCalendarClick} />

      {/* Log list */}
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="label !mb-0">log.history</span>
          <span className="font-mono text-[10px] text-[var(--color-pulse-sub)]">{logs.length} entries</span>
        </div>

        {logs.length === 0 && (
          <div className="card p-8 text-center">
            <p className="font-mono text-[11px] text-[var(--color-pulse-sub)]">// 작성된 일지가 없습니다</p>
          </div>
        )}

        <div className="space-y-2">
          {logs.map((log) => {
            const isExpanded = expanded === log.id
            return (
              <div key={log.id} className="card overflow-hidden">
                <button
                  onClick={() => setExpanded(isExpanded ? null : log.id)}
                  className="w-full flex items-center justify-between p-3.5 hover:bg-[var(--color-pulse-hover)] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        log.painArea?.trim() ? 'bg-[var(--color-pulse-warn)]' : 'bg-[var(--color-pulse-ok)]'
                      }`}
                    />
                    <div className="text-left">
                      <p className="font-mono text-[11px] text-[var(--color-pulse-sub)]">{log.date}</p>
                      <p className="text-sm text-[var(--color-pulse-ink)]">{formatKoreanDate(log.date)}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <ConditionStars value={log.condition} size="sm" />
                        <PainBadge painArea={log.painArea} />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {log.coachFeedback && <span className="badge-green">피드백 완료</span>}
                    {isExpanded
                      ? <ChevronUp size={14} className="text-[var(--color-pulse-sub)]" />
                      : <ChevronDown size={14} className="text-[var(--color-pulse-sub)]" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t hairline pt-3 space-y-3 bg-[var(--color-pulse-panel2)]">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-[11px]">
                      {log.startTime && <Meta k="start" v={log.startTime} />}
                      {log.duration != null && <Meta k="duration" v={`${log.duration}min`} />}
                      {log.sleep != null && <Meta k="sleep" v={`${log.sleep}h`} />}
                      {log.weight != null && <Meta k="weight" v={`${log.weight}kg`} />}
                    </div>
                    {log.goal && <Field code="01" label="goal">{log.goal}</Field>}
                    {log.training && <Field code="02" label="training"><span className="whitespace-pre-wrap">{log.training}</span></Field>}
                    {log.selfReview && <Field code="06" label="self.review">{log.selfReview}</Field>}

                    {/* Feedback */}
                    <div className="pt-2 border-t hairline">
                      <div className="font-mono text-[10px] text-[var(--color-pulse-sub)] mb-2">
                        <span className="text-[var(--color-pulse-sub2)]">[fb]</span> coach.feedback
                        {log.coachFeedback && <span className="ml-2 text-[var(--color-pulse-ok)]">✓ sent</span>}
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
        </div>
      </div>
    </div>
  )
}

function Kpi({ label, value, tone }: { label: string; value: number; tone?: 'ok' | 'warn' }) {
  const c = tone === 'ok' ? 'text-[var(--color-pulse-ok)]'
          : tone === 'warn' ? 'text-[var(--color-pulse-warn)]'
          : 'text-[var(--color-pulse-ink)]'
  return (
    <div className="card p-3">
      <span className="label !mb-0">{label}</span>
      <div className={`mt-1 font-mono text-xl font-semibold tabular-nums ${c}`}>{value}</div>
    </div>
  )
}

function RateBar({
  label, value, total, pct, tone,
}: { label: string; value: number; total: number; pct: number; tone: 'accent' | 'ok' }) {
  const fill = tone === 'accent' ? 'bg-[var(--color-pulse-accent)]' : 'bg-[var(--color-pulse-ok)]'
  return (
    <div>
      <div className="flex justify-between font-mono text-[11px] mb-1.5">
        <span className="text-[var(--color-pulse-sub)]">{label}</span>
        <span className="text-[var(--color-pulse-ink)]">
          {value}/{total}일 · <span className="text-[var(--color-pulse-accent)]">{pct}%</span>
        </span>
      </div>
      <div className="h-1.5 bg-[var(--color-pulse-hover)] border hairline rounded-[2px] overflow-hidden">
        <div className={`h-full ${fill}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
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

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="font-mono text-[11px] text-[var(--color-pulse-sub2)]">{k}</div>
      <div className="font-mono text-sm text-[var(--color-pulse-ink)] mt-0.5">{v}</div>
    </div>
  )
}
