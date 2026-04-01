import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'

import Button from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'
import DataTable from '../components/ui/DataTable'
import Icon from '../components/ui/Icon'
import Input from '../components/ui/Input'
import Loader from '../components/ui/Loader'
import PageHeader from '../components/ui/PageHeader'
import { createDepartment, deleteDepartment, getDepartments } from '../services/api'
import type { Department } from '../types'

const DepartmentsPage = () => {
  const [departments, setDepartments] = useState<Department[]>([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
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

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await createDepartment({ name, code })
      setName('')
      setCode('')
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
        description="Manage department entities with a clean, low-friction workflow."
        actions={
          <Button onClick={() => setShowForm((value) => !value)}>
            <Icon name="plus" className="h-4 w-4" />
            {showForm ? 'Close form' : 'Add Department'}
          </Button>
        }
      />

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">{error}</div> : null}

      {showForm ? (
        <Card>
          <CardContent>
            <form className="grid gap-5 md:grid-cols-2" onSubmit={onSubmit}>
              <Input label="Department name" value={name} onChange={(event) => setName(event.target.value)} required />
              <Input label="Department code" value={code} onChange={(event) => setCode(event.target.value)} required />
              <div className="md:col-span-2 flex flex-wrap gap-3">
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
                { key: 'name', title: 'Name', render: (department) => <span className="font-medium text-gray-900">{department.name}</span> },
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
