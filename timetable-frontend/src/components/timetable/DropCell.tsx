import { useDroppable } from '@dnd-kit/core'

import type { TimetableSlot } from '../../types'

type DropCellProps = {
  id: string
  value?: TimetableSlot
}

const DropCell = ({ id, value }: DropCellProps) => {
  const { isOver, setNodeRef } = useDroppable({
    id,
    data: {
      type: 'slot',
      id,
    },
  })

  return (
    <div
      ref={setNodeRef}
      className={[
        'flex h-full min-h-[124px] rounded-2xl border p-3 transition-all duration-200',
        isOver
          ? 'border-indigo-400 bg-indigo-50 shadow-md dark:border-indigo-400 dark:bg-indigo-500/10'
          : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900',
      ].join(' ')}
    >
      {value?.subject ? (
        <div className="flex w-full flex-col justify-between rounded-xl bg-gradient-to-br from-indigo-600 to-blue-500 p-3 text-white shadow-sm">
          <div>
            {value.subjectCode ? (
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/80">{value.subjectCode}</p>
            ) : null}
            <p className="mt-1 text-sm font-semibold leading-5">{value.subject}</p>
          </div>
          <div className="space-y-1 pt-3 text-xs text-white/80">
            {value.faculty ? <p>{value.faculty}</p> : null}
            {value.building || value.roomNumber ? (
              <p>
                {[value.building, value.roomNumber].filter(Boolean).join('-')}
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex w-full items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-400 dark:border-gray-700 dark:bg-gray-800/70 dark:text-gray-500">
          Drop Subject
        </div>
      )}
    </div>
  )
}

export default DropCell
