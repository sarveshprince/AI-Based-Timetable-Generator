import type { ButtonHTMLAttributes, ReactNode } from 'react'

import Loader from './Loader'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  fullWidth?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-lg',
  secondary:
    'bg-gray-100 text-gray-700 hover:bg-gray-200 shadow-sm hover:shadow-md dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700',
  danger: 'bg-red-500 text-white hover:bg-red-600 shadow-sm hover:shadow-lg',
  ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
}

const Button = ({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  ...props
}: ButtonProps) => (
  <button
    className={[
      'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900',
      'disabled:cursor-not-allowed disabled:scale-100 disabled:opacity-60',
      'hover:scale-[1.01] active:scale-[0.99]',
      variantClasses[variant],
      sizeClasses[size],
      fullWidth ? 'w-full' : '',
      className,
    ].join(' ')}
    disabled={disabled || loading}
    {...props}
  >
    {loading ? <Loader size="sm" tone={variant === 'secondary' || variant === 'ghost' ? 'dark' : 'light'} /> : null}
    {children}
  </button>
)

export default Button
