import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { createDepartment, deleteDepartment, getDepartments } from '../services/api'
import type { Department } from '../types'

const DepartmentsPage = () => {
  const [departments, setDepartments] = useState<Department[]>([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    const response = await getDepartments()
    setDepartments(response.departments)
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load departments'))
  }, [])

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    try {
      await createDepartment({ name, code })
      setName('')
      setCode('')
      setShowForm(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save department')
    }
  }

  const onDelete = async (id: number) => {
    if (!window.confirm('Delete this item?')) {
      return
    }
    await deleteDepartment(id)
    await load()
  }

  return (
    <div className="dashboard-section">
      <div className="page-actions">
        <h2 className="section-title">
          <i className="fas fa-building" /> Departments
        </h2>
        <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
          <i className="fas fa-plus" /> Add
        </button>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      {showForm && (
        <div className="inline-form-card">
          <h3>Add Department</h3>
          <form onSubmit={onSubmit}>
            <div className="form-group">
              <label>Name</label>
              <input className="form-control" value={name} onChange={(event) => setName(event.target.value)} required />
            </div>
            <div className="form-group">
              <label>Code</label>
              <input className="form-control" value={code} onChange={(event) => setCode(event.target.value)} required />
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
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {departments.map((department) => (
            <tr key={department.id}>
              <td>{department.name}</td>
              <td>{department.code}</td>
              <td>
                <button type="button" className="btn btn-sm btn-danger" onClick={() => onDelete(department.id)}>
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

export default DepartmentsPage
