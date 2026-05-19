import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs, doc, getDoc, addDoc, setDoc } from 'firebase/firestore'
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
        setAthletes(athleteSnap.docs.map(d => ({ id: d.id, ...d.data() })) as AppUser[])
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

  if (loading) {
    return <div className="card h-48 animate-pulse" />
  }

  if (!user?.teamId || !team) {
    return (
      <div className="space-y-4">
        <div className="card p-8 text-center">
          <Users size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-1">팀이 없습니다</h3>
          <p className="text-sm text-gray-400 mb-5">팀을 만들면 선수들이 팀 코드로 참가할 수 있어요.</p>
          {!creating ? (
            <button onClick={() => setCreating(true)} className="btn-primary">
              새 팀 만들기
            </button>
          ) : (
            <form onSubmit={handleCreate} className="text-left space-y-3 max-w-xs mx-auto">
              <div>
                <label className="label">팀 이름</label>
                <input
                  type="text"
                  value={newTeamName}
                  onChange={e => setNewTeamName(e.target.value)}
                  className="input-field"
                  placeholder="예: 서울고 태권도부"
                  required
                />
              </div>
              {createError && <p className="text-sm text-red-500">{createError}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setCreating(false)} className="btn-outline flex-1">취소</button>
                <button type="submit" disabled={createLoading} className="btn-primary flex-1">
                  {createLoading ? '생성 중...' : '팀 생성'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Team info */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{team.name}</h2>
            <p className="text-xs text-gray-400">{team.sport}</p>
          </div>
          <button onClick={() => navigate('/coach')} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Team code */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">팀 초대 코드</p>
          <div className="flex items-center justify-between">
            <span className="text-3xl font-bold tracking-[0.3em] text-indigo-600 dark:text-indigo-400 font-mono">
              {team.code}
            </span>
            <button
              onClick={copyCode}
              className="flex items-center gap-1.5 btn-ghost text-sm"
            >
              {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
              {copied ? '복사됨' : '복사'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">선수가 이 코드로 팀에 참가할 수 있어요.</p>
        </div>
      </div>

      {/* Athletes */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">팀 선수 목록</h3>
          <span className="badge-gray">{athletes.length}명</span>
        </div>

        {athletes.length === 0 ? (
          <div className="text-center py-6">
            <UserCircle size={36} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-sm text-gray-400">아직 참가한 선수가 없습니다.</p>
            <p className="text-xs text-gray-400 mt-1">위 코드를 선수에게 공유하세요.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {athletes.map(athlete => (
              <button
                key={athlete.id}
                onClick={() => navigate(`/coach/athlete/${athlete.id}`)}
                className="w-full flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                    {athlete.name?.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{athlete.name}</p>
                  <p className="text-xs text-gray-400">{athlete.specialty || athlete.sport}</p>
                </div>
                <span className="text-xs text-gray-300 dark:text-gray-600">→</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
