import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../../firebase'
import { useAuthStore } from '../../store/authStore'
import { useThemeStore } from '../../store/themeStore'
import { Sun, Moon, Eye, EyeOff } from 'lucide-react'
import type { AppUser } from '../../types'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setUser } = useAuthStore()
  const { isDark, toggle } = useThemeStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      const snap = await getDoc(doc(db, 'users', cred.user.uid))
      if (snap.exists()) {
        const user = { id: cred.user.uid, ...snap.data() } as AppUser
        setUser(user)
        navigate(user.role === 'coach' ? '/coach' : '/athlete', { replace: true })
      }
    } catch (err: any) {
      const code = err.code as string
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.')
      } else {
        setError('로그인 중 오류가 발생했습니다.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthFrame title="login">
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

      <div className="w-full max-w-[420px]">
        {/* Heading */}
        <div className="mb-6">
          <div className="kicker">$ auth.login</div>
          <h1 className="font-mono text-3xl font-bold tracking-tight text-[var(--color-pulse-ink)] mt-2">
            로그인<span className="caret" />
          </h1>
          <p className="font-mono text-[11px] text-[var(--color-pulse-sub)] mt-2">
            // 선수·코치 훈련일지 시스템에 접근하세요
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="card p-6 space-y-4">
          <div>
            <label className="label">
              <span className="text-[var(--color-pulse-sub2)] mr-1">[00]</span>email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field input-mono"
              placeholder="example@team.kr"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="label flex items-center justify-between">
              <span>
                <span className="text-[var(--color-pulse-sub2)] mr-1">[01]</span>password
              </span>
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="font-mono text-[11px] text-[var(--color-pulse-cool)] hover:underline"
              >
                {showPw ? 'hide' : 'show'}
              </button>
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field input-mono pr-10"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-pulse-sub2)] pointer-events-none">
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </span>
            </div>
          </div>

          {error && (
            <p className="font-mono text-[11px] text-[var(--color-pulse-warn)] text-center">{error}</p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-2">
            {loading ? 'authenticating...' : '$ authenticate()'}
            <span className="ml-auto text-[var(--color-pulse-accent-ink)] opacity-50">↵</span>
          </button>
        </form>

        {/* Footer link */}
        <div className="flex items-center justify-between mt-5 font-mono text-[11px] text-[var(--color-pulse-sub)]">
          <span>아직 계정이 없으신가요?</span>
          <Link to="/signup" className="text-[var(--color-pulse-accent)] hover:underline">
            signup →
          </Link>
        </div>
      </div>
    </AuthFrame>
  )
}

/* Reusable shell — also used by SignupPage */
export function AuthFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 bg-[var(--color-pulse-bg)] text-[var(--color-pulse-ink)] relative overflow-hidden">
      {/* ASCII grid */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(var(--color-pulse-line) 1px, transparent 1px), linear-gradient(90deg, var(--color-pulse-line) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 h-11 border-b hairline bg-[var(--color-pulse-bg)]">
        <div className="h-full flex items-center px-5 font-mono text-[11px] text-[var(--color-pulse-sub)]">
          <span className="ml-auto">~ / <span className="text-[var(--color-pulse-ink)]">{title}</span></span>
        </div>
      </div>

      {/* Content */}
      <div className="relative w-full flex items-center justify-center">{children}</div>

      {/* Footer */}
      <div className="absolute bottom-4 left-5 right-5 flex justify-between font-mono text-[10px] text-[var(--color-pulse-sub2)] pointer-events-none">
        <span>© teamlog · sports training journal</span>
        <span>↑↓ navigate · enter submit · esc cancel</span>
      </div>
    </div>
  )
}
