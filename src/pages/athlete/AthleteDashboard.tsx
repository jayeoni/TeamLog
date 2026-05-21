import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs, orderBy, limit, doc, setDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuthStore } from '../../store/authStore'
import {
  todayYMD,
  formatKoreanDate,
  formatShortDate,
  weekStartYMD,
  monthStartYMD,
  daysInCurrentMonth,
} from '../../utils/dateUtils'
import ConditionStars from '../../components/shared/ConditionStars'
import PainBadge from '../../components/shared/PainBadge'
import ConditionChart from '../../components/shared/ConditionChart'
import { PlusCircle, Calendar, MessageSquare } from 'lucide-react'
import type { DailyLog } from '../../types'

export default function AthleteDashboard() {
  const { user, setUser } = useAuthStore()
  const navigate = useNavigate()
  const today = todayYMD()

  const [todayLog, setTodayLog] = useState<DailyLog | null | undefined>(undefined)
  const [recentLogs, setRecentLogs] = useState<DailyLog[]>([])
  const [chartLogs, setChartLogs] = useState<DailyLog[]>([])
  const [streak, setStreak] = useState(0)
  const [weekCount, setWeekCount] = useState(0)
  const [monthCount, setMonthCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const [joinCode, setJoinCode] = useState('')
  const [joinLoading, setJoinLoading] = useState(false)
  const [joinError, setJoinError] = useState('')

  useEffect(() => {
    if (!user) return

    const fetchData = async () => {
      try {
        const logsRef = collection(db, 'dailyLogs')
        const q = query(
          logsRef,
          where('athleteId', '==', user.id),
          orderBy('date', 'desc'),
          limit(62)
        )
        const snap = await getDocs(q)
        const logs = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as DailyLog[]

        const tl = logs.find((l) => l.date === today) ?? null
        setTodayLog(tl)
        setRecentLogs(logs.slice(0, 5))
        setChartLogs(logs.slice(0, 30))

        const monStr = weekStartYMD()
        const monStart = monthStartYMD()
        setWeekCount(logs.filter((l) => l.date >= monStr && l.date <= today).length)
        setMonthCount(logs.filter((l) => l.date >= monStart && l.date <= today).length)

        // Streak
        let s = 0
        const d = new Date()
        for (const log of logs) {
          const dStr = d.toISOString().slice(0, 10)
          if (log.date === dStr) {
            s++
            d.setDate(d.getDate() - 1)
          } else break
        }
        setStreak(s)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, today])

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !joinCode.trim()) return
    setJoinLoading(true)
    setJoinError('')
    try {
      const snap = await getDocs(
        query(collection(db, 'teams'), where('code', '==', joinCode.trim().toUpperCase()))
      )
      if (snap.empty) {
        setJoinError('해당 팀 코드를 찾을 수 없습니다.')
        return
      }
      const teamId = snap.docs[0].id
      await setDoc(doc(db, 'users', user.id), { teamId }, { merge: true })
      setUser({ ...user, teamId })
    } catch {
      setJoinError('팀 참가에 실패했습니다.')
    } finally {
      setJoinLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[...Array(3)].map((_, i) => <div key={i} className="card h-24" />)}
      </div>
    )
  }

  const daysElapsed = new Date().getDate()
  const totalDays = daysInCurrentMonth()
  const weekPct = Math.round((weekCount / 7) * 100)
  const monthPct = Math.round((monthCount / daysElapsed) * 100)
  const feedbackCount = recentLogs.filter((l) => l.coachFeedback).length

  return (
    <div className="space-y-4">
      {/* Greeting strip */}
      <div className="flex items-baseline gap-3 flex-wrap">
        <span className="kicker">$ greet --user {user?.name}</span>
        <span className="kicker-muted">// {formatKoreanDate(today)}</span>
        <span className="ml-auto kicker-muted">
          {streak > 0 ? `streak ${streak}d active` : 'no streak'}
        </span>
      </div>

      {/* Join team banner */}
      {!user?.teamId && (
        <form onSubmit={handleJoinTeam} className="card p-4 border-[var(--color-pulse-accent)]">
          <div className="flex items-center justify-between mb-2">
            <span className="label !mb-0">team.join</span>
            <span className="kicker-muted">// 팀 코드로 참가하세요</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="input-field input-mono flex-1"
              placeholder="TEAM-CODE"
              maxLength={6}
            />
            <button type="submit" disabled={joinLoading || !joinCode.trim()} className="btn-primary px-4">
              {joinLoading ? '...' : '$ join()'}
            </button>
          </div>
          {joinError && <p className="font-mono text-[11px] text-[var(--color-pulse-warn)] mt-2">{joinError}</p>}
        </form>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="streak.days"  value={String(streak)} unit="d"  delta="+1 today expected"   deltaTone="ok" />
        <KpiCard label="coach.unread" value={String(feedbackCount)} unit="msg" delta="recent feedback" deltaTone="cool" />
      </div>

      {/* Record rate */}
      <div className="card p-4 space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="label !mb-0">record.rate</span>
          <span className="font-mono text-[11px] text-[var(--color-pulse-sub)]">이번 주 · 이번 달</span>
        </div>
        <RateBar label="week"  value={weekCount}  total={7}           pct={weekPct}  tone="accent" />
        <RateBar label="month" value={monthCount} total={daysElapsed} pct={monthPct} tone="ok" subRight={`총 ${totalDays}일`} />
      </div>

      {/* Condition graph */}
      <ConditionChart logs={chartLogs} />

      {/* Today's log */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-baseline gap-3">
            <span className="label !mb-0">log[{today}]</span>
            <span className="font-mono text-[11px] text-[var(--color-pulse-sub)]">오늘의 훈련일지</span>
          </div>
          <button
            onClick={() => navigate(`/athlete/log/${today}`)}
            className="btn-primary"
          >
            <PlusCircle size={13} />
            {todayLog ? 'edit_log()' : 'create_log()'}
          </button>
        </div>

        {todayLog ? (
          <div className="space-y-3">
            <ConditionStars value={todayLog.condition} size="sm" />
            {todayLog.goal && (
              <FieldRow code="01" label="goal">{todayLog.goal}</FieldRow>
            )}
            {todayLog.training && (
              <FieldRow code="02" label="training">
                <span className="line-clamp-2">{todayLog.training}</span>
              </FieldRow>
            )}
            <div className="flex items-center gap-3 font-mono text-[11px] text-[var(--color-pulse-sub)] flex-wrap pt-2 border-t hairline">
              {todayLog.sleep != null && <span>sleep=<span className="text-[var(--color-pulse-ink)]">{todayLog.sleep}h</span></span>}
              {todayLog.weight != null && <span>weight=<span className="text-[var(--color-pulse-ink)]">{todayLog.weight}kg</span></span>}
              {todayLog.duration != null && <span>duration=<span className="text-[var(--color-pulse-ink)]">{todayLog.duration}min</span></span>}
              <PainBadge painArea={todayLog.painArea} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center py-6 text-center border border-dashed hairline-strong rounded-[3px]">
            <Calendar size={24} className="text-[var(--color-pulse-sub2)] mb-2" />
            <p className="font-mono text-[11px] text-[var(--color-pulse-sub)]">// 오늘 일지를 아직 작성하지 않았어요</p>
          </div>
        )}
      </div>

      {/* Coach feedback */}
      {recentLogs.some((l) => l.coachFeedback) && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="label !mb-0">coach.inbox</span>
            <span className="badge-accent">{feedbackCount} unread</span>
          </div>
          <div className="space-y-2">
            {recentLogs
              .filter((l) => l.coachFeedback)
              .slice(0, 3)
              .map((log) => (
                <div key={log.id} className="flex gap-3 py-2 border-t hairline first:border-t-0">
                  <MessageSquare size={13} className="text-[var(--color-pulse-cool)] mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] text-[var(--color-pulse-sub)] mb-0.5">
                      coach · {formatShortDate(log.date)}
                    </p>
                    <p className="text-sm text-[var(--color-pulse-ink)] leading-relaxed">{log.coachFeedback}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Recent logs */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="label !mb-0">
            logs.recent <span className="text-[var(--color-pulse-ink)]">limit=5</span>
          </span>
          <button onClick={() => navigate('/athlete/calendar')} className="btn-ghost !text-[11px]">
            view_all() →
          </button>
        </div>

        {recentLogs.length === 0 ? (
          <p className="font-mono text-[11px] text-[var(--color-pulse-sub)] text-center py-6">// 기록이 없습니다</p>
        ) : (
          <div>
            <div className="grid grid-cols-[80px_1fr_auto_auto] gap-3 px-2 pb-2 border-b hairline font-mono text-[10px] text-[var(--color-pulse-sub2)]">
              <span>date</span><span>goal</span><span>cond</span><span>pain</span>
            </div>
            {recentLogs.map((log) => (
              <button
                key={log.id}
                onClick={() => navigate(`/athlete/log/${log.date}`)}
                className="w-full grid grid-cols-[80px_1fr_auto_auto] items-center gap-3 px-2 py-2.5 hover:bg-[var(--color-pulse-hover)] border-b hairline text-left transition-colors"
              >
                <span className="font-mono text-[11px] text-[var(--color-pulse-sub)]">{formatShortDate(log.date)}</span>
                <span className="text-sm text-[var(--color-pulse-ink)] truncate">{log.goal || '—'}</span>
                <ConditionStars value={log.condition} size="sm" />
                <span className="min-w-[20px] text-right">
                  {log.painArea ? <span className="font-mono text-[10px] text-[var(--color-pulse-warn)]">⚠</span> : <span className="font-mono text-[10px] text-[var(--color-pulse-sub2)]">—</span>}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────── helpers ───────

function KpiCard({
  label, value, unit, delta, deltaTone,
}: { label: string; value: string; unit?: string; delta?: string; deltaTone?: 'ok' | 'warn' | 'cool' }) {
  const toneColor =
    deltaTone === 'ok'   ? 'text-[var(--color-pulse-ok)]' :
    deltaTone === 'warn' ? 'text-[var(--color-pulse-warn)]' :
    deltaTone === 'cool' ? 'text-[var(--color-pulse-cool)]' :
    'text-[var(--color-pulse-sub)]'
  return (
    <div className="card p-4">
      <span className="label !mb-0">{label}</span>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span className="font-mono text-3xl font-semibold tracking-tight text-[var(--color-pulse-ink)] tabular-nums">{value}</span>
        {unit && <span className="font-mono text-xs text-[var(--color-pulse-sub)]">{unit}</span>}
      </div>
      {delta && (
        <div className={`font-mono text-[10px] mt-1 ${toneColor}`}>
          {deltaTone === 'ok' ? '▲' : deltaTone === 'warn' ? '▼' : '·'} {delta}
        </div>
      )}
    </div>
  )
}

function RateBar({
  label, value, total, pct, tone, subRight,
}: { label: string; value: number; total: number; pct: number; tone: 'accent' | 'ok'; subRight?: string }) {
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
      {subRight && (
        <p className="font-mono text-[10px] text-[var(--color-pulse-sub2)] mt-1 text-right">// {subRight}</p>
      )}
    </div>
  )
}

function FieldRow({ code, label, children }: { code: string; label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[64px_1fr] gap-3 items-start">
      <div className="font-mono text-[10px] text-[var(--color-pulse-sub)]">
        <span className="text-[var(--color-pulse-sub2)]">[{code}]</span> {label}
      </div>
      <div className="text-sm text-[var(--color-pulse-ink)] leading-relaxed">{children}</div>
    </div>
  )
}
