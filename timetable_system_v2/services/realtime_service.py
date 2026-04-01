from flask import request
from flask_socketio import Namespace, SocketIO, emit, join_room


socketio = SocketIO(cors_allowed_origins=["http://localhost:5173"], async_mode="threading")
_namespace_registered = False


def timetable_room(timetable_id):
    return f"timetable:{timetable_id}"


class TimetableNamespace(Namespace):
    def on_connect(self):
        emit("connected", {"ok": True})

    def on_join_room(self, data):
        timetable_id = (data or {}).get("timetable_id")
        if not timetable_id:
            emit("error", {"message": "timetable_id is required"})
            return
        room = timetable_room(timetable_id)
        join_room(room)
        emit(
            "room_joined",
            {"room": room, "timetable_id": int(timetable_id)},
            room=request.sid,
        )

    def on_drag_update(self, data):
        timetable_id = (data or {}).get("timetable_id")
        if not timetable_id:
            return
        emit(
            "drag_update",
            data,
            room=timetable_room(timetable_id),
            include_self=False,
        )

    def on_timetable_update(self, data):
        timetable_id = (data or {}).get("timetable_id")
        if not timetable_id:
            return
        emit(
            "timetable_update",
            data,
            room=timetable_room(timetable_id),
            include_self=False,
        )


def init_socketio(app):
    global _namespace_registered
    socketio.init_app(app)
    if not _namespace_registered:
        socketio.on_namespace(TimetableNamespace("/timetable"))
        _namespace_registered = True
    return socketio


def broadcast_timetable_update(timetable_id, payload):
    socketio.emit(
        "timetable_update",
        payload,
        namespace="/timetable",
        room=timetable_room(timetable_id),
    )


def broadcast_drag_update(timetable_id, payload):
    socketio.emit(
        "drag_update",
        payload,
        namespace="/timetable",
        room=timetable_room(timetable_id),
    )
