import Icon from '../ui/Icon'

type ThemeToggleProps = {
  isDark: boolean
  onToggle: () => void
}

const ThemeToggle = ({ isDark, onToggle }: ThemeToggleProps) => (
  <button
    type="button"
    onClick={onToggle}
    aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    className="group relative inline-flex h-11 w-20 items-center rounded-full border border-gray-200 bg-white p-1 shadow-sm transition-all duration-300 hover:border-indigo-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-indigo-500/60"
  >
    <span
      className={[
        'absolute h-9 w-9 rounded-full bg-gradient-to-br from-indigo-600 to-blue-500 shadow-md transition-all duration-300',
        isDark ? 'translate-x-9' : 'translate-x-0',
      ].join(' ')}
    />
    <span className="relative z-10 flex w-full items-center justify-between px-1.5 text-white">
      <Icon
        name="sun"
        className={[
          'h-4 w-4 transition-all duration-300',
          isDark ? 'scale-90 opacity-40' : 'scale-100 opacity-100',
        ].join(' ')}
      />
      <Icon
        name="moon"
        className={[
          'h-4 w-4 transition-all duration-300',
          isDark ? 'scale-100 opacity-100' : 'scale-90 opacity-40',
        ].join(' ')}
      />
    </span>
  </button>
)

export default ThemeToggle
