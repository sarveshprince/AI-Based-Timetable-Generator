import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'

import Button from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'
import DataTable from '../components/ui/DataTable'
import Icon from '../components/ui/Icon'
import Loader from '../components/ui/Loader'
import PageHeader from '../components/ui/PageHeader'
import Select from '../components/ui/Select'
import { createAllocation, deleteAllocation, getAllocations, getFacultyByDept, getSubjectsByDeptSem } from '../services/api'
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
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    const response = await getAllocations()
    setAllocations(response.allocations)
    setDepartments(response.departments)
  }

  useEffect(() => {
    load()
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load allocations'))
      .finally(() => setLoading(false))
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
    setSubmitting(true)
    try {
      await createAllocation({ subject_id: Number(subjectId), faculty_id: Number(facultyId) })
      setSubjectId('')
      setFacultyId('')
      setShowForm(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save allocation')
    } finally {
      setSubmitting(false)
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
    <>
      <PageHeader
        eyebrow="Scheduling"
        title="Subject-Faculty Allocation"
        description="Connect subjects to faculty with cleaner controls and better context for each semester."
        actions={
          <Button onClick={() => setShowForm((value) => !value)}>
            <Icon name="plus" className="h-4 w-4" />
            {showForm ? 'Close form' : 'Allocate Subject'}
          </Button>
        }
      />

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">{error}</div> : null}

      {showForm ? (
        <Card>
          <CardContent>
            <form className="grid gap-5 md:grid-cols-2 xl:grid-cols-4" onSubmit={onSubmit}>
              <Select label="Department" value={departmentId} onChange={(event) => setDepartmentId(event.target.value ? Number(event.target.value) : '')} required>
                <option value="">Select department</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </Select>
              <Select label="Semester" value={semester} onChange={(event) => setSemester(event.target.value ? Number(event.target.value) : '')} required>
                <option value="">Select semester</option>
                {Array.from({ length: 8 }, (_, index) => index + 1).map((item) => (
                  <option key={item} value={item}>
                    Semester {item}
                  </option>
                ))}
              </Select>
              <Select label="Subject" value={subjectId} onChange={(event) => setSubjectId(event.target.value ? Number(event.target.value) : '')} required>
                <option value="">Select subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name} ({subject.code})
                  </option>
                ))}
              </Select>
              <Select label="Faculty" value={facultyId} onChange={(event) => setFacultyId(event.target.value ? Number(event.target.value) : '')} required>
                <option value="">Select faculty</option>
                {faculty.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.employee_id})
                  </option>
                ))}
              </Select>
              <div className="md:col-span-2 xl:col-span-4 flex flex-wrap gap-3">
                <Button type="submit" loading={submitting}>
                  Save Allocation
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
              <Loader label="Loading allocations..." />
            </div>
          ) : (
            <DataTable
              columns={[
                { key: 'subject', title: 'Subject', render: (allocation) => <span className="font-medium text-gray-900">{allocation.subject_name}</span> },
                { key: 'code', title: 'Code', render: (allocation) => allocation.subject_code || 'N/A' },
                { key: 'faculty', title: 'Faculty', render: (allocation) => allocation.faculty_name || 'N/A' },
                { key: 'department', title: 'Department', render: (allocation) => allocation.department_name || 'N/A' },
                { key: 'semester', title: 'Semester', render: (allocation) => `Semester ${allocation.semester}` },
                {
                  key: 'actions',
                  title: 'Actions',
                  render: (allocation) => (
                    <Button variant="danger" size="sm" onClick={() => onDelete(allocation.id)}>
                      <Icon name="trash" className="h-4 w-4" />
                      Delete
                    </Button>
                  ),
                },
              ]}
              rows={allocations}
              getRowKey={(allocation) => allocation.id}
              emptyTitle="No allocations yet"
              emptyDescription="Assign a subject to a faculty member to populate the scheduling engine."
            />
          )}
        </CardContent>
      </Card>
    </>
  )
}

export default AllocationsPage
