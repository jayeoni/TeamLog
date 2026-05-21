import { Menu, Sun, Moon } from 'lucide-react'
import { useThemeStore } from '../../store/themeStore'
import { useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

/**
 * Breadcrumb-style path → mono path string for the topbar.
 *  /athlete             → ~ / athlete / dashboard
 *  /athlete/log/2026... → ~ / athlete / log / 2026-05-20
 */
function pathToBreadcrumb(pathname: string): { segments: string[]; korean: string } {
  const KO: Record<string, string> = {
    athlete: '선수',
    coach: '코치',
    dashboard: '대시보드',
    calendar: '달력',
    log: '훈련일지',
    team: '팀 관리',
    date: '날짜별',
  }
  const raw = pathname.split('/').filter(Boolean)
  const segments = raw.length === 1 ? [...raw, 'dashboard'] : raw
  const first = segments[0]
  const second = segments[1]
  let korean = KO[first] ?? ''
  if (KO[second]) korean = korean ? `${korean} · ${KO[second]}` : KO[second]
  if (segments[0] === 'athlete' && segments[1] === 'log') korean = '훈련일지'
  if (segments[0] === 'coach' && segments[1] === 'date') korean = '날짜별 조회'
  if (segments[0] === 'coach' && segments[1] === 'athlete') korean = '선수별 조회'
  return { segments, korean }
}

function nowDateString() {
  const d = new Date()
  const ymd = d.toISOString().slice(0, 10)
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return { ymd, dow: days[d.getDay()], time: `${hh}:${mm}` }
}

interface Props {
  onMenuClick: () => void
}

export default function TopBar({ onMenuClick }: Props) {
  const { isDark, toggle } = useThemeStore()
  const { pathname } = useLocation()
  useAuthStore() // preserve subscription parity with original

  const { segments, korean } = pathToBreadcrumb(pathname)
  const { ymd, dow, time } = nowDateString()

  return (
    <header
      className="flex items-center justify-between h-11 px-4 lg:px-5 border-b hairline
                 bg-[var(--color-pulse-panel)] flex-shrink-0"
    >
      {/* Left: menu + breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="btn-ghost !p-1.5 lg:hidden -ml-1"
          aria-label="메뉴 열기"
        >
          <Menu size={18} />
        </button>

        <div className="font-mono text-[11px] truncate flex items-center gap-1.5">
          <span className="text-[var(--color-pulse-sub)]">~</span>
          {segments.map((seg, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <span className="text-[var(--color-pulse-sub2)]">/</span>
              <span
                className={
                  i === segments.length - 1
                    ? 'text-[var(--color-pulse-ink)]'
                    : 'text-[var(--color-pulse-sub)]'
                }
              >
                {seg}
              </span>
            </span>
          ))}
          {korean && (
            <span className="hidden md:inline font-sans text-[11px] text-[var(--color-pulse-sub)] ml-2">
              · {korean}
            </span>
          )}
        </div>
      </div>

      {/* Right: status + theme toggle */}
      <div className="flex items-center gap-3 font-mono text-[11px] text-[var(--color-pulse-sub)]">
        <span className="hidden md:flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-pulse-ok)]" />
          <span>firestore</span>
        </span>
        <span className="hidden lg:inline">
          {ymd} <span className="text-[var(--color-pulse-ink)]">{dow} {time}</span>
        </span>
        <button
          onClick={toggle}
          className="btn-outline !py-1 !px-2 !text-[10px]"
          aria-label={isDark ? '라이트 모드' : '다크 모드'}
          title={isDark ? 'switch to light' : 'switch to dark'}
        >
          {isDark ? (
            <>
              <Moon size={11} /> dark
            </>
          ) : (
            <>
              <Sun size={11} /> light
            </>
          )}
        </button>
      </div>
    </header>
  )
}
