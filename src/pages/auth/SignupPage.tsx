import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore'
import { auth, db } from '../../firebase'
import { useAuthStore } from '../../store/authStore'
import { useThemeStore } from '../../store/themeStore'
import { Sun, Moon, Eye, EyeOff, ChevronRight, ChevronLeft, Check } from 'lucide-react'
import { generateTeamCode } from '../../utils/dateUtils'
import { AuthFrame } from './LoginPage'
import type { AppUser } from '../../types'

type Step = 1 | 2 | 3

const SPORTS = ['태권도', '유도', '복싱', '레슬링', '유술', '씨름', '수영', '육상', '체조', '배드민턴', '탁구', '기타']
const SPECIALTIES: Record<string, string[]> = {
  '태권도': ['품새', '겨루기'],
  '유도': ['남자부', '여자부'],
  '복싱': ['아마추어', '프로'],
  '기타': [],
}

const STEPS: Array<{ key: '01' | '02' | '03'; label: string }> = [
  { key: '01', label: 'basic' },
  { key: '02', label: 'role · sport' },
  { key: '03', label: 'team' },
]

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

  const [teamMode, setTeamMode] = useState<'create' | 'join' | 'skip'>('create')
  const [teamName, setTeamName] = useState('')
  const [teamCode, setTeamCode] = useState('')

  const specialties = SPECIALTIES[sport] ?? []

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.')
      return
    }
    setError('')
    setStep(2)
  }

  const handleStep2 = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setTeamMode(role === 'coach' ? 'create' : 'skip')
    setStep(3)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (role === 'coach' && !teamName.trim()) { setError('팀 이름을 입력해주세요.'); return }
    if (role === 'athlete' && teamMode === 'join' && !teamCode.trim()) { setError('팀 코드를 입력해주세요.'); return }

    setLoading(true)

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      const uid = cred.user.uid
      let teamId: string | null = null

      if (role === 'athlete' && teamMode === 'join') {
        const q = query(collection(db, 'teams'), where('code', '==', teamCode.trim().toUpperCase()))
        const snap = await getDocs(q)
        if (snap.empty) { setError('해당 팀 코드를 찾을 수 없습니다.'); setLoading(false); return }
        teamId = snap.docs[0].id
      }

      const userData: Omit<AppUser, 'id'> = {
        name: name.trim(),
        email,
        role,
        teamId,
        sport,
        specialty,
        createdAt: new Date().toISOString(),
      }
      await setDoc(doc(db, 'users', uid), userData)

      if (role === 'coach') {
        const code = generateTeamCode()
        const teamRef = await addDoc(collection(db, 'teams'), {
          name: teamName.trim(),
          code,
          sport,
          coachIds: [uid],
          createdAt: new Date().toISOString(),
        })
        teamId = teamRef.id
        await setDoc(doc(db, 'users', uid), { ...userData, teamId })
      }

      setUser({ id: uid, ...userData, teamId })
      navigate(role === 'coach' ? '/coach' : '/athlete', { replace: true })
    } catch (err: any) {
      console.error('[signup error]', err?.code, err?.message, err)
      if (err.code === 'auth/email-already-in-use') {
        setError('이미 사용 중인 이메일입니다.')
      } else if (err.code === 'auth/invalid-email') {
        setError('유효하지 않은 이메일 형식입니다.')
      } else if (err.code === 'auth/weak-password') {
        setError('비밀번호는 6자 이상이어야 합니다.')
      } else {
        setError(`오류: ${err?.code ?? err?.message ?? '알 수 없는 오류'}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthFrame title={`signup --step=${step}/3`}>
      <div className="flex items-baseline justify-between absolute top-4 left-5 right-5">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-[2px] bg-[var(--color-pulse-accent)]"
            style={{ boxShadow: '0 0 8px var(--color-pulse-accent)' }}
          />
          <span className="font-mono text-[13px] font-semibold text-[var(--color-pulse-ink)]">teamlog</span>
          <span className="font-mono text-[10px] text-[var(--color-pulse-sub)] ml-1">v2.6</span>
        </div>
        <button onClick={toggle} className="btn-outline !py-1 !px-2 !text-[10px]" aria-label="테마 전환">
          {isDark ? <><Moon size={11} /> dark</> : <><Sun size={11} /> light</>}
        </button>
      </div>

      <div className="w-full max-w-[480px]">
        {/* Heading */}
        <div className="mb-5">
          <div className="kicker">$ auth.signup --step={step}/3</div>
          <h1 className="font-mono text-3xl font-bold tracking-tight text-[var(--color-pulse-ink)] mt-2">
            회원가입
          </h1>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-5 font-mono text-[11px]">
          {STEPS.map(({ key, label }, i) => {
            const n = i + 1
            const status = step === n ? 'active' : step > n ? 'done' : 'todo'
            return (
              <span key={key} className="flex items-center gap-2">
                <span
                  className={[
                    'flex items-center gap-1.5 px-2 py-1 rounded-[3px] border',
                    status === 'active'
                      ? 'border-[var(--color-pulse-accent)] text-[var(--color-pulse-ink)] bg-[color-mix(in_oklab,var(--color-pulse-accent)_14%,transparent)]'
                      : status === 'done'
                      ? 'border-[color-mix(in_oklab,var(--color-pulse-ok)_30%,transparent)] text-[var(--color-pulse-ok)]'
                      : 'border-[var(--color-pulse-line2)] text-[var(--color-pulse-sub)]',
                  ].join(' ')}
                >
                  <span
                    className={
                      status === 'done'
                        ? 'text-[var(--color-pulse-ok)]'
                        : status === 'active'
                        ? 'text-[var(--color-pulse-accent)]'
                        : 'text-[var(--color-pulse-sub2)]'
                    }
                  >
                    {status === 'done' ? <Check size={11} /> : key}
                  </span>
                  <span>{label}</span>
                </span>
                {i < STEPS.length - 1 && <span className="text-[var(--color-pulse-sub2)]">──</span>}
              </span>
            )
          })}
        </div>

        {/* Step 1 — basic info */}
        {step === 1 && (
          <form onSubmit={handleStep1} className="card p-6 space-y-4">
            <SignupField code="00" label="name">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
                placeholder="홍길동"
                required
              />
            </SignupField>

            <SignupField code="01" label="email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field input-mono"
                placeholder="example@team.kr"
                required
              />
            </SignupField>

            <SignupField
              code="02"
              label="password"
              right={
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="font-mono text-[11px] text-[var(--color-pulse-cool)] hover:underline"
                >
                  {showPw ? 'hide' : 'show'}
                </button>
              }
            >
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field input-mono pr-10"
                  placeholder="6자 이상"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-pulse-sub2)] pointer-events-none">
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </span>
              </div>
            </SignupField>

            {error && <p className="font-mono text-[11px] text-[var(--color-pulse-warn)]">{error}</p>}

            <button type="submit" className="btn-primary w-full justify-center">
              next() → step 02
              <ChevronRight size={13} />
            </button>
          </form>
        )}

        {/* Step 2 — role + sport + specialty */}
        {step === 2 && (
          <form onSubmit={handleStep2} className="card p-6 space-y-5">
            <SignupField code="03" label="role">
              <div className="grid grid-cols-2 gap-2">
                {([['athlete', '선수'], ['coach', '코치']] as const).map(([k, ko]) => {
                  const active = role === k
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setRole(k)}
                      className={[
                        'flex items-center gap-2.5 px-3 py-3 rounded-[4px] border text-left transition-colors',
                        'font-mono text-sm',
                        active
                          ? 'border-[var(--color-pulse-accent)] bg-[color-mix(in_oklab,var(--color-pulse-accent)_14%,transparent)] text-[var(--color-pulse-ink)] font-bold'
                          : 'border-[var(--color-pulse-line2)] text-[var(--color-pulse-sub)] hover:bg-[var(--color-pulse-hover)]',
                      ].join(' ')}
                    >
                      <span
                        className={
                          active
                            ? 'text-[var(--color-pulse-accent)] text-xs'
                            : 'text-[var(--color-pulse-sub2)] text-xs'
                        }
                      >
                        {active ? '●' : '○'}
                      </span>
                      <span>{k}</span>
                      <span className="ml-auto text-[11px] font-sans text-[var(--color-pulse-sub)] font-normal">{ko}</span>
                    </button>
                  )
                })}
              </div>
            </SignupField>

            <SignupField code="04" label="sport">
              <div className="flex flex-wrap gap-1.5">
                {SPORTS.map((s) => {
                  const active = sport === s
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => { setSport(s); setSpecialty('') }}
                      className={[
                        'font-mono text-[11px] px-2.5 py-1 rounded-[3px] border transition-colors',
                        active
                          ? 'border-[var(--color-pulse-accent)] bg-[color-mix(in_oklab,var(--color-pulse-accent)_14%,transparent)] text-[var(--color-pulse-ink)]'
                          : 'border-[var(--color-pulse-line2)] text-[var(--color-pulse-sub)] hover:bg-[var(--color-pulse-hover)]',
                      ].join(' ')}
                    >
                      {s}
                    </button>
                  )
                })}
              </div>
            </SignupField>

            {specialties.length > 0 && (
              <SignupField code="05" label="specialty" hint="// optional">
                <div className="flex flex-wrap gap-1.5">
                  {specialties.map((sp) => {
                    const active = specialty === sp
                    return (
                      <button
                        key={sp}
                        type="button"
                        onClick={() => setSpecialty(sp === specialty ? '' : sp)}
                        className={[
                          'font-mono text-[11px] px-2.5 py-1 rounded-[3px] border transition-colors',
                          active
                            ? 'border-[var(--color-pulse-accent)] bg-[color-mix(in_oklab,var(--color-pulse-accent)_14%,transparent)] text-[var(--color-pulse-ink)]'
                            : 'border-[var(--color-pulse-line2)] text-[var(--color-pulse-sub)] hover:bg-[var(--color-pulse-hover)]',
                        ].join(' ')}
                      >
                        {sp}
                      </button>
                    )
                  })}
                </div>
              </SignupField>
            )}

            {error && <p className="font-mono text-[11px] text-[var(--color-pulse-warn)]">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setStep(1)} className="btn-outline">
                <ChevronLeft size={13} /> prev
              </button>
              <button type="submit" className="btn-primary flex-1 justify-center">
                next() → step 03
                <ChevronRight size={13} />
              </button>
            </div>
          </form>
        )}

        {/* Step 3 — team */}
        {step === 3 && (
          <form onSubmit={handleSubmit} className="card p-6 space-y-5">
            {role === 'coach' ? (
              <SignupField code="06" label="team.name" hint="// 새 팀을 생성합니다">
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="input-field"
                  placeholder="예: 서울고 태권도부"
                  required
                />
                <p className="hint mt-2">생성 후 팀 코드를 선수에게 공유하세요.</p>
              </SignupField>
            ) : (
              <>
                <SignupField code="06" label="team.mode">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { v: 'join', label: '팀 코드 입력' },
                      { v: 'skip', label: '나중에 참가' },
                    ].map(({ v, label }) => {
                      const active = teamMode === v
                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setTeamMode(v as any)}
                          className={[
                            'flex items-center gap-2 px-3 py-2.5 rounded-[4px] border transition-colors',
                            'font-mono text-[12px]',
                            active
                              ? 'border-[var(--color-pulse-accent)] bg-[color-mix(in_oklab,var(--color-pulse-accent)_14%,transparent)] text-[var(--color-pulse-ink)] font-bold'
                              : 'border-[var(--color-pulse-line2)] text-[var(--color-pulse-sub)] hover:bg-[var(--color-pulse-hover)]',
                          ].join(' ')}
                        >
                          <span className={active ? 'text-[var(--color-pulse-accent)]' : 'text-[var(--color-pulse-sub2)]'}>
                            {active ? '●' : '○'}
                          </span>
                          <span>{v}</span>
                          <span className="ml-auto text-[11px] font-sans text-[var(--color-pulse-sub)] font-normal">{label}</span>
                        </button>
                      )
                    })}
                  </div>
                </SignupField>

                {teamMode === 'join' && (
                  <SignupField code="07" label="team.code">
                    <input
                      type="text"
                      value={teamCode}
                      onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                      className="input-field input-mono"
                      placeholder="ABC123"
                      maxLength={6}
                    />
                  </SignupField>
                )}
              </>
            )}

            {error && <p className="font-mono text-[11px] text-[var(--color-pulse-warn)]">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setStep(2)} className="btn-outline">
                <ChevronLeft size={13} /> prev
              </button>
              <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
                {loading ? 'creating account...' : '$ create_account()'}
                <span className="ml-auto text-[var(--color-pulse-accent-ink)] opacity-50">↵</span>
              </button>
            </div>
          </form>
        )}

        {/* Footer link */}
        <div className="flex items-center justify-between mt-5 font-mono text-[11px] text-[var(--color-pulse-sub)]">
          <span>이미 계정이 있으신가요?</span>
          <Link to="/login" className="text-[var(--color-pulse-accent)] hover:underline">
            login →
          </Link>
        </div>
      </div>
    </AuthFrame>
  )
}

function SignupField({
  code, label, hint, right, children,
}: {
  code: string
  label: string
  hint?: string
  right?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <div className="label !mb-0">
          <span className="text-[var(--color-pulse-sub2)] mr-1">[{code}]</span>{label}
          {hint && <span className="text-[var(--color-pulse-sub2)] ml-2 font-normal">{hint}</span>}
        </div>
        {right}
      </div>
      {children}
    </div>
  )
}
