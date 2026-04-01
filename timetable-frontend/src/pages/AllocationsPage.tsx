import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'

import Button from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'
import DataTable from '../components/ui/DataTable'
import Icon from '../components/ui/Icon'
import Loader from '../components/ui/Loader'
import PageHeader from '../components/ui/PageHeader'
import Select from '../components/ui/Select'
import {
  createAllocation,
  deleteAllocation,
  getAllocations,
  getFacultyByDept,
  getSubjectsByDeptSem
} from '../services/api'
import type { Allocation, Department } from '../types'

const AllocationsPage = () => {
  const [allocations, setAllocations] = useState<Allocation[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [subjects, setSubjects] = useState<{ id: number; name: string; code: string }[]>([])
  const [faculty, setFaculty] = useState<{ id: number; name: string; employee_id: string }[]>([])

  // 🔥 NEW: sections state
  const [sections, setSections] = useState<{ id: number; name: string }[]>([])
  const [sectionId, setSectionId] = useState<number | ''>('')

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

  // 🔥 NEW: fetch sections
 useEffect(() => {
  console.log("SECTION EFFECT TRIGGERED:", { departmentId, semester })

  // 🔥 force numeric validation
  const dept = Number(departmentId)
  const sem = Number(semester)

  if (!dept || !sem) {
    console.log("Skipping section fetch ❌", { dept, sem })
    setSections([])
    return
  }

  console.log("Fetching sections ✅", { dept, sem })

  fetch(`/api/sections?department_id=${dept}&semester=${sem}`, {
    credentials: "include",
    headers: {
    "Content-Type": "application/json"
  }
  })
    .then(res => res.json())
    .then(data => {
      console.log("SECTIONS API RESPONSE:", data)
      setSections(data.sections || [])
    })
    .catch(err => {
      console.error("SECTION FETCH ERROR:", err)
      setSections([])
    })

}, [departmentId, semester])

  useEffect(() => {
    console.log('SECTIONS STATE:', sections)
  }, [sections])

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()

    // 🔥 FIX: proper validation
    if (!subjectId || !facultyId || !sectionId) {
      setError('All fields including section are required')
      return
    }

    setSubmitting(true)

    try {
      await createAllocation({
        subject_id: Number(subjectId),
        faculty_id: Number(facultyId),
        section_id: Number(sectionId)
      })

      // reset form
      setSubjectId('')
      setFacultyId('')
      setSectionId('')
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
        description="Connect subjects to faculty with section-specific assignments."
        actions={
          <Button onClick={() => setShowForm((value) => !value)}>
            <Icon name="plus" className="h-4 w-4" />
            {showForm ? 'Close form' : 'Allocate Subject'}
          </Button>
        }
      />

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      {showForm ? (
        <Card>
          <CardContent>
            <form className="grid gap-5 md:grid-cols-2 xl:grid-cols-4" onSubmit={onSubmit}>

              <Select label="Department" value={departmentId} onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : '')} required>
                <option value="">Select department</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </Select>

              <Select label="Semester" value={semester} onChange={(e) => setSemester(e.target.value ? Number(e.target.value) : '')} required>
                <option value="">Select semester</option>
                {Array.from({ length: 8 }, (_, i) => i + 1).map((item) => (
                  <option key={item} value={item}>
                    Semester {item}
                  </option>
                ))}
              </Select>

              {/* 🔥 NEW: Section dropdown */}
              <Select label="Section" value={sectionId || ''} onChange={(e) => setSectionId(e.target.value ? Number(e.target.value) : '')} required>
                <option value="">Select section</option>
                {sections.length === 0 && (
                  <option disabled>No sections found</option>
                )}
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    Section {section.name}
                  </option>
                ))}
              </Select>

              <Select label="Subject" value={subjectId} onChange={(e) => setSubjectId(e.target.value ? Number(e.target.value) : '')} required>
                <option value="">Select subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name} ({subject.code})
                  </option>
                ))}
              </Select>

              <Select label="Faculty" value={facultyId} onChange={(e) => setFacultyId(e.target.value ? Number(e.target.value) : '')} required>
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
                { key: 'subject', title: 'Subject', render: (a) => a.subject_name },
                { key: 'faculty', title: 'Faculty', render: (a) => a.faculty_name },
                { key: 'department', title: 'Department', render: (a) => a.department_name },
                { key: 'semester', title: 'Semester', render: (a) => `Semester ${a.semester}` },
                {
                  key: 'actions',
                  title: 'Actions',
                  render: (a) => (
                    <Button variant="danger" size="sm" onClick={() => onDelete(a.id)}>
                      <Icon name="trash" className="h-4 w-4" />
                      Delete
                    </Button>
                  ),
                },
              ]}
              rows={allocations}
              getRowKey={(a) => a.id}
              emptyTitle="No allocations yet"
              emptyDescription="Assign subjects to faculty for each section."
            />
          )}
        </CardContent>
      </Card>
    </>
  )
}

export default AllocationsPage
