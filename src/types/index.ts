export type Role = 'athlete' | 'coach'

export interface AppUser {
  id: string
  name: string
  email: string
  role: Role
  teamId: string | null
  sport: string
  specialty: string
  createdAt: string
}

export interface Team {
  id: string
  name: string
  code: string
  sport: string
  coachIds: string[]
  createdAt: string
}

export interface DailyLog {
  id: string
  athleteId: string
  athleteName: string
  teamId: string
  date: string
  goal: string
  training: string
  condition: number
  sleep: number | null
  weight: number | null
  painArea: string
  selfReview: string
  coachFeedback: string | null
  coachFeedbackAt: string | null
  coachId: string | null
  status: 'draft' | 'submitted'
  createdAt: string
  updatedAt: string
}

export interface CalendarStamp {
  date: string
  hasLog: boolean
  hasFeedback: boolean
  hasPain: boolean
  condition: number | null
}
