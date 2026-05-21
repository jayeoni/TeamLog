import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuthStore } from '../../store/authStore'
import { toYMD, todayYMD, formatKoreanDate, weekStartYMD, parseYMD } from '../../utils/dateUtils'
import ConditionStars from '../../components/shared/ConditionStars'
import PainBadge from '../../components/shared/PainBadge'
import { Users, ChevronRight } from 'lucide-react'
import type { AppUser, DailyLog } from '../../types'

export default function CoachDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const today = todayYMD()

  const [athletes, setAthletes] = useState<AppUser[]>([])
  const [todayLogs, setTodayLogs] = useState<DailyLog[]>([])
  const [recentLogs, setRecentLogs] = useState<DailyLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.teamId) {
      setLoading(false)
      return
    }

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
            where('date', '>=', toYMD(new Date(Date.now() - 6 * 86400000))),
            where('date', '<=', today)
          )),
        ])

        setAthletes(athleteSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as AppUser[])
        setTodayLogs(logSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as DailyLog[])
        setRecentLogs(weekSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as DailyLog[])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, today])

  const logMap = Object.fromEntries(todayLogs.map((l) => [l.athleteId, l]))
  const writtenCount = todayLogs.length
  const missingCount = athletes.length - writtenCount
  const painCount = todayLogs.filter((l) => l.painArea?.trim()).length
  const pendingFeedback = todayLogs.filter((l) => !l.coachFeedback).length
  const weekStart = weekStartYMD()
  const weekLogs = recentLogs.filter((l) => l.date >= weekStart)
  const weekTotal = athletes.length * 7
  const weekPct = weekTotal > 0 ? Math.round((weekLogs.length / weekTotal) * 100) : 0

  const lastLogMap: Record<string, string> = {}
  recentLogs.forEach((l) => {
    if (!lastLogMap[l.athleteId] || l.date > lastLogMap[l.athleteId]) {
      lastLogMap[l.athleteId] = l.date
    }
  })
  const yesterday = toYMD(new Date(Date.now() - 86400000))
  const missingAthletes = athletes.filter((a) => {
    const last = lastLogMap[a.id]
    return !last || last < yesterday
  })

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => <div key={i} className="card h-24 animate-pulse" />)}
      </div>
    )
  }

  if (!user?.teamId) {
    return (
      <div className="card p-10 text-center">
        <Users size={32} className="mx-auto text-[var(--color-pulse-sub2)] mb-3" />
        <h3 className="font-mono text-sm text-[var(--color-pulse-ink)] mb-1">team.not_found</h3>
        <p className="font-mono text-[11px] text-[var(--color-pulse-sub)] mb-5">
          // 팀을 만들어 선수를 초대하세요
        </p>
        <button onClick={() => navigate('/coach/team')} className="btn-primary">
          $ create_team()
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Greeting strip */}
      <div className="flex items-baseline gap-3 flex-wrap">
        <span className="kicker">$ team.snapshot --date={today}</span>
        <span className="kicker-muted">// {formatKoreanDate(today)} · {user?.name} 코치</span>
        <span className="ml-auto kicker-muted">auto-refresh 30s</span>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="team.size"     value={athletes.length}    unit="ppl" sub="active roster" />
        <Kpi label="logged.today"  value={writtenCount}       unit={`/${athletes.length}`} tone="ok"   sub={athletes.length ? `${Math.round((writtenCount/athletes.length)*100)}% submitted` : ''} />
        <Kpi label="missing.today" value={missingCount}       unit="ppl" tone="warn" sub="needs follow-up" />
        <Kpi label="pain.today"    value={painCount}          unit="ppl" tone="warn" sub="pain reported" />
      </div>

      {/* Missing alert */}
      {missingAthletes.length > 0 && (
        <div className="card p-4" style={{ borderColor: 'color-mix(in oklab, var(--color-pulse-warn) 30%, transparent)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="label !mb-0 !text-[var(--color-pulse-warn)]">missing.alert <span className="text-[var(--color-pulse-sub)]">// 어제 이후 미작성</span></span>
            <span className="font-mono text-[11px] text-[var(--color-pulse-warn)]">{missingAthletes.length} ppl</span>
          </div>
          <div>
            {missingAthletes.map((a) => {
              const last = lastLogMap[a.id]
              const daysAgo = last
                ? Math.round((parseYMD(today).getTime() - parseYMD(last).getTime()) / 86400000)
                : null
              return (
                <button
                  key={a.id}
                  onClick={() => navigate(`/coach/athlete/${a.id}`)}
                  className="w-full flex items-center gap-3 py-2 border-t hairline hover:bg-[var(--color-pulse-hover)] transition-colors text-left first:border-t-0"
                >
                  <Avatar initial={a.name?.charAt(0) ?? '?'} />
                  <span className="text-sm text-[var(--color-pulse-ink)]">{a.name}</span>
                  <span className="font-mono text-[10px] text-[var(--color-pulse-sub)]">{a.specialty || a.sport}</span>
                  <span className="ml-auto font-mono text-[11px] text-[var(--color-pulse-warn)]">
                    {daysAgo !== null ? `${daysAgo}d ago` : 'no record'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Week record rate */}
      {athletes.length > 0 && (
        <div className="card p-4">
          <div className="flex items-baseline justify-between mb-3">
            <span className="label !mb-0">team.week.rate</span>
            <span className="font-mono text-[11px] text-[var(--color-pulse-ink)]">
              {weekLogs.length}/{weekTotal} <span className="text-[var(--color-pulse-sub)]">logs</span>
            </span>
          </div>
          <div className="h-2 bg-[var(--color-pulse-hover)] border hairline rounded-[2px] overflow-hidden">
            <div className="h-full bg-[var(--color-pulse-accent)]" style={{ width: `${Math.min(weekPct, 100)}%` }} />
          </div>
          <p className="font-mono text-[11px] text-right mt-1 text-[var(--color-pulse-accent)]">{weekPct}%</p>
        </div>
      )}

      {/* Quick date nav */}
      <button
        onClick={() => navigate(`/coach/date/${today}`)}
        className="w-full card p-4 flex items-center text-left hover:bg-[var(--color-pulse-hover)] transition-colors"
      >
        <div>
          <span className="label !mb-0">date.view</span>
          <p className="font-mono text-[11px] text-[var(--color-pulse-sub)] mt-1">
            // 특정 날짜의 팀 전체 일지를 확인합니다
          </p>
        </div>
        <span className="ml-auto flex items-center gap-1 font-mono text-[12px] text-[var(--color-pulse-accent)]">
          today <ChevronRight size={13} />
        </span>
      </button>

      {/* Today's roster */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="label !mb-0">
            roster.today <span className="text-[var(--color-pulse-ink)]">{athletes.length}</span>
          </span>
          {pendingFeedback > 0 && <span className="badge-blue">{pendingFeedback}명 피드백 대기</span>}
        </div>

        {athletes.length === 0 ? (
          <div className="text-center py-6">
            <p className="font-mono text-[11px] text-[var(--color-pulse-sub)]">// 팀에 선수가 없습니다</p>
            <button onClick={() => navigate('/coach/team')} className="mt-3 btn-ghost !text-[11px] text-[var(--color-pulse-accent)]">
              view_team_code() →
            </button>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-[28px_1fr_auto_auto_auto] gap-3 px-2 pb-2 border-b hairline font-mono text-[10px] text-[var(--color-pulse-sub2)]">
              <span>av</span><span>name</span><span>cond</span><span>pain</span><span>status</span>
            </div>
            {athletes.map((athlete) => {
              const log = logMap[athlete.id]
              return (
                <button
                  key={athlete.id}
                  onClick={() => navigate(`/coach/athlete/${athlete.id}`)}
                  className="w-full grid grid-cols-[28px_1fr_auto_auto_auto] items-center gap-3 py-2.5 px-2 border-b hairline hover:bg-[var(--color-pulse-hover)] transition-colors text-left"
                >
                  <Avatar initial={athlete.name?.charAt(0) ?? '?'} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--color-pulse-ink)] truncate">{athlete.name}</p>
                    <p className="font-mono text-[10px] text-[var(--color-pulse-sub)] truncate">{athlete.specialty || athlete.sport}</p>
                  </div>
                  {log ? <ConditionStars value={log.condition} size="sm" /> : <span className="font-mono text-[10px] text-[var(--color-pulse-sub2)]">—</span>}
                  <span className="min-w-[20px] text-right">
                    {log?.painArea?.trim()
                      ? <PainBadge painArea={log.painArea} />
                      : <span className="font-mono text-[10px] text-[var(--color-pulse-sub2)]">—</span>}
                  </span>
                  <span className="min-w-[100px] text-right">
                    {!log ? <span className="badge-gray">미작성</span>
                      : !log.coachFeedback ? <span className="badge-blue">피드백 필요</span>
                      : <span className="badge-green">완료</span>}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────── helpers ───────

function Kpi({
  label, value, unit, tone, sub,
}: { label: string; value: number; unit?: string; tone?: 'ok' | 'warn'; sub?: string }) {
  const c = tone === 'ok' ? 'text-[var(--color-pulse-ok)]'
          : tone === 'warn' ? 'text-[var(--color-pulse-warn)]'
          : 'text-[var(--color-pulse-ink)]'
  return (
    <div className="card p-3">
      <span className="label !mb-0">{label}</span>
      <div className="mt-1 flex items-baseline gap-1">
        <span className={`font-mono text-2xl font-semibold tabular-nums tracking-tight ${c}`}>{value}</span>
        {unit && <span className="font-mono text-[11px] text-[var(--color-pulse-sub)]">{unit}</span>}
      </div>
      {sub && <p className="font-mono text-[10px] text-[var(--color-pulse-sub)] mt-1">{sub}</p>}
    </div>
  )
}

function Avatar({ initial }: { initial: string }) {
  return (
    <div className="w-7 h-7 rounded-[3px] border hairline-strong bg-[var(--color-pulse-hover)] flex items-center justify-center font-mono text-xs font-semibold text-[var(--color-pulse-ink)] flex-shrink-0">
      {initial}
    </div>
  )
}
