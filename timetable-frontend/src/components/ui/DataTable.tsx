import type { ReactNode } from 'react'

import EmptyState from './EmptyState'

export type DataTableColumn<T> = {
  key: string
  title: string
  render: (row: T) => ReactNode
  className?: string
}

type DataTableProps<T> = {
  columns: DataTableColumn<T>[]
  rows: T[]
  getRowKey: (row: T) => string | number
  emptyTitle: string
  emptyDescription: string
}

const DataTable = <T,>({ columns, rows, getRowKey, emptyTitle, emptyDescription }: DataTableProps<T>) => {
  if (!rows.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="max-w-full overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-left dark:divide-gray-800">
          <thead className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur dark:bg-gray-800/95">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="whitespace-nowrap px-5 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map((row, index) => (
              <tr key={getRowKey(row)} className={index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-900/70'}>
                {columns.map((column) => (
                  <td key={column.key} className={['px-5 py-4 text-sm text-gray-700 transition-colors duration-200 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800/70', column.className ?? ''].join(' ')}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default DataTable
