import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'

import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import DataTable from '../components/ui/DataTable'
import Icon from '../components/ui/Icon'
import Input from '../components/ui/Input'
import Loader from '../components/ui/Loader'
import PageHeader from '../components/ui/PageHeader'
import Select from '../components/ui/Select'
import StatCard from '../components/ui/StatCard'
import { createStudent, deleteStudent, getDashboardData, getStudents, getStoredUser } from '../services/api'
import type { DashboardResponse, Department, Student } from '../types'

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
  const user = getStoredUser()
  const [students, setStudents] = useState<Student[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const loadStudents = async () => {
    const response = await getStudents()
    setStudents(response.students)
    setDepartments(response.departments)
  }

  useEffect(() => {
    setLoading(true)
    if (user?.role === 'admin') {
      loadStudents()
        .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load students'))
        .finally(() => setLoading(false))
      return
    }
    getDashboardData()
      .then(setDashboard)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load student dashboard'))
      .finally(() => setLoading(false))
  }, [user?.role])

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
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
    } finally {
      setSubmitting(false)
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
        <PageHeader
          eyebrow="Student Desk"
          title="Student Overview"
          description="Review your current stats and latest timetable availability in one focused view."
        />

        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">{error}</div> : null}

        {loading ? (
          <Card>
            <CardContent className="flex min-h-[220px] items-center justify-center">
              <Loader label="Loading student dashboard..." />
            </CardContent>
          </Card>
        ) : dashboard ? (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Object.entries(dashboard.stats).map(([key, value]) => (
                <StatCard
                  key={key}
                  label={key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())}
                  value={value}
                  icon={<Icon name={key.includes('department') ? 'building' : key.includes('semester') ? 'calendar' : 'students'} className="h-5 w-5" />}
                />
              ))}
            </section>

            <Card>
              <CardHeader>
                <CardTitle>Recent timetables</CardTitle>
                <p className="mt-1 text-sm text-gray-500">Recently published schedules relevant to your department and semester.</p>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={[
                    { key: 'department', title: 'Department', render: (item) => item.department_name || 'N/A' },
                    { key: 'semester', title: 'Semester', render: (item) => `Semester ${item.semester}` },
                    { key: 'year', title: 'Academic Year', render: (item) => item.academic_year },
                    { key: 'status', title: 'Status', render: (item) => <Badge tone={item.status === 'active' ? 'success' : 'neutral'}>{item.status}</Badge> },
                  ]}
                  rows={dashboard.recent_timetables}
                  getRowKey={(item) => item.id}
                  emptyTitle="No recent timetables"
                  emptyDescription="Your latest semester schedules will appear here when published."
                />
              </CardContent>
            </Card>
          </>
        ) : null}
      </>
    )
  }

  return (
    <>
      <PageHeader
        eyebrow="Admissions"
        title="Students"
        description="Manage student access, enrollment data, and semester mapping in a more polished workspace."
        actions={
          <Button onClick={() => setShowForm((value) => !value)}>
            <Icon name="plus" className="h-4 w-4" />
            {showForm ? 'Close form' : 'Add Student'}
          </Button>
        }
      />

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">{error}</div> : null}

      {showForm ? (
        <Card>
          <CardContent>
            <form className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" onSubmit={onSubmit}>
              <Input label="Full name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
              <Input label="Roll number" value={form.roll_number} onChange={(event) => setForm({ ...form, roll_number: event.target.value })} required />
              <Input label="Email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
              <Select label="Department" value={form.department_id} onChange={(event) => setForm({ ...form, department_id: event.target.value })} required>
                <option value="">Select department</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </Select>
              <Select label="Semester" value={form.semester} onChange={(event) => setForm({ ...form, semester: event.target.value })} required>
                {Array.from({ length: 8 }, (_, index) => index + 1).map((semester) => (
                  <option key={semester} value={semester}>
                    Semester {semester}
                  </option>
                ))}
              </Select>
              <Input label="Phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
              <Input label="Username" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} required />
              <Input label="Password" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
              <div className="md:col-span-2 xl:col-span-3 flex flex-wrap gap-3">
                <Button type="submit" loading={submitting}>
                  Create Student
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
              <Loader label="Loading students..." />
            </div>
          ) : (
            <DataTable
              columns={[
                { key: 'name', title: 'Name', render: (student) => <span className="font-medium text-gray-900">{student.name}</span> },
                { key: 'roll', title: 'Roll No', render: (student) => student.roll_number },
                { key: 'department', title: 'Department', render: (student) => student.department_name || 'N/A' },
                { key: 'semester', title: 'Semester', render: (student) => `Semester ${student.semester}` },
                { key: 'email', title: 'Email', render: (student) => student.email },
                { key: 'username', title: 'Username', render: (student) => student.username || 'N/A' },
                {
                  key: 'status',
                  title: 'Status',
                  render: (student) => <Badge tone={student.is_active ? 'success' : 'danger'}>{student.is_active ? 'Active' : 'Inactive'}</Badge>,
                },
                {
                  key: 'actions',
                  title: 'Actions',
                  render: (student) => (
                    <Button variant="danger" size="sm" onClick={() => onDelete(student.id)}>
                      <Icon name="trash" className="h-4 w-4" />
                      Delete
                    </Button>
                  ),
                },
              ]}
              rows={students}
              getRowKey={(student) => student.id}
              emptyTitle="No students available"
              emptyDescription="Create a student record to begin enrollment and timetable mapping."
            />
          )}
        </CardContent>
      </Card>
    </>
  )
}

export default StudentPage
