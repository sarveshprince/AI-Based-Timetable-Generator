import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'

import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { Card, CardContent } from '../components/ui/Card'
import DataTable from '../components/ui/DataTable'
import Icon from '../components/ui/Icon'
import Input from '../components/ui/Input'
import Loader from '../components/ui/Loader'
import PageHeader from '../components/ui/PageHeader'
import Select from '../components/ui/Select'
import { createFaculty, deleteFaculty, getFaculty, getStoredUser } from '../services/api'
import type { Department, Faculty } from '../types'

const emptyForm = {
  name: '',
  email: '',
  department_id: '',
  employee_id: '',
  phone: '',
  username: '',
  password: '',
}

const FacultyPage = () => {
  const user = getStoredUser()
  const [faculty, setFaculty] = useState<Faculty[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    const response = await getFaculty()
    setFaculty(response.faculty)
    setDepartments(response.departments)
  }

  useEffect(() => {
    load()
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load faculty'))
      .finally(() => setLoading(false))
  }, [])

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await createFaculty({
        ...form,
        department_id: Number(form.department_id),
      })
      setForm(emptyForm)
      setShowForm(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save faculty')
    } finally {
      setSubmitting(false)
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
    <>
      <PageHeader
        eyebrow={user?.role === 'admin' ? 'Administration' : 'Faculty'}
        title="Faculty"
        description="Review faculty members, credentials, and department assignments in a cleaner operational view."
        actions={
          user?.role === 'admin' ? (
            <Button onClick={() => setShowForm((value) => !value)}>
              <Icon name="plus" className="h-4 w-4" />
              {showForm ? 'Close form' : 'Add Faculty'}
            </Button>
          ) : null
        }
      />

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">{error}</div> : null}

      {showForm && user?.role === 'admin' ? (
        <Card>
          <CardContent>
            <form className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" onSubmit={onSubmit}>
              <Input label="Full name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
              <Input label="Email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
              <Select label="Department" value={form.department_id} onChange={(event) => setForm({ ...form, department_id: event.target.value })} required>
                <option value="">Select department</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </Select>
              <Input label="Employee ID" value={form.employee_id} onChange={(event) => setForm({ ...form, employee_id: event.target.value })} required />
              <Input label="Phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
              <Input label="Username" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} required />
              <Input label="Password" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
              <div className="md:col-span-2 xl:col-span-3 flex flex-wrap gap-3">
                <Button type="submit" loading={submitting}>
                  Create Faculty
                </Button>
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent>
          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <Loader label="Loading faculty..." />
            </div>
          ) : (
            <DataTable
              columns={[
                { key: 'name', title: 'Name', render: (item) => <span className="font-medium text-gray-900">{item.name}</span> },
                { key: 'department', title: 'Department', render: (item) => item.department_name || 'N/A' },
                { key: 'employee', title: 'Employee ID', render: (item) => item.employee_id },
                { key: 'username', title: 'Username', render: (item) => item.username || 'N/A' },
                {
                  key: 'status',
                  title: 'Status',
                  render: (item) => <Badge tone={item.is_active ? 'success' : 'danger'}>{item.is_active ? 'Active' : 'Inactive'}</Badge>,
                },
                {
                  key: 'actions',
                  title: 'Actions',
                  render: (item) =>
                    user?.role === 'admin' ? (
                      <Button variant="danger" size="sm" onClick={() => onDelete(item.id)}>
                        <Icon name="trash" className="h-4 w-4" />
                        Delete
                      </Button>
                    ) : (
                      <Badge tone="info">Profile</Badge>
                    ),
                },
              ]}
              rows={faculty}
              getRowKey={(item) => item.id}
              emptyTitle="No faculty records"
              emptyDescription="Faculty members will appear here after they are created."
            />
          )}
        </CardContent>
      </Card>
    </>
  )
}

export default FacultyPage
