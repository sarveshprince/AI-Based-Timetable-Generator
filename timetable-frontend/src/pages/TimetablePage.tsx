import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'

import useSocket from '../hooks/useSocket'
import TimetableGrid from '../components/timetable/TimetableGrid'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import DataTable from '../components/ui/DataTable'
import EmptyState from '../components/ui/EmptyState'
import Icon from '../components/ui/Icon'
import Loader from '../components/ui/Loader'
import PageHeader from '../components/ui/PageHeader'
import Select from '../components/ui/Select'
import StatCard from '../components/ui/StatCard'
import {
  adjustTimetable,
  downloadReport,
  generateTimetable,
  getDepartments,
  getStoredUser,
  getTimetable,
  getTimetables,
  updateTimetable,
} from '../services/api'
import type { Department, TimetableAdjustResponse, TimetableDetail, TimetableSlot, TimetableSummary } from '../types'

const formatDateTime = (value: string) => {
  if (!value) {
    return 'N/A'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const slotKey = (day: string, time: string) => `${day}__${time}`

const toEditorSlots = (detail: TimetableDetail | null): TimetableSlot[] => {
  if (!detail) {
    return []
  }
  const next: TimetableSlot[] = []
  detail.days.forEach((day) => {
    detail.time_slots.forEach((time) => {
      const cell = detail.grid[day]?.[time]
      if (cell) {
        next.push({
          id: cell.id,
          day,
          time,
          subject: cell.subject_name,
          faculty: cell.faculty_name,
          subjectCode: cell.subject_code,
          building: cell.building,
          roomNumber: cell.room_number,
        })
      }
    })
  })
  return next
}

const TimetablePage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [departments, setDepartments] = useState<Department[]>([])
  const [timetables, setTimetables] = useState<TimetableSummary[]>([])
  const [detail, setDetail] = useState<TimetableDetail | null>(null)
  const [editorSlots, setEditorSlots] = useState<TimetableSlot[]>([])
  const [changedSlots, setChangedSlots] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [optimizing, setOptimizing] = useState(false)
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({
    department_id: '',
    semester: '1',
    academic_year: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
  })
  const user = getStoredUser()
  const timetableId = searchParams.get('id')
  const adjustTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const selectedTimetableId = detail?.timetable?.id

  const applyAdjustResult = useCallback((payload: TimetableAdjustResponse) => {
    setDetail(payload.updated_timetable)
    setEditorSlots(toEditorSlots(payload.updated_timetable))
    setChangedSlots(payload.changed_slots ?? [])
    if (payload.unresolved_conflicts?.length) {
      const suggestions = payload.suggested_slots?.map((item) => `${item.day} ${item.time_slot}`).join(', ')
      setWarning(`Some conflicts need manual review.${suggestions ? ` Suggested: ${suggestions}` : ''}`)
    } else {
      setWarning('')
    }
  }, [])

  const handleSocketTimetableUpdate = useCallback(
    (payload: Record<string, unknown>) => {
      const updated = payload.updated_timetable as TimetableDetail | undefined
      const source = String(payload.source ?? '')
      const updatedBy = Number(payload.updated_by ?? 0)
      if (!updated || !selectedTimetableId) {
        return
      }
      if (updated.timetable?.id !== selectedTimetableId) {
        return
      }
      setDetail(updated)
      setEditorSlots(toEditorSlots(updated))
      setChangedSlots((payload.changed_slots as string[]) ?? [])
      if (updatedBy && user?.id && updatedBy !== user.id) {
        setMessage(source === 'adjust' ? 'Timetable optimized by collaborator.' : 'Timetable updated by collaborator.')
      }
    },
    [selectedTimetableId, user?.id],
  )

  const handleSocketDragUpdate = useCallback((payload: Record<string, unknown>) => {
    const moved = payload.moved_slot as TimetableSlot | undefined
    if (!moved?.day || !moved.time) {
      return
    }
    setChangedSlots([slotKey(moved.day, moved.time)])
  }, [])

  const { emitDragUpdate, emitTimetableUpdate } = useSocket({
    timetableId: selectedTimetableId,
    userId: user?.id,
    onTimetableUpdate: handleSocketTimetableUpdate,
    onDragUpdate: handleSocketDragUpdate,
  })

  const load = async (id?: number) => {
    setLoading(true)
    try {
      const [departmentResponse, timetableResponse, listResponse] = await Promise.all([
        getDepartments().catch(() => ({ departments: [] })),
        getTimetable(id),
        getTimetables(),
      ])
      setDepartments(departmentResponse.departments)
      setDetail(timetableResponse)
      setEditorSlots(toEditorSlots(timetableResponse))
      setTimetables(listResponse.timetables)
      setWarning('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load timetable')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(timetableId ? Number(timetableId) : undefined).catch(() => undefined)
  }, [timetableId])

  useEffect(
    () => () => {
      if (adjustTimeoutRef.current) {
        clearTimeout(adjustTimeoutRef.current)
      }
    },
    [],
  )

  useEffect(() => {
    if (!changedSlots.length) {
      return
    }
    const timeout = setTimeout(() => setChangedSlots([]), 2200)
    return () => clearTimeout(timeout)
  }, [changedSlots])

  const onGenerate = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setMessage('')
    try {
      const response = await generateTimetable({
        department_id: Number(form.department_id),
        semester: Number(form.semester),
        academic_year: form.academic_year,
      })
      setMessage(response.message)
      const newId = response.timetable?.id
      if (newId) {
        setSearchParams({ id: String(newId) })
      }
      await load(newId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate timetable')
    } finally {
      setSubmitting(false)
    }
  }

  const onSaveTimetable = async () => {
    const selectedTimetable = detail?.timetable
    if (!selectedTimetable) {
      return
    }
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const response = await updateTimetable({
        timetable_id: selectedTimetable.id,
        slots: editorSlots.map((slot) => ({
          day: slot.day,
          time_slot: slot.time,
          subject_name: slot.subject,
          subject_code: slot.subjectCode,
          faculty_name: slot.faculty,
          building: slot.building,
          room_number: slot.roomNumber,
        })),
      })
      setMessage(response.message || 'Timetable updated successfully.')
      await load(selectedTimetable.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update timetable')
    } finally {
      setSaving(false)
    }
  }

  const onGridChange = (nextSlots: TimetableSlot[], movedSlot: TimetableSlot) => {
    const selectedTimetable = detail?.timetable
    if (!selectedTimetable) {
      return
    }

    setEditorSlots(nextSlots)
    setChangedSlots([slotKey(movedSlot.day, movedSlot.time)])
    setWarning('')

    emitDragUpdate({
      timetable_id: selectedTimetable.id,
      moved_slot: movedSlot,
      updated_by: user?.id,
    })

    if (adjustTimeoutRef.current) {
      clearTimeout(adjustTimeoutRef.current)
    }

    adjustTimeoutRef.current = setTimeout(async () => {
      setOptimizing(true)
      try {
        const adjusted = await adjustTimetable({
          timetable: {
            timetable_id: selectedTimetable.id,
            days: detail?.days ?? [],
            time_slots: detail?.time_slots ?? [],
            slots: nextSlots,
          },
          moved_slot: movedSlot,
        })
        applyAdjustResult(adjusted)
        emitTimetableUpdate({
          timetable_id: selectedTimetable.id,
          updated_timetable: adjusted.updated_timetable,
          changed_slots: adjusted.changed_slots,
          unresolved_conflicts: adjusted.unresolved_conflicts,
          suggested_slots: adjusted.suggested_slots,
          source: 'adjust',
          updated_by: user?.id,
        })
      } catch (err) {
        setWarning(err instanceof Error ? err.message : 'Could not auto-adjust conflicts. Try a nearby slot.')
      } finally {
        setOptimizing(false)
      }
    }, 350)
  }

  const selectedTimetable = detail?.timetable

  const editorSubjects = useMemo(() => {
    if (!detail?.schedules.length) {
      return []
    }
    const byKey = new Map<string, { id: string; subject: string; subjectCode?: string; faculty?: string; building?: string; roomNumber?: string }>()
    detail.schedules.forEach((cell) => {
      const key = `${cell.subject_code}::${cell.faculty_name}`
      if (!byKey.has(key)) {
        byKey.set(key, {
          id: key,
          subject: cell.subject_name,
          subjectCode: cell.subject_code,
          faculty: cell.faculty_name,
          building: cell.building,
          roomNumber: cell.room_number,
        })
      }
    })
    return Array.from(byKey.values())
  }, [detail])

  return (
    <>
      <PageHeader
        eyebrow="Scheduling Workspace"
        title="Timetable"
        description="Generate, edit, and sync timetables live with AI-assisted optimization after every drop."
        actions={
          selectedTimetable ? (
            <Button variant="secondary" onClick={() => downloadReport(selectedTimetable.id)}>
              <Icon name="download" className="h-4 w-4" />
              Download PDF
            </Button>
          ) : null
        }
      />

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      ) : null}
      {warning ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
          {warning}
        </div>
      ) : null}
      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300">
          {message}
        </div>
      ) : null}

      {user?.role === 'admin' ? (
        <Card>
          <CardHeader>
            <CardTitle>Generate timetable</CardTitle>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Create a fresh timetable from your current allocations, subjects, classrooms, and constraints.
            </p>
          </CardHeader>
          <CardContent>
            <form className="grid gap-5 md:grid-cols-2 xl:grid-cols-4" onSubmit={onGenerate}>
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
              <label className="block space-y-2 xl:col-span-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Academic year</span>
                <input
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-all duration-200 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                  value={form.academic_year}
                  onChange={(event) => setForm({ ...form, academic_year: event.target.value })}
                  required
                />
              </label>
              <div className="flex flex-wrap gap-3 md:col-span-2 xl:col-span-4">
                <Button type="submit" loading={submitting}>
                  <Icon name="sparkles" className="h-4 w-4" />
                  {submitting ? 'Generating...' : 'Generate Timetable'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.35fr]">
        <Card>
          <CardHeader>
            <CardTitle>Available timetables</CardTitle>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Switch between generated timetables without leaving the workspace.</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex min-h-[240px] items-center justify-center">
                <Loader label="Loading timetables..." />
              </div>
            ) : (
              <DataTable
                columns={[
                  { key: 'department', title: 'Department', render: (item) => item.department_name || 'N/A' },
                  { key: 'semester', title: 'Semester', render: (item) => `Semester ${item.semester}` },
                  { key: 'year', title: 'Academic Year', render: (item) => item.academic_year },
                  { key: 'status', title: 'Status', render: (item) => <Badge tone={item.status === 'active' ? 'success' : 'neutral'}>{item.status}</Badge> },
                  {
                    key: 'action',
                    title: 'Action',
                    render: (item) => (
                      <Button variant="secondary" size="sm" onClick={() => setSearchParams({ id: String(item.id) })}>
                        <Icon name="eye" className="h-4 w-4" />
                        View
                      </Button>
                    ),
                  },
                ]}
                rows={timetables}
                getRowKey={(item) => item.id}
                emptyTitle="No timetables available"
                emptyDescription="Generate a timetable to populate this list."
              />
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {loading ? (
            <Card>
              <CardContent className="flex min-h-[320px] items-center justify-center">
                <Loader label="Loading selected timetable..." />
              </CardContent>
            </Card>
          ) : selectedTimetable ? (
            <>
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard icon={<Icon name="building" className="h-5 w-5" />} label="Department" value={selectedTimetable.department_name || 'N/A'} />
                <StatCard icon={<Icon name="calendar" className="h-5 w-5" />} label="Semester" value={`Semester ${selectedTimetable.semester}`} />
                <StatCard icon={<Icon name="status" className="h-5 w-5" />} label="Status" value={selectedTimetable.status} />
                <StatCard icon={<Icon name="clock" className="h-5 w-5" />} label="Created" value={formatDateTime(selectedTimetable.created_at)} />
              </section>

              <Card>
                <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <CardTitle>
                      {selectedTimetable.department_name} · Semester {selectedTimetable.semester}
                    </CardTitle>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Academic year {selectedTimetable.academic_year}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone={selectedTimetable.status === 'active' ? 'success' : 'neutral'}>{selectedTimetable.status}</Badge>
                    {optimizing ? (
                      <div className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                        <Loader size="sm" />
                        Optimizing...
                      </div>
                    ) : null}
                    {user?.role === 'admin' ? (
                      <Button onClick={onSaveTimetable} loading={saving}>
                        <Icon name="status" className="h-4 w-4" />
                        Save Timetable
                      </Button>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent>
                  <TimetableGrid
                    days={detail?.days ?? []}
                    timeSlots={detail?.time_slots ?? []}
                    subjects={editorSubjects}
                    slots={editorSlots}
                    changedSlotKeys={changedSlots}
                    onChange={onGridChange}
                  />
                </CardContent>
              </Card>
            </>
          ) : (
            <EmptyState
              title="No timetable selected"
              description="Pick a timetable from the list or generate a new one to review the schedule grid."
            />
          )}
        </div>
      </section>
    </>
  )
}

export default TimetablePage
