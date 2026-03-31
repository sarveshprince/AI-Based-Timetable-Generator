import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { createStudent, deleteStudent, getDashboardData, getStudents } from '../services/api'
import type { DashboardResponse, Department, Student, User } from '../types'

const emptyForm = {
  name: '',
  roll_number: '',
  email: '',
  department_id: '',
  semester: '1',
  phone: '',
  username: '',
  password: '',
}

const StudentPage = () => {
  const user = JSON.parse(localStorage.getItem('user') || 'null') as User | null
  const [students, setStudents] = useState<Student[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')

  const loadStudents = async () => {
    const response = await getStudents()
    setStudents(response.students)
    setDepartments(response.departments)
  }

  useEffect(() => {
    if (user?.role === 'admin') {
      loadStudents().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load students'))
      return
    }
    getDashboardData()
      .then(setDashboard)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load student dashboard'))
  }, [user?.role])

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    try {
      await createStudent({
        ...form,
        department_id: Number(form.department_id),
        semester: Number(form.semester),
      })
      setForm(emptyForm)
      setShowForm(false)
      await loadStudents()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save student')
    }
  }

  const onDelete = async (id: number) => {
    if (!window.confirm('Delete this item?')) {
      return
    }
    await deleteStudent(id)
    await loadStudents()
  }

  if (user?.role === 'student') {
    return (
      <>
        {error && <div className="alert alert-danger">{error}</div>}
        {dashboard && (
          <>
            <div className="stats-grid">
              {Object.entries(dashboard.stats).map(([key, value]) => (
                <div className="stat-card" key={key}>
                  <div className="stat-icon bg-blue">
                    <i className="fas fa-chart-bar" />
                  </div>
                  <div className="stat-content">
                    <h3>{value}</h3>
                    <p>{key.replace(/_/g, ' ')}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="dashboard-section">
              <h2 className="section-title">
                <i className="fas fa-calendar-check" /> Recent Timetables
              </h2>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>Semester</th>
                    <th>Academic Year</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.recent_timetables.map((item) => (
                    <tr key={item.id}>
                      <td>{item.department_name}</td>
                      <td>{item.semester}</td>
                      <td>{item.academic_year}</td>
                      <td>
                        <span className={`badge badge-${item.status}`}>{item.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </>
    )
  }

  return (
    <div className="dashboard-section">
      <div className="page-actions">
        <h2 className="section-title">
          <i className="fas fa-user-graduate" /> Students
        </h2>
        <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
          <i className="fas fa-plus" /> Add Student
        </button>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      {showForm && (
        <div className="inline-form-card">
          <h3>Add Student (with Login)</h3>
          <form onSubmit={onSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label>Name</label>
                <input className="form-control" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
              </div>
              <div className="form-group">
                <label>Roll Number</label>
                <input className="form-control" value={form.roll_number} onChange={(event) => setForm({ ...form, roll_number: event.target.value })} required />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input className="form-control" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
              </div>
              <div className="form-group">
                <label>Department</label>
                <select className="form-control" value={form.department_id} onChange={(event) => setForm({ ...form, department_id: event.target.value })} required>
                  <option value="">Select</option>
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
                <label>Phone</label>
                <input className="form-control" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
              </div>
              <div className="form-group">
                <label>Username</label>
                <input className="form-control" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} required />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input className="form-control" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
              </div>
            </div>
            <div className="action-buttons">
              <button type="submit" className="btn btn-success">
                <i className="fas fa-save" /> Create Account & Enroll
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Roll No</th>
            <th>Department</th>
            <th>Semester</th>
            <th>Email</th>
            <th>Username</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <tr key={student.id}>
              <td>{student.name}</td>
              <td>{student.roll_number}</td>
              <td>{student.department_name}</td>
              <td>{student.semester}</td>
              <td>{student.email}</td>
              <td>{student.username}</td>
              <td>{student.is_active ? 'Active' : 'Inactive'}</td>
              <td>
                <button type="button" className="btn btn-sm btn-danger" onClick={() => onDelete(student.id)}>
                  <i className="fas fa-trash" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default StudentPage
