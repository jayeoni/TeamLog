import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../../firebase'
import { useAuthStore } from '../../store/authStore'
import { useThemeStore } from '../../store/themeStore'
import { Dumbbell, Sun, Moon, Eye, EyeOff } from 'lucide-react'
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <button
        onClick={toggle}
        className="absolute top-4 right-4 btn-ghost p-2"
        aria-label="테마 전환"
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mb-3 shadow-lg">
            <Dumbbell size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">TeamLog</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">선수·코치 훈련일지 플랫폼</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="card p-6 space-y-4">
          <div>
            <label className="label">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="example@email.com"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="label">비밀번호</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field pr-10"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500 dark:text-red-400 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full mt-2"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
          아직 계정이 없으신가요?{' '}
          <Link to="/signup" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  )
}
