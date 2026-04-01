import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'

import Button from '../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import DataTable from '../components/ui/DataTable'
import Icon from '../components/ui/Icon'
import Input from '../components/ui/Input'
import Loader from '../components/ui/Loader'
import PageHeader from '../components/ui/PageHeader'
import { createDepartment, deleteDepartment, getDepartments } from '../services/api'
import type { Department, DepartmentYearInput } from '../types'

const YEARS = [1, 2, 3, 4] as const

const DepartmentsPage = () => {
  const [departments, setDepartments] = useState<Department[]>([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [years, setYears] = useState<DepartmentYearInput[]>(() => YEARS.map((year) => ({ year, sections: [] })))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    const response = await getDepartments()
    setDepartments(response.departments)
  }

  useEffect(() => {
    load()
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load departments'))
      .finally(() => setLoading(false))
  }, [])

  const addSection = (year: number) => {
    setYears((current) =>
      current.map((item) =>
        item.year === year
          ? { ...item, sections: [...item.sections, { name: '', strength: 60 }] }
          : item,
      ),
    )
  }

  const removeSection = (year: number, indexInYear: number) => {
    setYears((current) =>
      current.map((item) =>
        item.year === year
          ? { ...item, sections: item.sections.filter((_, index) => index !== indexInYear) }
          : item,
      ),
    )
  }

  const updateSection = (year: number, indexInYear: number, patch: { name?: string; strength?: number }) => {
    setYears((current) =>
      current.map((item) =>
        item.year === year
          ? {
              ...item,
              sections: item.sections.map((section, index) => (index === indexInYear ? { ...section, ...patch } : section)),
            }
          : item,
      ),
    )
  }

  const validateSections = () => {
    for (const year of years) {
      for (const section of year.sections) {
        if (!section.name.trim()) {
          return 'Section name is required.'
        }
        if (!Number.isInteger(section.strength) || section.strength <= 0) {
          return 'Section strength must be greater than 0.'
        }
      }
      const normalizedNames = year.sections.map((section) => section.name.trim().toUpperCase()).filter(Boolean)
      if (new Set(normalizedNames).size !== normalizedNames.length) {
        return `Duplicate section names found in Year ${year.year}.`
      }
    }
    return ''
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    const sectionError = validateSections()
    if (sectionError) {
      setError(sectionError)
      return
    }

    setSubmitting(true)
    try {
      await createDepartment({
        department_name: name.trim(),
        department_code: code.trim().toUpperCase(),
        years: years.map((item) => ({
          year: item.year,
          sections: item.sections.map((section) => ({
            name: section.name.trim().toUpperCase(),
            strength: Number(section.strength),
          })),
        })),
      })
      setName('')
      setCode('')
      setYears(YEARS.map((year) => ({ year, sections: [] })))
      setShowForm(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save department')
    } finally {
      setSubmitting(false)
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
    <>
      <PageHeader
        eyebrow="Administration"
        title="Departments"
        description="Create departments with section-wise yearly structure."
        actions={
          <Button onClick={() => setShowForm((value) => !value)}>
            <Icon name="plus" className="h-4 w-4" />
            {showForm ? 'Close form' : 'Add Department'}
          </Button>
        }
      />

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {showForm ? (
        <Card>
          <CardContent>
            <form className="space-y-6" onSubmit={onSubmit}>
              <div className="grid gap-5 md:grid-cols-2">
                <Input label="Department name" value={name} onChange={(event) => setName(event.target.value)} required />
                <Input label="Department code" value={code} onChange={(event) => setCode(event.target.value)} required />
              </div>

              <div className="grid gap-4">
                {YEARS.map((year) => {
                  const yearEntry = years.find((item) => item.year === year) ?? { year, sections: [] }

                  return (
                    <Card key={year} className="border-gray-200/80">
                      <CardHeader className="flex flex-row items-center justify-between gap-4">
                        <CardTitle className="text-lg">Year {year}</CardTitle>
                        <Button type="button" size="sm" onClick={() => addSection(year)}>
                          <Icon name="plus" className="h-4 w-4" />
                          Add Section
                        </Button>
                      </CardHeader>
                      <CardContent className="grid gap-4">
                        {yearEntry.sections.length ? (
                          yearEntry.sections.map((row, index) => (
                            <div key={`${year}-${index}`} className="grid gap-4 rounded-xl border border-gray-200 p-4 md:grid-cols-[1fr_1fr_auto] dark:border-gray-700">
                              <Input
                                label="Section"
                                placeholder="A"
                                value={row.name}
                                onChange={(event) => updateSection(year, index, { name: event.target.value })}
                                required
                              />
                              <Input
                                label="Strength"
                                type="number"
                                min={1}
                                value={row.strength}
                                onChange={(event) => updateSection(year, index, { strength: Number(event.target.value) })}
                                required
                              />
                              <div className="flex items-end">
                                <Button type="button" variant="danger" size="sm" onClick={() => removeSection(year, index)}>
                                  <Icon name="trash" className="h-4 w-4" />
                                  Remove
                                </Button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                            No sections added for Year {year}.
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              <div className="flex flex-wrap gap-3">
                <Button type="submit" loading={submitting}>
                  Save Department
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
            <div className="flex min-h-[220px] items-center justify-center">
              <Loader label="Loading departments..." />
            </div>
          ) : (
            <DataTable
              columns={[
                {
                  key: 'name',
                  title: 'Name',
                  render: (department) => <span className="font-medium text-gray-900 dark:text-gray-100">{department.name}</span>,
                },
                { key: 'code', title: 'Code', render: (department) => department.code },
                {
                  key: 'actions',
                  title: 'Actions',
                  render: (department) => (
                    <Button variant="danger" size="sm" onClick={() => onDelete(department.id)}>
                      <Icon name="trash" className="h-4 w-4" />
                      Delete
                    </Button>
                  ),
                },
              ]}
              rows={departments}
              getRowKey={(department) => department.id}
              emptyTitle="No departments yet"
              emptyDescription="Create your first department to start organizing the institution."
            />
          )}
        </CardContent>
      </Card>
    </>
  )
}

export default DepartmentsPage
