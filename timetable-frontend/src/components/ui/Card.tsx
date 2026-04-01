import type { HTMLAttributes, ReactNode } from 'react'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
}

export const Card = ({ children, className = '', ...props }: CardProps) => (
  <div
    className={[
      'rounded-2xl border border-gray-200/80 bg-white shadow-sm transition-all duration-200 dark:border-gray-800 dark:bg-gray-900',
      className,
    ].join(' ')}
    {...props}
  >
    {children}
  </div>
)

export const CardHeader = ({ children, className = '', ...props }: CardProps) => (
  <div className={['border-b border-gray-100 px-6 py-5 dark:border-gray-800', className].join(' ')} {...props}>
    {children}
  </div>
)

export const CardContent = ({ children, className = '', ...props }: CardProps) => (
  <div className={['px-6 py-5', className].join(' ')} {...props}>
    {children}
  </div>
)

type CardTitleProps = HTMLAttributes<HTMLHeadingElement> & {
  children: ReactNode
}

export const CardTitle = ({ children, className = '', ...props }: CardTitleProps) => (
  <h2 className={['text-xl font-semibold text-gray-900 dark:text-gray-100', className].join(' ')} {...props}>
    {children}
  </h2>
)
