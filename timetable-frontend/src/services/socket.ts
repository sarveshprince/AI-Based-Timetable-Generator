import { io, type Socket } from 'socket.io-client'

import { API_ORIGIN } from './api'

let timetableSocket: Socket | null = null

export const getTimetableSocket = () => {
  if (!timetableSocket) {
    timetableSocket = io(`${API_ORIGIN}/timetable`, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
    })
  }
  return timetableSocket
}

export const connectTimetableRoom = (timetableId: number, userId?: number) => {
  const socket = getTimetableSocket()
  if (!socket.connected) {
    socket.connect()
  }
  socket.emit('join_room', { timetable_id: timetableId, user_id: userId })
  return socket
}

export const emitDragUpdate = (payload: Record<string, unknown>) => {
  const socket = getTimetableSocket()
  if (socket.connected) {
    socket.emit('drag_update', payload)
  }
}

export const emitTimetableUpdate = (payload: Record<string, unknown>) => {
  const socket = getTimetableSocket()
  if (socket.connected) {
    socket.emit('timetable_update', payload)
  }
}
