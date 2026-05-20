import { formatKoreanDate } from './dateUtils'
import type { DailyLog } from '../types'

declare global {
  interface Window { Kakao: any }
}

function initKakao(): boolean {
  const key = import.meta.env.VITE_KAKAO_JS_KEY as string | undefined
  if (!key || !window.Kakao) return false
  if (!window.Kakao.isInitialized()) window.Kakao.init(key)
  return true
}

export function shareLogToKakao(
  log: Pick<DailyLog, 'date' | 'condition' | 'training' | 'duration' | 'painArea' | 'goal'>
) {
  if (!initKakao()) return

  const condition = log.condition ?? 3
  const stars = '★'.repeat(condition) + '☆'.repeat(5 - condition)

  const lines: string[] = [
    `📋 훈련일지 · ${formatKoreanDate(log.date)}`,
    `컨디션: ${stars}`,
  ]
  if (log.duration) lines.push(`운동 시간: ${log.duration}분`)
  if (log.goal?.trim()) lines.push(`목표: ${log.goal.trim()}`)
  if (log.training?.trim()) {
    const t = log.training.trim()
    lines.push(`훈련: ${t.length > 60 ? t.slice(0, 60) + '…' : t}`)
  }
  if (log.painArea?.trim()) lines.push(`⚠️ 통증: ${log.painArea.trim()}`)

  window.Kakao.Share.sendDefault({
    objectType: 'text',
    text: lines.join('\n'),
    link: {
      mobileWebUrl: window.location.href,
      webUrl: window.location.href,
    },
  })
}
