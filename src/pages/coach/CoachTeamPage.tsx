import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  collection, query, where, getDocs, doc, getDoc, addDoc, setDoc,
} from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuthStore } from '../../store/authStore'
import { generateTeamCode } from '../../utils/dateUtils'
import { Copy, Check, Users, UserCircle, RefreshCw } from 'lucide-react'
import type { AppUser, Team } from '../../types'

export default function CoachTeamPage() {
  const { user, setUser } = useAuthStore()
  const navigate = useNavigate()

  const [team, setTeam] = useState<Team | null>(null)
  const [athletes, setAthletes] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  const [creating, setCreating] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState('')

  useEffect(() => {
    if (!user) return
    if (!user.teamId) { setLoading(false); return }

    const fetchTeam = async () => {
      try {
        const [teamSnap, athleteSnap] = await Promise.all([
          getDoc(doc(db, 'teams', user.teamId!)),
          getDocs(query(
            collection(db, 'users'),
            where('teamId', '==', user.teamId),
            where('role', '==', 'athlete')
          )),
        ])

        if (teamSnap.exists()) {
          setTeam({ id: teamSnap.id, ...teamSnap.data() } as Team)
        }
        setAthletes(athleteSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as AppUser[])
      } finally {
        setLoading(false)
      }
    }
    fetchTeam()
  }, [user])

  const copyCode = () => {
    if (!team?.code) return
    navigator.clipboard.writeText(team.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newTeamName.trim()) return
    setCreateLoading(true)
    setCreateError('')
    try {
      const code = generateTeamCode()
      const teamRef = await addDoc(collection(db, 'teams'), {
        name: newTeamName.trim(),
        code,
        sport: user.sport ?? '',
        coachIds: [user.id],
        createdAt: new Date().toISOString(),
      })

      await setDoc(doc(db, 'users', user.id), { ...user, teamId: teamRef.id }, { merge: true })

      const newTeam: Team = {
        id: teamRef.id,
        name: newTeamName.trim(),
        code,
        sport: user.sport ?? '',
        coachIds: [user.id],
        createdAt: new Date().toISOString(),
      }
      setTeam(newTeam)
      setUser({ ...user, teamId: teamRef.id })
      setCreating(false)
    } catch {
      setCreateError('팀 생성에 실패했습니다.')
    } finally {
      setCreateLoading(false)
    }
  }

  if (loading) return <div className="card h-48 animate-pulse" />

  // No team yet — create flow
  if (!user?.teamId || !team) {
    return (
      <div className="card p-10 text-center max-w-md mx-auto">
        <Users size={32} className="mx-auto text-[var(--color-pulse-sub2)] mb-3" />
        <h3 className="font-mono text-sm text-[var(--color-pulse-ink)] mb-1">team.not_found</h3>
        <p className="font-mono text-[11px] text-[var(--color-pulse-sub)] mb-6">
          // 팀을 만들면 선수들이 팀 코드로 참가할 수 있어요
        </p>
        {!creating ? (
          <button onClick={() => setCreating(true)} className="btn-primary">
            $ create_team()
          </button>
        ) : (
          <form onSubmit={handleCreate} className="text-left space-y-3 max-w-xs mx-auto">
            <div>
              <label className="label">team.name</label>
              <input
                type="text"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                className="input-field"
                placeholder="예: 서울고 태권도부"
                required
              />
            </div>
            {createError && (
              <p className="font-mono text-[11px] text-[var(--color-pulse-warn)]">{createError}</p>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={() => setCreating(false)} className="btn-outline flex-1">
                cancel
              </button>
              <button type="submit" disabled={createLoading} className="btn-primary flex-1 justify-center">
                {createLoading ? '...' : 'create()'}
              </button>
            </div>
          </form>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header strip */}
      <div className="flex items-baseline gap-3 flex-wrap">
        <span className="kicker">$ team.manage</span>
        <span className="kicker-muted">// 코드를 공유해 선수를 초대하세요</span>
      </div>

      {/* Team info + code (featured) */}
      <div className="card p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="label !mb-0">team.info</span>
            <h2 className="mt-1 text-lg font-bold text-[var(--color-pulse-ink)]">{team.name}</h2>
            <p className="font-mono text-[11px] text-[var(--color-pulse-sub)] mt-0.5">
              sport=<span className="text-[var(--color-pulse-ink)]">{team.sport}</span> · {athletes.length} athletes
            </p>
          </div>
          <button onClick={() => navigate('/coach')} className="btn-ghost !p-1.5" aria-label="새로고침">
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Code */}
        <div
          className="card-flat p-4 relative overflow-hidden"
          style={{
            borderColor: 'color-mix(in oklab, var(--color-pulse-accent) 35%, transparent)',
          }}
        >
          <div
            className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, color-mix(in oklab, var(--color-pulse-accent) 18%, transparent), transparent 70%)' }}
          />
          <p className="label !mb-2 !text-[var(--color-pulse-accent)]">team.invite_code</p>
          <div className="flex items-end gap-3 relative">
            <span className="font-mono text-4xl md:text-5xl font-extrabold tracking-[0.12em] text-[var(--color-pulse-accent)] leading-none">
              {team.code}
            </span>
            <button onClick={copyCode} className="btn-outline ml-auto" aria-label="복사">
              {copied ? <Check size={13} className="text-[var(--color-pulse-ok)]" /> : <Copy size={13} />}
              {copied ? 'copied' : 'copy()'}
            </button>
          </div>
          <p className="font-mono text-[11px] text-[var(--color-pulse-sub)] mt-3 relative">
            // 선수가 이 코드로 팀에 참가할 수 있어요
          </p>
        </div>
      </div>

      {/* Athletes */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="label !mb-0">
            athletes <span className="text-[var(--color-pulse-ink)]">{athletes.length}</span>
          </span>
          <span className="font-mono text-[10px] text-[var(--color-pulse-sub)]">order_by=name</span>
        </div>

        {athletes.length === 0 ? (
          <div className="text-center py-8">
            <UserCircle size={28} className="mx-auto text-[var(--color-pulse-sub2)] mb-2" />
            <p className="font-mono text-[11px] text-[var(--color-pulse-sub)]">// 아직 참가한 선수가 없습니다</p>
            <p className="font-mono text-[10px] text-[var(--color-pulse-sub2)] mt-1">위 코드를 선수에게 공유하세요</p>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-[28px_1fr_auto_auto] gap-3 px-2 pb-2 border-b hairline font-mono text-[10px] text-[var(--color-pulse-sub2)]">
              <span>av</span><span>name</span><span>specialty</span><span></span>
            </div>
            {athletes.map((athlete) => (
              <button
                key={athlete.id}
                onClick={() => navigate(`/coach/athlete/${athlete.id}`)}
                className="w-full grid grid-cols-[28px_1fr_auto_auto] items-center gap-3 px-2 py-2.5 hover:bg-[var(--color-pulse-hover)] border-b hairline transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-[3px] border hairline-strong bg-[var(--color-pulse-hover)] flex items-center justify-center font-mono text-xs font-semibold text-[var(--color-pulse-ink)]">
                  {athlete.name?.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--color-pulse-ink)] truncate">{athlete.name}</p>
                </div>
                <p className="font-mono text-[10px] text-[var(--color-pulse-sub)]">{athlete.specialty || athlete.sport}</p>
                <span className="font-mono text-[11px] text-[var(--color-pulse-sub)]">→</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
