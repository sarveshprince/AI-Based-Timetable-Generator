import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { createFaculty, deleteFaculty, getFaculty } from '../services/api'
import type { Department, Faculty, User } from '../types'

const emptyForm = {
  name: '',
  email: '',
  department_id: '',
  employee_id: '',
  phone: '',
  max_hours: '20',
  username: '',
  password: '',
}

const FacultyPage = () => {
  const user = JSON.parse(localStorage.getItem('user') || 'null') as User | null
  const [faculty, setFaculty] = useState<Faculty[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    const response = await getFaculty()
    setFaculty(response.faculty)
    setDepartments(response.departments)
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load faculty'))
  }, [])

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    try {
      await createFaculty({
        ...form,
        department_id: Number(form.department_id),
        max_hours: Number(form.max_hours),
      })
      setForm(emptyForm)
      setShowForm(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save faculty')
    }
  }

  const onDelete = async (id: number) => {
    if (!window.confirm('Delete this item?')) {
      return
    }
    await deleteFaculty(id)
    await load()
  }

  return (
    <div className="dashboard-section">
      <div className="page-actions">
        <h2 className="section-title">
          <i className="fas fa-chalkboard-teacher" /> Faculty
        </h2>
        {user?.role === 'admin' && (
          <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
            <i className="fas fa-plus" /> Add Faculty
          </button>
        )}
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      {showForm && user?.role === 'admin' && (
        <div className="inline-form-card">
          <h3>Add Faculty Member (with Login)</h3>
          <form onSubmit={onSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label>Name</label>
                <input className="form-control" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
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
                <label>Employee ID</label>
                <input className="form-control" value={form.employee_id} onChange={(event) => setForm({ ...form, employee_id: event.target.value })} required />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input className="form-control" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
              </div>
              <div className="form-group">
                <label>Max Hours/Week</label>
                <input className="form-control" type="number" value={form.max_hours} onChange={(event) => setForm({ ...form, max_hours: event.target.value })} required />
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
                <i className="fas fa-save" /> Create Account & Save
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
            <th>Department</th>
            <th>Employee ID</th>
            <th>Username</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {faculty.map((item) => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td>{item.department_name}</td>
              <td>{item.employee_id}</td>
              <td>{item.username}</td>
              <td>{item.is_active ? 'Active' : 'Inactive'}</td>
              <td>
                {user?.role === 'admin' ? (
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => onDelete(item.id)}>
                    <i className="fas fa-trash" />
                  </button>
                ) : (
                  <span className="badge badge-active">View</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default FacultyPage
