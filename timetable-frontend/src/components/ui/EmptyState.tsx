import type { ReactNode } from 'react'

import Icon from './Icon'

type EmptyStateProps = {
  title: string
  description: string
  action?: ReactNode
}

const EmptyState = ({ title, description, action }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-14 text-center dark:border-gray-700 dark:bg-gray-800/50">
    <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
      <Icon name="info" className="h-8 w-8 text-indigo-600" />
    </div>
    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
    <p className="mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">{description}</p>
    {action ? <div className="mt-6">{action}</div> : null}
  </div>
)

export default EmptyState
