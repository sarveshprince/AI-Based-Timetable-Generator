import { useEffect } from 'react'

import { connectTimetableRoom, emitDragUpdate, emitTimetableUpdate, getTimetableSocket } from '../services/socket'

type UseSocketParams = {
  timetableId?: number
  userId?: number
  onTimetableUpdate?: (payload: Record<string, unknown>) => void
  onDragUpdate?: (payload: Record<string, unknown>) => void
}

const useSocket = ({ timetableId, userId, onTimetableUpdate, onDragUpdate }: UseSocketParams) => {
  useEffect(() => {
    if (!timetableId) {
      return
    }
    const socket = connectTimetableRoom(timetableId, userId)
    const handleTimetableUpdate = (payload: Record<string, unknown>) => {
      onTimetableUpdate?.(payload)
    }
    const handleDragUpdate = (payload: Record<string, unknown>) => {
      onDragUpdate?.(payload)
    }

    socket.on('timetable_update', handleTimetableUpdate)
    socket.on('drag_update', handleDragUpdate)

    return () => {
      socket.off('timetable_update', handleTimetableUpdate)
      socket.off('drag_update', handleDragUpdate)
    }
  }, [onDragUpdate, onTimetableUpdate, timetableId, userId])

  useEffect(() => {
    return () => {
      const socket = getTimetableSocket()
      socket.disconnect()
    }
  }, [])

  return {
    emitDragUpdate,
    emitTimetableUpdate,
  }
}

export default useSocket
