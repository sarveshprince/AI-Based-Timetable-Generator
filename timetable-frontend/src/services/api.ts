import type {
  Allocation,
  CreateDepartmentPayload,
  DashboardResponse,
  Department,
  DepartmentSectionInput,
  Faculty,
  Notification,
  Student,
  Subject,
  TimetableDetail,
  TimetableAdjustPayload,
  TimetableAdjustResponse,
  TimetableGenerationPayload,
  TimetableSummary,
  User,
} from '../types'

const API_BASE = 'http://127.0.0.1:5000/api'
export const API_ORIGIN = API_BASE.replace('/api', '')
const TOKEN_KEY = 'token'
const USER_KEY = 'user'

type RequestOptions = {
  method?: 'GET' | 'POST' | 'DELETE'
  body?: unknown
  auth?: boolean
}

const getToken = () => localStorage.getItem(TOKEN_KEY)

const buildHeaders = (auth = true) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (auth) {
    const token = getToken()
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
  }
  return headers
}

const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method || 'GET',
    headers: buildHeaders(options.auth ?? true),
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    if (response.status === 401) {
      clearSession()
    }
    throw new Error(payload.message || 'Request failed')
  }
  return payload as T
}

export const persistSession = (token: string, user: User) => {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export const getStoredUser = (): User | null => {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) {
    return null
  }
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export const loginUser = async (email: string, password: string) =>
  request<{ token: string; user: User }>('/login', {
    method: 'POST',
    auth: false,
    body: { email, password },
  })

export const getCurrentUser = async () => request<{ user: User }>('/me')

export const logout = () => clearSession()

export const getDashboardData = async () => request<DashboardResponse>('/dashboard')

export const getDepartments = async () => request<{ departments: Department[] }>('/departments')

export const createDepartment = async (payload: CreateDepartmentPayload) =>
  request<{ message: string; department_id: number }>('/departments', { method: 'POST', body: payload })

export const createSection = async (payload: {
  name: string
  department_id: number
  year: number
  semester: number
  section: string
  strength: number
}) => request<{ section: DepartmentSectionInput & { id: number } }>('/sections', { method: 'POST', body: payload })

export const deleteDepartment = async (id: number) =>
  request<{ success: boolean }>(`/departments/${id}`, { method: 'DELETE' })

export const getFaculty = async () =>
  request<{ faculty: Faculty[]; departments: Department[] }>('/faculty')

export const createFaculty = async (payload: Record<string, unknown>) =>
  request<{ faculty: Faculty }>('/faculty', { method: 'POST', body: payload })

export const deleteFaculty = async (id: number) =>
  request<{ success: boolean }>(`/faculty/${id}`, { method: 'DELETE' })

export const getStudents = async () =>
  request<{ students: Student[]; departments: Department[] }>('/students')

export const createStudent = async (payload: Record<string, unknown>) =>
  request<{ student: Student }>('/students', { method: 'POST', body: payload })

export const deleteStudent = async (id: number) =>
  request<{ success: boolean }>(`/students/${id}`, { method: 'DELETE' })

export const getSubjects = async (departmentId?: string, semester?: string) => {
  const params = new URLSearchParams()
  if (departmentId) {
    params.set('department_id', departmentId)
  }
  if (semester) {
    params.set('semester', semester)
  }
  const query = params.toString() ? `?${params.toString()}` : ''
  return request<{ subjects: Subject[]; departments: Department[]; filters: { department_id: string; semester: string } }>(
    `/subjects${query}`,
  )
}

export const createSubject = async (payload: Record<string, unknown>) =>
  request<{ subject: Subject }>('/subjects', { method: 'POST', body: payload })

export const deleteSubject = async (id: number) =>
  request<{ success: boolean }>(`/subjects/${id}`, { method: 'DELETE' })

export const getAllocations = async () =>
  request<{ allocations: Allocation[]; departments: Department[] }>('/subject-allocations')

export const createAllocation = async (payload: { subject_id: number; faculty_id: number; section_id: number }) =>
  request<{ allocation: Allocation }>('/subject-allocations', { method: 'POST', body: payload })

export const deleteAllocation = async (id: number) =>
  request<{ success: boolean }>(`/subject-allocations/${id}`, { method: 'DELETE' })

export const getSubjectsByDeptSem = async (deptId: number | '', semester: number | '') =>
  request<{ subjects: Pick<Subject, 'id' | 'name' | 'code'>[] }>(
    `/subjects-by-dept-sem?dept_id=${deptId}&semester=${semester}`,
  )

export const getFacultyByDept = async (deptId: number | '') =>
  request<{ faculty: Pick<Faculty, 'id' | 'name' | 'employee_id'>[] }>(`/faculty-by-dept?dept_id=${deptId}`)

export const getNotifications = async () => request<{ notifications: Notification[] }>('/notifications')

export const getTimetables = async () => request<{ timetables: TimetableSummary[] }>('/timetables')

export const getTimetable = async (id?: number) => {
  const query = id ? `?id=${id}` : ''
  return request<TimetableDetail>(`/timetable${query}`)
}

export const generateTimetable = async (payload: TimetableGenerationPayload) =>
  request<TimetableDetail & { message: string }>('/generate-timetable', {
    method: 'POST',
    body: payload,
  })

export const downloadReport = async (id: number) => {
  const response = await fetch(`${API_BASE}/timetable/${id}/report`, {
    headers: buildHeaders(true),
  })
  if (!response.ok) {
    throw new Error('Failed to download report')
  }
  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `timetable-${id}.pdf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export const updateTimetable = async (payload: Record<string, unknown>) =>
  request<{ message: string; success?: boolean }>('/timetable/update', {
    method: 'POST',
    body: payload,
  })

export const adjustTimetable = async (payload: TimetableAdjustPayload) =>
  request<TimetableAdjustResponse>('/timetable/adjust', {
    method: 'POST',
    body: payload,
  })
