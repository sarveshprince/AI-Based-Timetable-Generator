import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { createSubject, deleteSubject, getSubjects } from '../services/api'
import type { Department, Subject } from '../types'

const emptyForm = {
  name: '',
  code: '',
  department_id: '',
  semester: '1',
  credits: '',
  hours_per_week: '',
  subject_type: 'theory',
}

const SubjectsPage = () => {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [semesterFilter, setSemesterFilter] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')

  const load = async (departmentId = departmentFilter, semester = semesterFilter) => {
    const response = await getSubjects(departmentId, semester)
    setSubjects(response.subjects)
    setDepartments(response.departments)
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load subjects'))
  }, [])

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    try {
      await createSubject({
        ...form,
        department_id: Number(form.department_id),
        semester: Number(form.semester),
        credits: Number(form.credits),
        hours_per_week: Number(form.hours_per_week),
      })
      setForm(emptyForm)
      setShowForm(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save subject')
    }
  }

  const onFilter = async (event: FormEvent) => {
    event.preventDefault()
    await load(departmentFilter, semesterFilter)
  }

  const onDelete = async (id: number) => {
    if (!window.confirm('Delete this item?')) {
      return
    }
    await deleteSubject(id)
    await load()
  }

  return (
    <div className="dashboard-section">
      <div className="page-actions">
        <h2 className="section-title">
          <i className="fas fa-book" /> Subjects
        </h2>
        <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
          <i className="fas fa-plus" /> Add Subject
        </button>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={onFilter} className="filter-row">
        <select className="form-control narrow-control" value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
          <option value="">All Departments</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
        <select className="form-control narrow-control" value={semesterFilter} onChange={(event) => setSemesterFilter(event.target.value)}>
          <option value="">All Semesters</option>
          {Array.from({ length: 8 }, (_, index) => index + 1).map((semester) => (
            <option key={semester} value={semester}>
              Semester {semester}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-secondary">
          Filter
        </button>
      </form>
      {showForm && (
        <div className="inline-form-card">
          <h3>Add Subject</h3>
          <form onSubmit={onSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label>Name</label>
                <input className="form-control" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
              </div>
              <div className="form-group">
                <label>Code</label>
                <input className="form-control" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} required />
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
                <label>Credits</label>
                <input className="form-control" type="number" value={form.credits} onChange={(event) => setForm({ ...form, credits: event.target.value })} required />
              </div>
              <div className="form-group">
                <label>Hours/Week</label>
                <input className="form-control" type="number" value={form.hours_per_week} onChange={(event) => setForm({ ...form, hours_per_week: event.target.value })} required />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select className="form-control" value={form.subject_type} onChange={(event) => setForm({ ...form, subject_type: event.target.value })}>
                  <option value="theory">Theory</option>
                  <option value="lab">Lab</option>
                  <option value="practical">Practical</option>
                </select>
              </div>
            </div>
            <div className="action-buttons">
              <button type="submit" className="btn btn-success">
                <i className="fas fa-save" /> Save
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
            <th>Code</th>
            <th>Department</th>
            <th>Semester</th>
            <th>Credits</th>
            <th>Hours</th>
            <th>Type</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {subjects.map((subject) => (
            <tr key={subject.id}>
              <td>{subject.name}</td>
              <td>{subject.code}</td>
              <td>{subject.department_name}</td>
              <td>{subject.semester}</td>
              <td>{subject.credits}</td>
              <td>{subject.hours_per_week}</td>
              <td>{subject.subject_type}</td>
              <td>
                <button type="button" className="btn btn-sm btn-danger" onClick={() => onDelete(subject.id)}>
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

export default SubjectsPage
