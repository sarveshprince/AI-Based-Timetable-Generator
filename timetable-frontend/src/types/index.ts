export type User = {
  id: number
  username: string
  role: 'admin' | 'faculty' | 'student'
  full_name: string
  email: string
  linked_id: number | null
}

export type DashboardResponse = {
  stats: Record<string, string | number>
  recent_timetables: TimetableSummary[]
  user: User
}

export type Department = {
  id: number
  name: string
  code: string
  created_at?: string
}

export type Faculty = {
  id: number
  user_id: number | null
  name: string
  email: string
  department_id: number
  department_name?: string
  employee_id: string
  phone?: string
  max_hours_per_week: number
  username?: string
  is_active?: number
}

export type Student = {
  id: number
  user_id: number | null
  name: string
  roll_number: string
  department_id: number
  department_name?: string
  semester: number
  email: string
  phone?: string
  username?: string
  is_active?: boolean
}

export type Subject = {
  id: number
  name: string
  code: string
  department_id: number
  department_name?: string
  semester: number
  credits: number
  hours_per_week: number
  subject_type: string
}

export type Allocation = {
  id: number
  subject_id: number
  faculty_id: number
  department_id: number
  department_name?: string
  subject_name?: string
  subject_code?: string
  faculty_name?: string
  semester: number
}

export type Notification = {
  id: number
  message: string
  notification_type: string
  is_read: number
  created_at: string
}

export type TimetableSummary = {
  id: number
  semester: number
  academic_year: string
  department_id: number
  department_name?: string
  status: string
  created_at: string
}

export type TimetableCell = {
  id: number
  day: string
  time_slot: string
  subject_name: string
  subject_code: string
  faculty_name: string
  room_number: string
  building: string
}

export type TimetableDetail = {
  timetable: (TimetableSummary & { department_code?: string }) | null
  days: string[]
  time_slots: string[]
  grid: Record<string, Record<string, TimetableCell | null>>
  schedules: TimetableCell[]
}

export type TimetableGenerationPayload = {
  department_id: number
  semester: number
  academic_year: string
}

export type TimetableSlot = {
  day: string
  time: string
  subject?: string
  faculty?: string
  subjectCode?: string
  roomNumber?: string
  building?: string
}
