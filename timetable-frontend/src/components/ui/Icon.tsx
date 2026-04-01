import type { ReactNode, SVGProps } from 'react'

type IconName =
  | 'dashboard'
  | 'building'
  | 'faculty'
  | 'subjects'
  | 'allocation'
  | 'students'
  | 'timetable'
  | 'notifications'
  | 'logout'
  | 'menu'
  | 'close'
  | 'sparkles'
  | 'eye'
  | 'download'
  | 'plus'
  | 'trash'
  | 'search'
  | 'calendar'
  | 'mail'
  | 'lock'
  | 'user'
  | 'chevronRight'
  | 'clock'
  | 'status'
  | 'info'
  | 'sun'
  | 'moon'

type IconProps = SVGProps<SVGSVGElement> & {
  name: IconName
}

const paths: Record<IconName, ReactNode> = {
  dashboard: <path d="M4 13h7V4H4v9Zm0 7h7v-5H4v5Zm9 0h7V11h-7v9Zm0-16v5h7V4h-7Z" />,
  building: <path d="M4 20h16v-2H4v2Zm2-4h3v-3H6v3Zm0-5h3V8H6v3Zm0-5h3V3H6v3Zm5 10h3v-3h-3v3Zm0-5h3V8h-3v3Zm0-5h3V3h-3v3Zm5 10h3V8h-3v8Z" />,
  faculty: <path d="M12 12c2.76 0 5-2.24 5-5S14.76 2 12 2 7 4.24 7 7s2.24 5 5 5Zm0 2c-3.33 0-10 1.67-10 5v3h20v-3c0-3.33-6.67-5-10-5Z" />,
  subjects: <path d="M19 3H5c-1.1 0-2 .9-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5c0-1.1-.9-2-2-2Zm-1 14H6V7h12v10Zm-2-8H8v2h8V9Zm-3 4H8v2h5v-2Z" />,
  allocation: <path d="m7 7 3-3m0 0 3 3m-3-3v12m7-9h3v3m0 0-3 3m3-3H8" />,
  students: <path d="M17 10c1.66 0 2.99-1.79 2.99-4S18.66 2 17 2s-3 1.79-3 4 1.34 4 3 4ZM7 10c1.66 0 2.99-1.79 2.99-4S8.66 2 7 2 4 3.79 4 6s1.34 4 3 4Zm0 2c-2.33 0-7 1.17-7 3.5V18h14v-2.5C14 13.17 9.33 12 7 12Zm10 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.95 1.97 3.45V18h6v-2.5c0-2.33-4.67-3.5-7-3.5Z" />,
  timetable: <path d="M7 2v2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7Zm12 6H5v10h14V8Zm-2 2v2h-2v-2h2Zm-4 0v2h-2v-2h2Zm-4 0v2H7v-2h2Z" />,
  notifications: <path d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm6-6V11a6 6 0 1 0-12 0v5L4 18v1h16v-1l-2-2Z" />,
  logout: <path d="M10 17v-2h4V9h-4V7h4a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-4Zm-1-2-1.41-1.41L9.17 12H3v-2h6.17L7.59 8.41 9 7l4 5-4 5Z" />,
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  sparkles: <path d="m12 3 1.9 4.6L18.5 9l-4.6 1.4L12 15l-1.9-4.6L5.5 9l4.6-1.4L12 3Zm7 11 1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1 1-2.5ZM5 14l1 2.5 2.5 1-2.5 1L5 21l-1-2.5-2.5-1 2.5-1 1-2.5Z" />,
  eye: <path d="M12 5c5 0 9 4.5 10 7-1 2.5-5 7-10 7S3 14.5 2 12c1-2.5 5-7 10-7Zm0 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />,
  download: <path d="M11 3h2v8l3-3 1.4 1.4L12 15l-5.4-5.6L8 8l3 3V3ZM5 19h14v2H5v-2Z" />,
  plus: <path d="M19 11H13V5h-2v6H5v2h6v6h2v-6h6v-2Z" />,
  trash: <path d="M6 7h12l-1 13H7L6 7Zm3-3h6l1 2H8l1-2Z" />,
  search: <path d="m15.5 14 5 5-1.5 1.5-5-5v-.8l-.3-.3A6 6 0 1 1 15.5 14Zm-5.5 0a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />,
  calendar: <path d="M7 2h2v2h6V2h2v2h2a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2V2Zm12 7H5v10h14V9Z" />,
  mail: <path d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm8 6 8-4H4l8 4Zm0 2-8-4v8h16V9l-8 4Z" />,
  lock: <path d="M7 10V8a5 5 0 0 1 10 0v2h1a2 2 0 0 1 2 2v8H4v-8a2 2 0 0 1 2-2h1Zm2 0h6V8a3 3 0 0 0-6 0v2Z" />,
  user: <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-5.33 0-8 2.67-8 5v1h16v-1c0-2.33-2.67-5-8-5Z" />,
  chevronRight: <path d="m10 6 6 6-6 6" />,
  clock: <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm1 11h-5V7h2v4h3v2Z" />,
  status: <path d="M12 2 2 7l10 5 10-5-10-5Zm0 7.2L4.2 7 12 3.8 19.8 7 12 9.2ZM4 10l8 4 8-4v4l-8 4-8-4v-4Z" />,
  info: <path d="M11 10h2v7h-2v-7Zm0-4h2v2h-2V6Zm1-4a10 10 0 1 0 10 10A10 10 0 0 0 12 2Z" />,
  sun: <path d="M12 4V2m0 20v-2m8-8h2M2 12h2m13.66 5.66 1.41 1.41M4.93 4.93l1.41 1.41m11.32-1.41-1.41 1.41M6.34 17.66l-1.41 1.41M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" />,
  moon: <path d="M21 13.2A9 9 0 1 1 10.8 3 7 7 0 0 0 21 13.2Z" />,
}

const Icon = ({ name, className, ...props }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={className}
    {...props}
  >
    {paths[name]}
  </svg>
)

export default Icon
