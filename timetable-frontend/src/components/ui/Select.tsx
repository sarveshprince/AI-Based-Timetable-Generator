import type { ReactNode, SelectHTMLAttributes } from 'react'

import { inputClassName } from './Input'

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string
  error?: string
  children: ReactNode
}

const Select = ({ label, error, children, className = '', ...props }: SelectProps) => (
  <label className="block space-y-2">
    {label ? <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span> : null}
    <select
      className={[
        inputClassName,
        'appearance-none',
        error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : '',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </select>
    {error ? <span className="text-xs text-red-500">{error}</span> : null}
  </label>
)

export default Select
