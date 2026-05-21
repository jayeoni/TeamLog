import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuthStore } from '../../store/authStore'
import { formatKoreanDate, todayYMD } from '../../utils/dateUtils'
import ConditionStars from '../../components/shared/ConditionStars'
import { Save, ChevronLeft, Share2 } from 'lucide-react'
import { shareLogToKakao } from '../../utils/kakaoShare'
import type { DailyLog } from '../../types'

export default function AthleteLogPage() {
  const { date } = useParams<{ date: string }>()
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const ymd = date ?? todayYMD()
  const isFuture = ymd > todayYMD()

  const [existing, setExisting] = useState<DailyLog | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [goal, setGoal] = useState('')
  const [training, setTraining] = useState('')
  const [condition, setCondition] = useState(3)
  const [startTime, setStartTime] = useState('')
  const [duration, setDuration] = useState('')
  const [sleep, setSleep] = useState('')
  const [weight, setWeight] = useState('')
  const [painArea, setPainArea] = useState('')
  const [selfReview, setSelfReview] = useState('')

  useEffect(() => {
    if (!user) return
    const fetchLog = async () => {
      try {
        const q = query(
          collection(db, 'dailyLogs'),
          where('athleteId', '==', user.id),
          where('date', '==', ymd)
        )
        const snap = await getDocs(q)
        if (!snap.empty) {
          const data = snap.docs[0].data() as Omit<DailyLog, 'id'>
          const log = { id: snap.docs[0].id, ...data }
          setExisting(log)
          setGoal(log.goal ?? '')
          setTraining(log.training ?? '')
          setCondition(log.condition ?? 3)
          setStartTime(log.startTime ?? '')
          setDuration(log.duration != null ? String(log.duration) : '')
          setSleep(log.sleep != null ? String(log.sleep) : '')
          setWeight(log.weight != null ? String(log.weight) : '')
          setPainArea(log.painArea ?? '')
          setSelfReview(log.selfReview ?? '')
        }
      } finally {
        setLoading(false)
      }
    }
    fetchLog()
  }, [user, ymd])

  const handleSave = async () => {
    if (!user || isFuture) return
    setSaving(true)
    try {
      const payload = {
        athleteId: user.id,
        athleteName: user.name,
        teamId: user.teamId ?? '',
        date: ymd,
        goal: goal.trim(),
        training: training.trim(),
        condition,
        startTime: startTime || null,
        duration: duration !== '' ? parseInt(duration, 10) : null,
        sleep: sleep !== '' ? parseFloat(sleep) : null,
        weight: weight !== '' ? parseFloat(weight) : null,
        painArea: painArea.trim(),
        selfReview: selfReview.trim(),
        updatedAt: new Date().toISOString(),
      }

      if (existing) {
        await updateDoc(doc(db, 'dailyLogs', existing.id), payload)
        setExisting({ ...existing, ...payload })
      } else {
        const ref = await addDoc(collection(db, 'dailyLogs'), {
          ...payload,
          coachFeedback: null,
          coachFeedbackAt: null,
          coachId: null,
          status: 'submitted',
          createdAt: new Date().toISOString(),
        })
        setExisting({
          id: ref.id,
          ...payload,
          coachFeedback: null,
          coachFeedbackAt: null,
          coachId: null,
          status: 'submitted',
          createdAt: payload.updatedAt,
        })
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="card h-96 animate-pulse" />

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="btn-ghost !p-1.5 -ml-1">
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="kicker">$ log.edit --date={ymd}</div>
          <div className="font-mono text-lg font-semibold tracking-tight text-[var(--color-pulse-ink)]">
            {formatKoreanDate(ymd)}
          </div>
        </div>
        {existing && <span className="badge-green">submitted</span>}
        {isFuture && <span className="badge-orange">미래 날짜</span>}
      </div>

      {/* Form */}
      <div className="card p-5 space-y-0">
        <Row code="00" kicker="condition" hint="// 오늘의 컨디션 1–5">
          <ConditionStars value={condition} onChange={isFuture ? undefined : setCondition} />
        </Row>

        <Row code="01" kicker="goal" hint="// 오늘 이루고 싶은 것">
          <input
            type="text"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="input-field"
            placeholder="목표를 입력하세요"
            disabled={isFuture}
          />
        </Row>

        <Row code="02" kicker="training" hint="// 어떤 훈련을 했나요">
          <textarea
            value={training}
            onChange={(e) => setTraining(e.target.value)}
            className="input-field min-h-[96px] resize-none"
            placeholder="훈련 내용"
            disabled={isFuture}
          />
        </Row>

        <Row code="03" kicker="time" hint="// 시작 시각 / 운동 시간(분)">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="input-field input-mono"
              disabled={isFuture}
            />
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="input-field input-mono"
              placeholder="90"
              min="0"
              max="600"
              disabled={isFuture}
            />
          </div>
        </Row>

        <Row code="04" kicker="metrics" hint="// 수면(h) / 체중(kg)">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              value={sleep}
              onChange={(e) => setSleep(e.target.value)}
              className="input-field input-mono"
              placeholder="7.5"
              step="0.5"
              min="0"
              max="24"
              disabled={isFuture}
            />
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="input-field input-mono"
              placeholder="50.5"
              step="0.1"
              min="20"
              disabled={isFuture}
            />
          </div>
        </Row>

        <Row code="05" kicker="pain.area" hint="// 통증·부상 부위 (없으면 비워두세요)">
          <input
            type="text"
            value={painArea}
            onChange={(e) => setPainArea(e.target.value)}
            className="input-field"
            placeholder="예: 왼쪽 무릎"
            disabled={isFuture}
          />
        </Row>

        <Row code="06" kicker="self.review" hint="// 오늘 스스로의 평가">
          <textarea
            value={selfReview}
            onChange={(e) => setSelfReview(e.target.value)}
            className="input-field min-h-[80px] resize-none"
            placeholder="자기 평가"
            disabled={isFuture}
          />
        </Row>

        {/* Actions */}
        {!isFuture && (
          <div className="flex flex-wrap items-center gap-2 pt-4 mt-2 border-t hairline">
            <button
              onClick={handleSave}
              disabled={saving || saved}
              className="btn-primary"
            >
              <Save size={13} />
              {saved ? 'saved ✓' : saving ? 'saving...' : existing ? 'update_log()' : 'save_log()'}
            </button>
            {existing && (
              <button onClick={() => shareLogToKakao(existing)} className="btn-outline">
                <Share2 size={13} />
                share_kakao()
              </button>
            )}
            <span className="ml-auto font-mono text-[10px] text-[var(--color-pulse-sub2)]">
              ⌘S to save
            </span>
          </div>
        )}
      </div>

      {/* Coach feedback */}
      {existing?.coachFeedback && (
        <div className="card p-5">
          <div className="flex items-baseline justify-between mb-2">
            <span className="label !mb-0">coach.feedback</span>
            {existing.coachFeedbackAt && (
              <span className="font-mono text-[10px] text-[var(--color-pulse-sub2)]">
                {new Date(existing.coachFeedbackAt).toLocaleDateString('ko-KR')}
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--color-pulse-ink)] leading-relaxed">{existing.coachFeedback}</p>
        </div>
      )}
    </div>
  )
}

function Row({
  code, kicker, hint, children,
}: { code: string; kicker: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-5 py-3 border-t hairline first:border-t-0 first:pt-0">
      <div>
        <div className="font-mono text-[10px] text-[var(--color-pulse-sub)]">
          <span className="text-[var(--color-pulse-sub2)]">[{code}]</span> {kicker}
        </div>
        {hint && (
          <div className="font-mono text-[9px] text-[var(--color-pulse-sub2)] mt-1 leading-relaxed">{hint}</div>
        )}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}
