import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'

import Button from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'
import DataTable from '../components/ui/DataTable'
import Icon from '../components/ui/Icon'
import Input from '../components/ui/Input'
import Loader from '../components/ui/Loader'
import PageHeader from '../components/ui/PageHeader'
import Select from '../components/ui/Select'
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
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const load = async (departmentId = departmentFilter, semester = semesterFilter) => {
    const response = await getSubjects(departmentId, semester)
    setSubjects(response.subjects)
    setDepartments(response.departments)
  }

  useEffect(() => {
    load()
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load subjects'))
      .finally(() => setLoading(false))
  }, [])

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
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
    } finally {
      setSubmitting(false)
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
    <>
      <PageHeader
        eyebrow="Curriculum"
        title="Subjects"
        description="Manage the subject catalog and filter academic offerings by department or semester."
        actions={
          <Button onClick={() => setShowForm((value) => !value)}>
            <Icon name="plus" className="h-4 w-4" />
            {showForm ? 'Close form' : 'Add Subject'}
          </Button>
        }
      />

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">{error}</div> : null}

      <Card>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-[1fr_220px_auto]" onSubmit={onFilter}>
            <Select label="Department filter" value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
              <option value="">All departments</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </Select>
            <Select label="Semester filter" value={semesterFilter} onChange={(event) => setSemesterFilter(event.target.value)}>
              <option value="">All semesters</option>
              {Array.from({ length: 8 }, (_, index) => index + 1).map((semester) => (
                <option key={semester} value={semester}>
                  Semester {semester}
                </option>
              ))}
            </Select>
            <div className="flex items-end">
              <Button type="submit" variant="secondary">
                <Icon name="search" className="h-4 w-4" />
                Filter
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {showForm ? (
        <Card>
          <CardContent>
            <form className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" onSubmit={onSubmit}>
              <Input label="Subject name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
              <Input label="Code" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} required />
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
              <Input label="Credits" type="number" value={form.credits} onChange={(event) => setForm({ ...form, credits: event.target.value })} required />
              <Input label="Hours / week" type="number" value={form.hours_per_week} onChange={(event) => setForm({ ...form, hours_per_week: event.target.value })} required />
              <Select label="Subject type" value={form.subject_type} onChange={(event) => setForm({ ...form, subject_type: event.target.value })}>
                <option value="theory">Theory</option>
                <option value="lab">Lab</option>
                <option value="practical">Practical</option>
              </Select>
              <div className="md:col-span-2 xl:col-span-3 flex flex-wrap gap-3">
                <Button type="submit" loading={submitting}>
                  Save Subject
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
              <Loader label="Loading subjects..." />
            </div>
          ) : (
            <DataTable
              columns={[
                { key: 'name', title: 'Name', render: (subject) => <span className="font-medium text-gray-900">{subject.name}</span> },
                { key: 'code', title: 'Code', render: (subject) => subject.code },
                { key: 'department', title: 'Department', render: (subject) => subject.department_name || 'N/A' },
                { key: 'semester', title: 'Semester', render: (subject) => `Semester ${subject.semester}` },
                { key: 'credits', title: 'Credits', render: (subject) => subject.credits },
                { key: 'hours', title: 'Hours', render: (subject) => subject.hours_per_week },
                { key: 'type', title: 'Type', render: (subject) => subject.subject_type },
                {
                  key: 'actions',
                  title: 'Actions',
                  render: (subject) => (
                    <Button variant="danger" size="sm" onClick={() => onDelete(subject.id)}>
                      <Icon name="trash" className="h-4 w-4" />
                      Delete
                    </Button>
                  ),
                },
              ]}
              rows={subjects}
              getRowKey={(subject) => subject.id}
              emptyTitle="No subjects matched"
              emptyDescription="Adjust your filters or add a new subject to continue."
            />
          )}
        </CardContent>
      </Card>
    </>
  )
}

export default SubjectsPage
