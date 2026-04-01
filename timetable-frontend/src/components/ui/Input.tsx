import type { InputHTMLAttributes } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  error?: string
}

export const inputClassName =
  'w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-all duration-200 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-indigo-400'

const Input = ({ label, error, className = '', ...props }: InputProps) => (
  <label className="block space-y-2">
    {label ? <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span> : null}
    <input className={[inputClassName, error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : '', className].join(' ')} {...props} />
    {error ? <span className="text-xs text-red-500">{error}</span> : null}
  </label>
)

export default Input
