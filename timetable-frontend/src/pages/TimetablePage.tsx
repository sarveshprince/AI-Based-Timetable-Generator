import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  downloadReport,
  generateTimetable,
  getDepartments,
  getTimetable,
  getTimetables,
} from '../services/api'
import type { Department, TimetableDetail, TimetableSummary, User } from '../types'

const TimetablePage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [departments, setDepartments] = useState<Department[]>([])
  const [timetables, setTimetables] = useState<TimetableSummary[]>([])
  const [detail, setDetail] = useState<TimetableDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({
    department_id: '',
    semester: '1',
    academic_year: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
  })
  const user = JSON.parse(localStorage.getItem('user') || 'null') as User | null
  const timetableId = searchParams.get('id')

  const load = async (id?: number) => {
    setLoading(true)
    try {
      const [departmentResponse, timetableResponse, listResponse] = await Promise.all([
        getDepartments().catch(() => ({ departments: [] })),
        getTimetable(id),
        getTimetables(),
      ])
      setDepartments(departmentResponse.departments)
      setDetail(timetableResponse)
      setTimetables(listResponse.timetables)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load timetable')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(timetableId ? Number(timetableId) : undefined).catch(() => undefined)
  }, [timetableId])

  const onGenerate = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setMessage('')
    try {
      const response = await generateTimetable({
        department_id: Number(form.department_id),
        semester: Number(form.semester),
        academic_year: form.academic_year,
      })
      setMessage(response.message)
      const newId = response.timetable?.id
      if (newId) {
        setSearchParams({ id: String(newId) })
      }
      await load(newId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate timetable')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {user?.role === 'admin' && (
        <div className="dashboard-section">
          <h2 className="section-title">
            <i className="fas fa-magic" /> Generate Timetable
          </h2>
          <div className="highlight-panel">
            <h3>AI-Powered Generation</h3>
            <p>Select department and semester to generate an optimized, conflict-free timetable automatically.</p>
          </div>
          {error && <div className="alert alert-danger">{error}</div>}
          {message && <div className="alert alert-success">{message}</div>}
          <form onSubmit={onGenerate}>
            <div className="form-grid">
              <div className="form-group">
                <label>Department</label>
                <select className="form-control" value={form.department_id} onChange={(event) => setForm({ ...form, department_id: event.target.value })} required>
                  <option value="">Select Department</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Semester</label>
                <select className="form-control" value={form.semester} onChange={(event) => setForm({ ...form, semester: event.target.value })} required>
                  {Array.from({ length: 8 }, (_, index) => index + 1).map((semester) => (
                    <option key={semester} value={semester}>
                      Semester {semester}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Academic Year</label>
                <input className="form-control" value={form.academic_year} onChange={(event) => setForm({ ...form, academic_year: event.target.value })} required />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              <i className="fas fa-magic" /> {submitting ? 'Generating...' : 'Generate Timetable'}
            </button>
          </form>
        </div>
      )}
      <div className="dashboard-section">
        <h2 className="section-title">
          <i className="fas fa-calendar-check" /> All Timetables
        </h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Department</th>
              <th>Semester</th>
              <th>Academic Year</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {timetables.map((item) => (
              <tr key={item.id}>
                <td>{item.department_name}</td>
                <td>{item.semester}</td>
                <td>{item.academic_year}</td>
                <td>
                  <span className={`badge badge-${item.status}`}>{item.status}</span>
                </td>
                <td>{item.created_at}</td>
                <td>
                  <button type="button" className="btn btn-sm btn-primary" onClick={() => setSearchParams({ id: String(item.id) })}>
                    <i className="fas fa-eye" /> View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="timetable-view">
        {loading ? (
          <div>Loading timetable...</div>
        ) : detail?.timetable ? (
          <>
            <div className="timetable-header">
              <h2>
                {detail.timetable.department_name} - Semester {detail.timetable.semester}
              </h2>
              <p>
                <strong>Academic Year:</strong> {detail.timetable.academic_year}
              </p>
              <p>
                <strong>Status:</strong> <span className={`badge badge-${detail.timetable.status}`}>{detail.timetable.status}</span>
              </p>
            </div>
            <table className="timetable-table">
              <thead>
                <tr>
                  <th>Time</th>
                  {detail.days.map((day) => (
                    <th key={day}>{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {detail.time_slots.map((slot) => (
                  <tr key={slot}>
                    <td>{slot}</td>
                    {detail.days.map((day) => {
                      const cell = detail.grid[day]?.[slot] || null
                      return (
                        <td key={`${day}-${slot}`}>
                          {cell ? (
                            <div className="class-cell">
                              <div className="subject">{cell.subject_name}</div>
                              <div className="faculty">{cell.faculty_name}</div>
                              <div className="room">
                                {cell.building}-{cell.room_number}
                              </div>
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="action-buttons">
              <button type="button" className="btn btn-primary" onClick={() => detail.timetable && downloadReport(detail.timetable.id)}>
                <i className="fas fa-download" /> Download PDF
              </button>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <i className="fas fa-calendar-times" />
            <p>No timetable available</p>
          </div>
        )}
      </div>
    </>
  )
}

export default TimetablePage
