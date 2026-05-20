export function toYMD(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayYMD(): string {
  return toYMD(new Date())
}

export function parseYMD(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function formatKoreanDate(ymd: string): string {
  const d = parseYMD(ymd)
  const days = ['일', '월', '화', '수', '목', '금', '토']
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`
}

export function formatShortDate(ymd: string): string {
  const d = parseYMD(ymd)
  const days = ['일', '월', '화', '수', '목', '금', '토']
  return `${d.getMonth() + 1}/${d.getDate()} (${days[d.getDay()]})`
}

export function getMonthDays(year: number, month: number): Date[] {
  const days: Date[] = []
  const last = new Date(year, month + 1, 0)
  for (let d = 1; d <= last.getDate(); d++) {
    days.push(new Date(year, month, d))
  }
  return days
}

export function getCalendarGrid(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1).getDay()
  const days = getMonthDays(year, month)
  const grid: (Date | null)[] = Array(firstDay).fill(null)
  grid.push(...days)
  while (grid.length % 7 !== 0) grid.push(null)
  return grid
}

export function getWeekNumber(date: Date): number {
  const firstJan = new Date(date.getFullYear(), 0, 1)
  const dayOfYear = Math.ceil((date.getTime() - firstJan.getTime()) / 86400000)
  return Math.ceil((dayOfYear + firstJan.getDay()) / 7)
}

export function getMondayOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

export function weekStartYMD(): string {
  return toYMD(getMondayOfWeek(new Date()))
}

export function monthStartYMD(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

export function daysInCurrentMonth(): number {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
}

export function generateTeamCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}
