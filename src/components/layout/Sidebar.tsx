import { useEffect, useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../../firebase'
import { useAuthStore } from '../../store/authStore'
import { LogOut, X } from 'lucide-react'

interface NavItem {
  to: string
  en: string
  ko: string
  end?: boolean
}

interface Props {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: Props) {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [teamName, setTeamName] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.teamId) {
      setTeamName(null)
      return
    }
    getDoc(doc(db, 'teams', user.teamId)).then((snap) => {
      setTeamName(snap.exists() ? (snap.data().name as string) : null)
    })
  }, [user?.teamId])

  const isCoach = user?.role === 'coach'

  const athleteNav: NavItem[] = [
    { to: '/athlete',          en: 'dashboard',  ko: '대시보드', end: true },
    { to: '/athlete/calendar', en: 'calendar',   ko: '달력' },
    {
      to: '/athlete/log/' + new Date().toISOString().slice(0, 10),
      en: 'log/today',
      ko: '오늘 일지',
    },
  ]

  const coachNav: NavItem[] = [
    { to: '/coach',      en: 'dashboard', ko: '대시보드', end: true },
    { to: '/coach/team', en: 'team',      ko: '팀 관리' },
  ]

  const navItems = isCoach ? coachNav : athleteNav

  const handleLogout = async () => {
    await signOut(auth)
    navigate('/login')
  }

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-30 w-[208px] flex flex-col
        bg-[var(--color-pulse-panel)] border-r hairline
        transition-transform duration-300 ease-out
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0
      `}
    >
      {/* Brand cell — matches topbar height (44px) */}
      <div className="flex items-center justify-between h-11 px-3.5 border-b hairline">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-[2px] bg-[var(--color-pulse-accent)]"
            style={{ boxShadow: '0 0 8px var(--color-pulse-accent)' }}
          />
          <span className="font-mono text-[13px] font-semibold text-[var(--color-pulse-ink)]">teamlog</span>
          <span className="font-mono text-[10px] text-[var(--color-pulse-sub)] ml-1">beta</span>
        </div>
        <button onClick={onClose} className="lg:hidden btn-ghost !p-1.5">
          <X size={16} />
        </button>
      </div>

      {/* Role kicker */}
      <div className="font-mono text-[9px] text-[var(--color-pulse-sub2)] px-4 pt-3 pb-2 tracking-wider">
        // {(isCoach ? 'coach' : 'athlete').toUpperCase()}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2.5 space-y-px overflow-y-auto">
        {navItems.map(({ to, en, ko, end }, idx) => {
          const key = String(idx + 1).padStart(2, '0')
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                [
                  'group flex items-center gap-2.5 px-2.5 py-1.5 rounded-[2px]',
                  'font-mono text-xs transition-colors',
                  'border-l-2',
                  isActive
                    ? 'text-[var(--color-pulse-ink)] bg-[var(--color-pulse-hover)] border-[var(--color-pulse-accent)]'
                    : 'text-[var(--color-pulse-sub)] border-transparent hover:bg-[var(--color-pulse-hover)] hover:text-[var(--color-pulse-ink)]',
                ].join(' ')
              }
            >
              <span className="text-[10px] text-[var(--color-pulse-sub2)] group-[.active]:text-[var(--color-pulse-sub)]">
                {key}
              </span>
              <span className="flex-1 truncate">{en}</span>
              <span className="font-sans text-[10px] text-[var(--color-pulse-sub2)] truncate max-w-[60px] text-right">
                {ko}
              </span>
            </NavLink>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="px-2.5 pt-3 pb-2 mt-2 border-t hairline">
        <div className="px-2.5">
          <div className="font-mono text-[10px] text-[var(--color-pulse-sub)]">user@teamlog</div>
          <div className="mt-1 text-sm font-semibold text-[var(--color-pulse-ink)] truncate">
            {user?.name ?? '—'}
          </div>
          <div className="font-mono text-[10px] text-[var(--color-pulse-sub)] mt-0.5">
            role={isCoach ? 'coach' : 'athlete'} · {user?.sport || 'sport=none'}
          </div>
          {teamName && (
            <div className="font-mono text-[10px] mt-0.5 truncate">
              <span className="text-[var(--color-pulse-sub)]">team=</span>
              <span className="text-[var(--color-pulse-accent)]">{teamName}</span>
            </div>
          )}
        </div>

        <button
          onClick={handleLogout}
          className="mt-2 flex items-center gap-2 w-full px-2.5 py-1.5 rounded-[2px]
                     font-mono text-xs text-[var(--color-pulse-sub)]
                     hover:bg-[color-mix(in_oklab,var(--color-pulse-warn)_10%,transparent)]
                     hover:text-[var(--color-pulse-warn)] transition-colors"
          aria-label="로그아웃"
          title={location.pathname}
        >
          <LogOut size={14} />
          $ logout
        </button>
      </div>
    </aside>
  )
}
