import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore'
import { auth, db } from '../../firebase'
import { useAuthStore } from '../../store/authStore'
import { useThemeStore } from '../../store/themeStore'
import { Dumbbell, Sun, Moon, Eye, EyeOff, ChevronRight, ChevronLeft, CheckCircle } from 'lucide-react'
import { generateTeamCode } from '../../utils/dateUtils'
import type { AppUser } from '../../types'

type Step = 1 | 2 | 3

const SPORTS = ['태권도', '유도', '복싱', '레슬링', '유술', '씨름', '수영', '육상', '체조', '배드민턴', '탁구', '기타']
const SPECIALTIES: Record<string, string[]> = {
  '태권도': ['품새', '겨루기'],
  '유도': ['남자부', '여자부'],
  '복싱': ['아마추어', '프로'],
  '기타': [],
}

export default function SignupPage() {
  const navigate = useNavigate()
  const { setUser } = useAuthStore()
  const { isDark, toggle } = useThemeStore()

  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)

  const [role, setRole] = useState<'athlete' | 'coach'>('athlete')
  const [sport, setSport] = useState('태권도')
  const [specialty, setSpecialty] = useState('')

  const [teamMode, setTeamMode] = useState<'create' | 'join'>('create')
  const [teamName, setTeamName] = useState('')
  const [teamCode, setTeamCode] = useState('')

  const specialties = SPECIALTIES[sport] ?? []

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) { setError('비밀번호는 6자 이상이어야 합니다.'); return }
    setError('')
    setStep(2)
  }

  const handleStep2 = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (role === 'coach') setTeamMode('create')
    setStep(3)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      let teamId: string | null = null

      if (role === 'coach') {
        if (!teamName.trim()) { setError('팀 이름을 입력해주세요.'); setLoading(false); return }
        const code = generateTeamCode()
        const teamRef = await addDoc(collection(db, 'teams'), {
          name: teamName.trim(),
          code,
          sport,
          coachIds: [],
          createdAt: new Date().toISOString(),
        })
        teamId = teamRef.id
      } else {
        if (teamMode === 'join') {
          if (!teamCode.trim()) { setError('팀 코드를 입력해주세요.'); setLoading(false); return }
          const q = query(collection(db, 'teams'), where('code', '==', teamCode.trim().toUpperCase()))
          const snap = await getDocs(q)
          if (snap.empty) { setError('해당 팀 코드를 찾을 수 없습니다.'); setLoading(false); return }
          teamId = snap.docs[0].id
        }
      }

      const cred = await createUserWithEmailAndPassword(auth, email, password)
      const userData: Omit<AppUser, 'id'> = {
        name: name.trim(),
        email,
        role,
        teamId,
        sport,
        specialty,
        createdAt: new Date().toISOString(),
      }

      await setDoc(doc(db, 'users', cred.user.uid), userData)

      if (role === 'coach' && teamId) {
        const teamSnap = await getDocs(query(collection(db, 'teams'), where('__name__', '==', teamId)))
        if (!teamSnap.empty) {
          const teamData = teamSnap.docs[0].data()
          await setDoc(doc(db, 'teams', teamId), {
            ...teamData,
            coachIds: [...(teamData.coachIds ?? []), cred.user.uid],
          })
        }
      }

      setUser({ id: cred.user.uid, ...userData })
      navigate(role === 'coach' ? '/coach' : '/athlete', { replace: true })
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('이미 사용 중인 이메일입니다.')
      } else {
        setError('회원가입 중 오류가 발생했습니다.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 py-8">
      <button onClick={toggle} className="absolute top-4 right-4 btn-ghost p-2" aria-label="테마 전환">
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center mb-2">
            <Dumbbell size={22} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">회원가입</h1>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step === s ? 'bg-indigo-600 text-white' :
                step > s ? 'bg-emerald-500 text-white' :
                'bg-gray-200 dark:bg-gray-700 text-gray-400'
              }`}>
                {step > s ? <CheckCircle size={14} /> : s}
              </div>
              {s < 3 && <div className={`w-8 h-0.5 ${step > s ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Basic info */}
        {step === 1 && (
          <form onSubmit={handleStep1} className="card p-6 space-y-4">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">기본 정보</p>
            <div>
              <label className="label">이름</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="input-field" placeholder="홍길동" required />
            </div>
            <div>
              <label className="label">이메일</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-field" placeholder="example@email.com" required />
            </div>
            <div>
              <label className="label">비밀번호</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-field pr-10"
                  placeholder="6자 이상"
                  required
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
              다음 <ChevronRight size={16} />
            </button>
          </form>
        )}

        {/* Step 2: Role & Sport */}
        {step === 2 && (
          <form onSubmit={handleStep2} className="card p-6 space-y-4">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">역할 · 종목</p>

            <div>
              <label className="label">역할</label>
              <div className="grid grid-cols-2 gap-2">
                {(['athlete', 'coach'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`py-3 rounded-xl border-2 text-sm font-semibold transition-colors ${
                      role === r
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                        : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {r === 'athlete' ? '선수' : '코치'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">종목</label>
              <select value={sport} onChange={e => { setSport(e.target.value); setSpecialty('') }} className="input-field">
                {SPORTS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>

            {specialties.length > 0 && (
              <div>
                <label className="label">세부 분야</label>
                <div className="flex gap-2 flex-wrap">
                  {specialties.map((sp) => (
                    <button
                      key={sp}
                      type="button"
                      onClick={() => setSpecialty(sp === specialty ? '' : sp)}
                      className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                        specialty === sp
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                          : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {sp}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setStep(1)} className="btn-outline flex items-center gap-1">
                <ChevronLeft size={16} /> 이전
              </button>
              <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
                다음 <ChevronRight size={16} />
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Team */}
        {step === 3 && (
          <form onSubmit={handleSubmit} className="card p-6 space-y-4">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">팀 설정</p>

            {role === 'coach' ? (
              <div>
                <label className="label">팀 이름 (새로 생성)</label>
                <input
                  type="text"
                  value={teamName}
                  onChange={e => setTeamName(e.target.value)}
                  className="input-field"
                  placeholder="예: 서울고 태권도부"
                  required
                />
                <p className="text-xs text-gray-400 mt-1.5">생성 후 팀 코드를 선수에게 공유하세요.</p>
              </div>
            ) : (
              <>
                <div>
                  <label className="label">팀 참가 방법</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[{ v: 'join', label: '팀 코드 입력' }, { v: 'skip', label: '나중에 참가' }].map(({ v, label }) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setTeamMode(v as any)}
                        className={`py-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${
                          teamMode === v
                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                            : 'border-gray-200 dark:border-gray-700 text-gray-500'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                {teamMode === 'join' && (
                  <div>
                    <label className="label">팀 코드</label>
                    <input
                      type="text"
                      value={teamCode}
                      onChange={e => setTeamCode(e.target.value.toUpperCase())}
                      className="input-field font-mono tracking-widest"
                      placeholder="ABC123"
                      maxLength={6}
                    />
                  </div>
                )}
              </>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setStep(2)} className="btn-outline flex items-center gap-1">
                <ChevronLeft size={16} /> 이전
              </button>
              <button type="submit" disabled={loading} className="btn-primary flex-1">
                {loading ? '가입 중...' : '가입 완료'}
              </button>
            </div>
          </form>
        )}

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
          이미 계정이 있으신가요?{' '}
          <Link to="/login" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </div>
  )
}
