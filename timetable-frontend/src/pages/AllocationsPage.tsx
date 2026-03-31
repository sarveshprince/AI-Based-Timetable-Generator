import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  createAllocation,
  deleteAllocation,
  getAllocations,
  getFacultyByDept,
  getSubjectsByDeptSem,
} from '../services/api'
import type { Allocation, Department } from '../types'

const AllocationsPage = () => {
  const [allocations, setAllocations] = useState<Allocation[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [subjects, setSubjects] = useState<{ id: number; name: string; code: string }[]>([])
  const [faculty, setFaculty] = useState<{ id: number; name: string; employee_id: string }[]>([])
  const [departmentId, setDepartmentId] = useState<number | ''>('')
  const [semester, setSemester] = useState<number | ''>('')
  const [subjectId, setSubjectId] = useState<number | ''>('')
  const [facultyId, setFacultyId] = useState<number | ''>('')
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    const response = await getAllocations()
    setAllocations(response.allocations)
    setDepartments(response.departments)
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load allocations'))
  }, [])

  useEffect(() => {
    if (!departmentId) {
      setFaculty([])
      return
    }
    getFacultyByDept(departmentId)
      .then((response) => setFaculty(response.faculty))
      .catch(() => setFaculty([]))
  }, [departmentId])

  useEffect(() => {
    if (!departmentId || !semester) {
      setSubjects([])
      return
    }
    getSubjectsByDeptSem(departmentId, semester)
      .then((response) => setSubjects(response.subjects))
      .catch(() => setSubjects([]))
  }, [departmentId, semester])

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!subjectId || !facultyId) {
      return
    }
    try {
      await createAllocation({ subject_id: Number(subjectId), faculty_id: Number(facultyId) })
      setSubjectId('')
      setFacultyId('')
      setShowForm(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save allocation')
    }
  }

  const onDelete = async (id: number) => {
    if (!window.confirm('Delete this item?')) {
      return
    }
    await deleteAllocation(id)
    await load()
  }

  return (
    <div className="dashboard-section">
      <div className="page-actions">
        <h2 className="section-title">
          <i className="fas fa-link" /> Subject-Faculty Allocation
        </h2>
        <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
          <i className="fas fa-plus" /> Allocate Subject
        </button>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      {showForm && (
        <div className="inline-form-card">
          <h3>Allocate Subject to Faculty</h3>
          <form onSubmit={onSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label>Department</label>
                <select className="form-control" value={departmentId} onChange={(event) => setDepartmentId(event.target.value ? Number(event.target.value) : '')} required>
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
                <select className="form-control" value={semester} onChange={(event) => setSemester(event.target.value ? Number(event.target.value) : '')} required>
                  <option value="">Select Semester</option>
                  {Array.from({ length: 8 }, (_, index) => index + 1).map((item) => (
                    <option key={item} value={item}>
                      Semester {item}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Subject</label>
                <select className="form-control" value={subjectId} onChange={(event) => setSubjectId(event.target.value ? Number(event.target.value) : '')} required>
                  <option value="">First select department & semester</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name} ({subject.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Faculty</label>
                <select className="form-control" value={facultyId} onChange={(event) => setFacultyId(event.target.value ? Number(event.target.value) : '')} required>
                  <option value="">First select department</option>
                  {faculty.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.employee_id})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="action-buttons">
              <button type="submit" className="btn btn-success">
                <i className="fas fa-save" /> Allocate
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
            <th>Subject</th>
            <th>Code</th>
            <th>Faculty</th>
            <th>Department</th>
            <th>Semester</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {allocations.map((allocation) => (
            <tr key={allocation.id}>
              <td>{allocation.subject_name}</td>
              <td>{allocation.subject_code}</td>
              <td>{allocation.faculty_name}</td>
              <td>{allocation.department_name}</td>
              <td>{allocation.semester}</td>
              <td>
                <button type="button" className="btn btn-sm btn-danger" onClick={() => onDelete(allocation.id)}>
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

export default AllocationsPage
