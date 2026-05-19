import { NavLink, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../../firebase'
import { useAuthStore } from '../../store/authStore'
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  Users,
  LogOut,
  X,
  Dumbbell,
} from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: Props) {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const isCoach = user?.role === 'coach'
  const athleteNav = [
    { to: '/athlete', label: '대시보드', icon: LayoutDashboard, end: true },
    { to: '/athlete/calendar', label: '달력', icon: Calendar },
    { to: '/athlete/log/' + new Date().toISOString().slice(0, 10), label: '오늘 일지', icon: BookOpen },
  ]

  const coachNav = [
    { to: '/coach', label: '대시보드', icon: LayoutDashboard, end: true },
    { to: '/coach/team', label: '팀 관리', icon: Users },
  ]

  const navItems = isCoach ? coachNav : athleteNav

  const handleLogout = async () => {
    await signOut(auth)
    navigate('/login')
  }

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-30 w-64 flex flex-col
        bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800
        transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0
      `}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Dumbbell size={16} className="text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight text-gray-900 dark:text-white">TeamLog</span>
        </div>
        <button onClick={onClose} className="lg:hidden btn-ghost p-1.5">
          <X size={18} />
        </button>
      </div>

      {/* User info */}
      <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
              {user?.name?.charAt(0) ?? '?'}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isCoach ? '코치' : '선수'} · {user?.sport || '종목 미설정'}
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-150"
        >
          <LogOut size={18} />
          로그아웃
        </button>
      </div>
    </aside>
  )
}
