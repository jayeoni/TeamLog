import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from './firebase'
import { useAuthStore } from './store/authStore'
import { useThemeStore } from './store/themeStore'
import type { AppUser } from './types'

import Layout from './components/layout/Layout'
import LoginPage from './pages/auth/LoginPage'
import SignupPage from './pages/auth/SignupPage'
import AthleteDashboard from './pages/athlete/AthleteDashboard'
import AthleteCalendarPage from './pages/athlete/AthleteCalendarPage'
import AthleteLogPage from './pages/athlete/AthleteLogPage'
import CoachDashboard from './pages/coach/CoachDashboard'
import CoachDateViewPage from './pages/coach/CoachDateViewPage'
import CoachAthleteViewPage from './pages/coach/CoachAthleteViewPage'
import CoachTeamPage from './pages/coach/CoachTeamPage'

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-950">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        <p className="text-sm text-gray-400">로딩 중...</p>
      </div>
    </div>
  )
}

function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: 'athlete' | 'coach' }) {
  const { user, loading } = useAuthStore()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'coach' ? '/coach' : '/athlete'} replace />
  }
  return <>{children}</>
}

export default function App() {
  const { setUser, setLoading } = useAuthStore()
  const { apply } = useThemeStore()

  useEffect(() => {
    apply()
  }, [apply])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const snap = await getDoc(doc(db, 'users', firebaseUser.uid))
          if (snap.exists()) {
            setUser({ id: firebaseUser.uid, ...snap.data() } as AppUser)
          } else {
            setUser(null)
          }
        } catch {
          setUser(null)
        }
      } else {
        setUser(null)
      }
      setLoading(false)
    })
    return unsub
  }, [setUser, setLoading])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        <Route
          path="/athlete"
          element={
            <ProtectedRoute role="athlete">
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AthleteDashboard />} />
          <Route path="calendar" element={<AthleteCalendarPage />} />
          <Route path="log/:date" element={<AthleteLogPage />} />
        </Route>

        <Route
          path="/coach"
          element={
            <ProtectedRoute role="coach">
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<CoachDashboard />} />
          <Route path="date/:date" element={<CoachDateViewPage />} />
          <Route path="athlete/:athleteId" element={<CoachAthleteViewPage />} />
          <Route path="team" element={<CoachTeamPage />} />
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
