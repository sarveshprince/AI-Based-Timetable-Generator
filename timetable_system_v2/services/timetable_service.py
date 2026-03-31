import json

from db.database import get_db


def serialize_timetable_row(row):
    item = dict(row)
    if item.get("timetable_data"):
        try:
            item["timetable_data"] = json.loads(item["timetable_data"])
        except (TypeError, json.JSONDecodeError):
            item["timetable_data"] = None
    return item


def build_timetable_payload(db, timetable_id):
    timetable = db.execute(
        """
        SELECT t.*, d.name as department_name, d.code as department_code
        FROM timetables t
        LEFT JOIN departments d ON t.department_id = d.id
        WHERE t.id = ?
        """,
        (timetable_id,),
    ).fetchone()
    if not timetable:
        return None
    schedules = db.execute(
        """
        SELECT s.*, sub.name as subject_name, sub.code as subject_code,
               f.name as faculty_name, c.room_number, c.building
        FROM schedules s
        LEFT JOIN subjects sub ON s.subject_id = sub.id
        LEFT JOIN faculty f ON s.faculty_id = f.id
        LEFT JOIN classrooms c ON s.classroom_id = c.id
        WHERE s.timetable_id = ?
        ORDER BY s.day, s.time_slot
        """,
        (timetable_id,),
    ).fetchall()
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    time_slots = ["9:00-10:00", "10:00-11:00", "11:00-12:00", "12:00-1:00", "2:00-3:00", "3:00-4:00", "4:00-5:00"]
    grid = {day: {slot: None for slot in time_slots} for day in days}
    flat_schedules = []
    for schedule in schedules:
        item = dict(schedule)
        flat_schedules.append(item)
        if item["day"] in grid and item["time_slot"] in grid[item["day"]]:
            grid[item["day"]][item["time_slot"]] = item
    return {
        "timetable": serialize_timetable_row(timetable),
        "days": days,
        "time_slots": time_slots,
        "grid": grid,
        "schedules": flat_schedules,
    }


def relevant_timetable_query(user):
    if user["role"] == "admin":
        return (
            """
            SELECT t.id
            FROM timetables t
            ORDER BY t.created_at DESC
            LIMIT 1
            """,
            (),
        )
    if user["role"] == "faculty":
        db = get_db()
        faculty = db.execute("SELECT id FROM faculty WHERE user_id = ?", (user["id"],)).fetchone()
        db.close()
        if not faculty:
            return None, None
        return (
            """
            SELECT DISTINCT t.id
            FROM timetables t
            JOIN schedules s ON s.timetable_id = t.id
            WHERE s.faculty_id = ?
            ORDER BY t.created_at DESC
            LIMIT 1
            """,
            (faculty["id"],),
        )
    db = get_db()
    student = db.execute("SELECT department_id, semester FROM students WHERE user_id = ?", (user["id"],)).fetchone()
    db.close()
    if not student:
        return None, None
    return (
        """
        SELECT t.id
        FROM timetables t
        WHERE t.department_id = ? AND t.semester = ?
        ORDER BY t.created_at DESC
        LIMIT 1
        """,
        (student["department_id"], student["semester"]),
    )
