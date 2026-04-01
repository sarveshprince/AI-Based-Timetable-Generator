import { DndContext, DragOverlay, MouseSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import { useMemo, useState } from 'react'

import type { TimetableSlot } from '../../types'
import DragItem, { type DragSubject } from './DragItem'
import DropCell from './DropCell'

type TimetableGridProps = {
  days: string[]
  timeSlots: string[]
  subjects: DragSubject[]
  slots: TimetableSlot[]
  changedSlotKeys?: string[]
  onChange: (nextSlots: TimetableSlot[], movedSlot: TimetableSlot) => void
}

const keyForSlot = (day: string, time: string) => `${day}__${time}`

const TimetableGrid = ({ days, timeSlots, subjects, slots, changedSlotKeys = [], onChange }: TimetableGridProps) => {
  const [activeSubject, setActiveSubject] = useState<DragSubject | null>(null)
  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 4 } }))
  const gridTemplateColumns = `160px repeat(${Math.max(days.length, 1)}, minmax(180px,1fr))`

  const slotMap = useMemo(() => {
    return slots.reduce<Record<string, TimetableSlot>>((accumulator, item) => {
      accumulator[keyForSlot(item.day, item.time)] = item
      return accumulator
    }, {})
  }, [slots])

  const onDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current
    if (data?.type === 'subject' && data.item) {
      setActiveSubject(data.item as DragSubject)
    }
  }

  const onDragEnd = (event: DragEndEvent) => {
    setActiveSubject(null)
    if (!event.over) {
      return
    }
    const activeData = event.active.data.current
    if (activeData?.type !== 'subject') {
      return
    }

    const dragged = activeData.item as DragSubject
    const overId = String(event.over.id)
    if (!overId.startsWith('slot:')) {
      return
    }
    const slotKey = overId.replace('slot:', '')
    const [day, time] = slotKey.split('__')
    if (!day || !time) {
      return
    }

    const cleaned = slots.filter(
      (slot) =>
        slot.subjectCode !== dragged.subjectCode ||
        slot.faculty !== dragged.faculty ||
        (slot.day === day && slot.time === time),
    )

    const nextWithoutTarget = cleaned.filter((slot) => !(slot.day === day && slot.time === time))
    const movedSlot: TimetableSlot = {
      day,
      time,
      subject: dragged.subject,
      faculty: dragged.faculty,
      subjectCode: dragged.subjectCode,
      building: dragged.building,
      roomNumber: dragged.roomNumber,
    }
    onChange([
      ...nextWithoutTarget,
      movedSlot,
    ], movedSlot)
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveSubject(null)}>
      <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Subjects</p>
          <div className="mt-4 space-y-3">
            {subjects.map((subject) => (
              <DragItem key={subject.id} item={subject} />
            ))}
          </div>
        </aside>

        <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
          <div className="overflow-x-auto">
            <div className="min-w-[920px]">
              <div
                className="grid border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800"
                style={{ gridTemplateColumns }}
              >
                <div className="border-r border-gray-200 px-4 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 dark:border-gray-800 dark:text-gray-400">
                  Time Slot
                </div>
                {days.map((day) => (
                  <div key={day} className="border-r border-gray-200 px-4 py-4 text-sm font-semibold text-gray-900 last:border-r-0 dark:border-gray-800 dark:text-gray-100">
                    {day}
                  </div>
                ))}
              </div>

              {timeSlots.map((time) => (
                <div
                  key={time}
                  className="grid border-b border-gray-200 last:border-b-0 dark:border-gray-800"
                  style={{ gridTemplateColumns }}
                >
                  <div className="border-r border-gray-200 bg-gray-50 px-4 py-4 text-sm font-medium text-gray-700 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300">
                    {time}
                  </div>
                  {days.map((day) => {
                    const slotId = `slot:${keyForSlot(day, time)}`
                    const isChanged = changedSlotKeys.includes(keyForSlot(day, time))
                    return (
                      <div
                        key={slotId}
                        className={[
                          'border-r border-gray-200 bg-white p-3 last:border-r-0 dark:border-gray-800 dark:bg-gray-950/80',
                          isChanged ? 'bg-emerald-50/80 dark:bg-emerald-500/10' : '',
                        ].join(' ')}
                      >
                        <DropCell id={slotId} value={slotMap[keyForSlot(day, time)]} />
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeSubject ? (
          <div className="w-[260px] scale-105 rounded-2xl border border-indigo-300 bg-white p-4 text-left shadow-2xl dark:border-indigo-500/50 dark:bg-gray-900">
            {activeSubject.subjectCode ? (
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-300">
                {activeSubject.subjectCode}
              </p>
            ) : null}
            <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">{activeSubject.subject}</p>
            {activeSubject.faculty ? <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{activeSubject.faculty}</p> : null}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

export default TimetableGrid
