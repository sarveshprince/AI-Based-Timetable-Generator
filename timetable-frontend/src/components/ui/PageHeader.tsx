import type { ReactNode } from 'react'

type PageHeaderProps = {
  eyebrow?: string
  title: string
  description: string
  actions?: ReactNode
}

const PageHeader = ({ eyebrow, title, description, actions }: PageHeaderProps) => (
  <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white px-6 py-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:flex-row lg:items-end lg:justify-between">
    <div className="space-y-2">
      {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">{eyebrow}</p> : null}
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{title}</h1>
      <p className="max-w-2xl text-sm text-gray-500 dark:text-gray-400">{description}</p>
    </div>
    {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
  </div>
)

export default PageHeader
