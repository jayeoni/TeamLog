import { Menu, Sun, Moon } from 'lucide-react'
import { useThemeStore } from '../../store/themeStore'
import { useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

const PAGE_TITLES: Record<string, string> = {
  '/athlete': '대시보드',
  '/athlete/calendar': '훈련 달력',
  '/coach': '대시보드',
  '/coach/team': '팀 관리',
}

function getTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  if (pathname.includes('/athlete/log/')) return '훈련일지'
  if (pathname.includes('/coach/date/')) return '날짜별 조회'
  if (pathname.includes('/coach/athlete/')) return '선수별 조회'
  return 'TeamLog'
}

interface Props {
  onMenuClick: () => void
}

export default function TopBar({ onMenuClick }: Props) {
  const { isDark, toggle } = useThemeStore()
  const { pathname } = useLocation()
  useAuthStore()

  return (
    <header className="flex items-center justify-between h-14 px-4 lg:px-6 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-shrink-0">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="btn-ghost p-2 lg:hidden -ml-1">
          <Menu size={20} />
        </button>
        <h1 className="text-base font-semibold text-gray-900 dark:text-white">
          {getTitle(pathname)}
        </h1>
      </div>

      <button
        onClick={toggle}
        className="btn-ghost p-2"
        aria-label={isDark ? '라이트 모드' : '다크 모드'}
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </header>
  )
}
