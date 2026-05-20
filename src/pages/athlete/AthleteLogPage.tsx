import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuthStore } from '../../store/authStore'
import { formatKoreanDate, todayYMD } from '../../utils/dateUtils'
import ConditionStars from '../../components/shared/ConditionStars'
import { Save, ChevronLeft, MessageSquare } from 'lucide-react'
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
          setDuration(log.duration !== null && log.duration !== undefined ? String(log.duration) : '')
          setSleep(log.sleep !== null && log.sleep !== undefined ? String(log.sleep) : '')
          setWeight(log.weight !== null && log.weight !== undefined ? String(log.weight) : '')
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
        setExisting({ id: ref.id, ...payload, coachFeedback: null, coachFeedbackAt: null, coachId: null, status: 'submitted', createdAt: payload.updatedAt })
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="card h-96 animate-pulse" />
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2 -ml-2">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">{formatKoreanDate(ymd)}</h2>
          {isFuture && <p className="text-xs text-orange-500">미래 날짜는 작성할 수 없습니다.</p>}
        </div>
      </div>

      {/* Form */}
      <div className="card p-5 space-y-5">
        {/* Condition */}
        <div>
          <label className="label">오늘의 컨디션</label>
          <ConditionStars value={condition} onChange={isFuture ? undefined : setCondition} />
        </div>

        {/* Goal */}
        <div>
          <label className="label">오늘의 목표</label>
          <input
            type="text"
            value={goal}
            onChange={e => setGoal(e.target.value)}
            className="input-field"
            placeholder="오늘 이루고 싶은 것을 적어주세요"
            disabled={isFuture}
          />
        </div>

        {/* Training */}
        <div>
          <label className="label">훈련 내용</label>
          <textarea
            value={training}
            onChange={e => setTraining(e.target.value)}
            className="input-field min-h-[100px] resize-none"
            placeholder="오늘 어떤 훈련을 했나요?"
            disabled={isFuture}
          />
        </div>

        {/* Training time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">시작 시간</label>
            <input
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className="input-field"
              disabled={isFuture}
            />
          </div>
          <div>
            <label className="label">운동 시간 (분)</label>
            <input
              type="number"
              value={duration}
              onChange={e => setDuration(e.target.value)}
              className="input-field"
              placeholder="90"
              min="0"
              max="600"
              disabled={isFuture}
            />
          </div>
        </div>

        {/* Metrics row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">수면 시간 (h)</label>
            <input
              type="number"
              value={sleep}
              onChange={e => setSleep(e.target.value)}
              className="input-field"
              placeholder="7.5"
              step="0.5"
              min="0"
              max="24"
              disabled={isFuture}
            />
          </div>
          <div>
            <label className="label">체중 (kg)</label>
            <input
              type="number"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              className="input-field"
              placeholder="50.5"
              step="0.1"
              min="20"
              disabled={isFuture}
            />
          </div>
        </div>

        {/* Pain */}
        <div>
          <label className="label">통증 / 부상 부위</label>
          <input
            type="text"
            value={painArea}
            onChange={e => setPainArea(e.target.value)}
            className="input-field"
            placeholder="예: 왼쪽 무릎 통증 (없으면 비워두세요)"
            disabled={isFuture}
          />
        </div>

        {/* Self review */}
        <div>
          <label className="label">자기 평가</label>
          <textarea
            value={selfReview}
            onChange={e => setSelfReview(e.target.value)}
            className="input-field min-h-[80px] resize-none"
            placeholder="오늘 훈련을 스스로 어떻게 평가하나요?"
            disabled={isFuture}
          />
        </div>

        {!isFuture && (
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <Save size={16} />
            {saved ? '저장됨 ✓' : saving ? '저장 중...' : existing ? '일지 수정' : '일지 저장'}
          </button>
        )}
      </div>

      {/* Coach feedback */}
      {existing?.coachFeedback && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare size={16} className="text-indigo-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">코치 피드백</h3>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{existing.coachFeedback}</p>
          {existing.coachFeedbackAt && (
            <p className="text-xs text-gray-400 mt-2">
              {new Date(existing.coachFeedbackAt).toLocaleDateString('ko-KR')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
