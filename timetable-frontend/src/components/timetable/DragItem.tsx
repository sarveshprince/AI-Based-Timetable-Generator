import { useDraggable } from '@dnd-kit/core'
import type { CSSProperties } from 'react'

import Icon from '../ui/Icon'

export type DragSubject = {
  id: string
  subject: string
  subjectCode?: string
  faculty?: string
  building?: string
  roomNumber?: string
}

type DragItemProps = {
  item: DragSubject
}

const DragItem = ({ item }: DragItemProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `subject:${item.id}`,
    data: {
      type: 'subject',
      item,
    },
  })

  const style: CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
  }

  return (
    <button
      ref={setNodeRef}
      style={style}
      type="button"
      {...listeners}
      {...attributes}
      className={[
        'group w-full rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all duration-200',
        'hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md',
        'dark:border-gray-700 dark:bg-gray-900 dark:hover:border-indigo-500/50',
        isDragging ? 'scale-105 border-indigo-400 shadow-xl dark:border-indigo-400' : '',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          {item.subjectCode ? (
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-300">
              {item.subjectCode}
            </p>
          ) : null}
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{item.subject}</p>
          {item.faculty ? <p className="text-xs text-gray-500 dark:text-gray-400">{item.faculty}</p> : null}
        </div>
        <span className="rounded-xl bg-indigo-50 p-2 text-indigo-600 transition group-hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:group-hover:bg-indigo-500/20">
          <Icon name="allocation" className="h-4 w-4" />
        </span>
      </div>
    </button>
  )
}

export default DragItem
