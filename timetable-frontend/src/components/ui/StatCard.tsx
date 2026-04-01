import type { ReactNode } from 'react'

import { Card, CardContent } from './Card'

type StatCardProps = {
  icon: ReactNode
  label: string
  value: string | number
  hint?: string
}

const StatCard = ({ icon, label, value, hint }: StatCardProps) => (
  <Card className="group hover:-translate-y-1 hover:shadow-lg">
    <CardContent className="flex items-start gap-4">
      <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-500 p-3 text-white shadow-md">
        {icon}
      </div>
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{value}</p>
        {hint ? <p className="text-xs text-gray-400 dark:text-gray-500">{hint}</p> : null}
      </div>
    </CardContent>
  </Card>
)

export default StatCard
