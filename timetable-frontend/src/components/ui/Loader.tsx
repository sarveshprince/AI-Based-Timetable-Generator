type LoaderProps = {
  size?: 'sm' | 'md' | 'lg'
  tone?: 'light' | 'dark'
  label?: string
}

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-[3px]',
}

const toneClasses = {
  light: 'border-white/30 border-t-white',
  dark: 'border-gray-300 border-t-indigo-600 dark:border-gray-700 dark:border-t-indigo-400',
}

const Loader = ({ size = 'md', tone = 'dark', label }: LoaderProps) => (
  <span className="inline-flex items-center gap-3">
    <span className={['inline-block animate-spin rounded-full', sizeClasses[size], toneClasses[tone]].join(' ')} />
    {label ? <span className="text-sm text-gray-600 dark:text-gray-300">{label}</span> : null}
  </span>
)

export default Loader
