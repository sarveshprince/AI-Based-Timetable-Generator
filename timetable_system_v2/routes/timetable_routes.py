import json

from flask import Blueprint, jsonify, request, send_file

from db.database import get_db
from services.realtime_service import broadcast_drag_update, broadcast_timetable_update
from services.timetable_service import build_timetable_payload, relevant_timetable_query
from utils.decorators import admin_required, auth_required
from utils.helpers import json_error, rows_to_list
from utils.report_generator import ReportGenerator
from utils.timetable_generator import TimetableGenerator, adjust_timetable_after_drag


timetable_bp = Blueprint("timetable", __name__)


def _format_slots_for_adjust(detail_payload):
    slots = []
    for item in detail_payload.get("schedules", []):
        slots.append(
            {
                "id": item.get("id"),
                "section_id": item.get("section_id"),
                "subject_id": item.get("subject_id"),
                "faculty_id": item.get("faculty_id"),
                "day": item.get("day"),
                "time_slot": item.get("time_slot"),
                "classroom": item.get("classroom"),
                "subject_name": item.get("subject_name"),
                "subject_code": item.get("subject_code"),
                "faculty_name": item.get("faculty_name"),
            }
        )
    return slots


def _resolve_subject(db, slot, section_id):
    subject_id = slot.get("subject_id")
    if subject_id:
        row = db.execute("SELECT * FROM subjects WHERE id = ?", (subject_id,)).fetchone()
        if row:
            return row

    subject_code = slot.get("subject_code")
    if subject_code:
        row = db.execute("SELECT * FROM subjects WHERE code = ? LIMIT 1", (subject_code,)).fetchone()
        if row:
            return row
    return None


def _resolve_faculty(db, slot, section_id, subject_id):
    faculty_id = slot.get("faculty_id")
    if faculty_id:
        row = db.execute("SELECT * FROM faculty WHERE id = ?", (faculty_id,)).fetchone()
        if row:
            return row
    row = db.execute(
        """
        SELECT f.*
        FROM subject_faculty sf
        JOIN faculty f ON f.id = sf.faculty_id
        WHERE sf.subject_id = ? AND sf.section_id = ?
        ORDER BY f.name
        LIMIT 1
        """,
        (subject_id, section_id),
    ).fetchone()
    if row:
        return row
    return None


@timetable_bp.route("/api/timetables", methods=["GET"])
@auth_required
def get_timetables():
    db = get_db()
    user = request.user
    if user["role"] == "admin":
        timetables = rows_to_list(
            db.execute(
                """
                SELECT t.*, d.name AS department_name
                FROM timetables t
                LEFT JOIN departments d ON t.department_id = d.id
                ORDER BY t.created_at DESC
                """
            ).fetchall()
        )
    else:
        faculty = db.execute("SELECT * FROM faculty WHERE user_id = ?", (user["id"],)).fetchone()
        if not faculty:
            db.close()
            return json_error("Faculty profile not found.", 404)
        timetables = rows_to_list(
            db.execute(
                """
                SELECT DISTINCT t.*, d.name AS department_name
                FROM timetables t
                LEFT JOIN departments d ON t.department_id = d.id
                JOIN schedules s ON s.timetable_id = t.id
                WHERE s.faculty_id = ?
                ORDER BY t.created_at DESC
                """,
                (faculty["id"],),
            ).fetchall()
        )
    db.close()
    return jsonify({"timetables": timetables})


@timetable_bp.route("/api/timetable", methods=["GET"])
@auth_required
def get_timetable():
    requested_id = request.args.get("id")
    db = get_db()
    timetable_id = requested_id
    if not timetable_id:
        query, params = relevant_timetable_query(request.user)
        if not query:
            db.close()
            return jsonify({"timetable": None, "days": [], "time_slots": [], "grid": {}, "schedules": []})
        row = db.execute(query, params).fetchone()
        timetable_id = row["id"] if row else None
    if not timetable_id:
        db.close()
        return jsonify({"timetable": None, "days": [], "time_slots": [], "grid": {}, "schedules": []})
    payload = build_timetable_payload(db, int(timetable_id))
    db.close()
    if not payload:
        return json_error("Timetable not found.", 404)
    return jsonify(payload)


@timetable_bp.route("/api/generate-timetable", methods=["POST"])
@auth_required
@admin_required
def generate_timetable():
    payload = request.get_json(silent=True) or {}
    semester = payload.get("semester")
    academic_year = (payload.get("academic_year") or "").strip()
    department_id = payload.get("department_id")
    if not semester or not academic_year or not department_id:
        return json_error("Department, semester, and academic year are required.")

    try:
        year_number = (int(semester) + 1) // 2
    except (TypeError, ValueError):
        return json_error("semester must be an integer.")

    db = get_db()
    data = {
        "subjects": rows_to_list(
            db.execute(
                "SELECT * FROM subjects WHERE department_id = ? AND semester = ? ORDER BY weightage DESC, name",
                (department_id, semester),
            ).fetchall()
        ),
        "sections": rows_to_list(
            db.execute(
                """
                SELECT s.id,
                       s.year_id,
                       s.name,
                       s.strength,
                       y.department_id,
                       y.year_number AS year
                FROM sections s
                JOIN years y ON s.year_id = y.id
                WHERE y.department_id = ? AND y.year_number = ?
                ORDER BY y.year_number, s.name
                """,
                (department_id, year_number),
            ).fetchall()
        ),
        "faculty": rows_to_list(db.execute("SELECT * FROM faculty WHERE department_id = ? ORDER BY name", (department_id,)).fetchall()),
        "subject_faculty": rows_to_list(
            db.execute(
                """
                SELECT sf.*
                FROM subject_faculty sf
                JOIN subjects s ON s.id = sf.subject_id
                JOIN sections sec ON sec.id = sf.section_id
                JOIN years y ON sec.year_id = y.id
                WHERE s.department_id = ? AND s.semester = ? AND s.year = y.year_number
                """,
                (department_id, semester),
            ).fetchall()
        ),
    }
    if not data["subjects"]:
        db.close()
        return json_error("No subjects found for this department and semester.", 400)
    if not data["sections"]:
        db.close()
        return json_error("No sections found for this department and semester.", 400)
    if not data["subject_faculty"]:
        db.close()
        return json_error("No subject allocations found for this semester sections.", 400)

    generator = TimetableGenerator(data, int(department_id), int(semester))
    timetable_data = generator.generate()
    timetable_json = json.dumps(timetable_data, default=str)

    cursor = db.execute(
        """
        INSERT INTO timetables (semester, academic_year, department_id, timetable_data, status, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (semester, academic_year, department_id, timetable_json, "active", request.user["id"]),
    )
    timetable_id = cursor.lastrowid

    for schedule in timetable_data["schedules"]:
        db.execute(
            """
            INSERT INTO schedules (
                timetable_id, section_id, subject_id, faculty_id, day, time_slot, classroom
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                timetable_id,
                schedule["section_id"],
                schedule["subject_id"],
                schedule["faculty_id"],
                schedule["day"],
                schedule["time_slot"],
                schedule.get("classroom"),
            ),
        )

    impacted_faculty = {item["faculty_id"] for item in timetable_data["schedules"] if item.get("faculty_id")}
    for faculty_id in impacted_faculty:
        faculty_user = db.execute("SELECT user_id FROM faculty WHERE id = ?", (faculty_id,)).fetchone()
        if faculty_user and faculty_user["user_id"]:
            db.execute(
                """
                INSERT INTO notifications (user_id, message, notification_type)
                VALUES (?, ?, ?)
                """,
                (
                    faculty_user["user_id"],
                    f"New timetable generated for Semester {semester} - {academic_year}",
                    "timetable_update",
                ),
            )

    db.commit()
    timetable_payload = build_timetable_payload(db, timetable_id)
    db.close()

    if timetable_payload:
        broadcast_timetable_update(
            timetable_id,
            {
                "timetable_id": timetable_id,
                "updated_timetable": timetable_payload,
                "source": "generate",
            },
        )

    return jsonify(
        {
            "message": f"Timetable generated successfully. Fitness Score: {timetable_data['metadata']['fitness_score']:.2f}",
            **timetable_payload,
        }
    ), 201


@timetable_bp.route("/api/timetable/update", methods=["POST"])
@auth_required
def update_timetable():
    user = request.user
    if user["role"] not in ("admin", "faculty"):
        return json_error("Only admin/faculty can update timetable.", 403)

    payload = request.get_json(silent=True) or {}
    timetable_id = payload.get("timetable_id")
    slots = payload.get("slots") or []
    if not timetable_id:
        return json_error("timetable_id is required.")

    db = get_db()
    timetable = db.execute("SELECT * FROM timetables WHERE id = ?", (timetable_id,)).fetchone()
    if not timetable:
        db.close()
        return json_error("Timetable not found.", 404)

    db.execute("DELETE FROM schedules WHERE timetable_id = ?", (timetable_id,))

    for slot in slots:
        section_id = slot.get("section_id")
        day = slot.get("day")
        time_slot = slot.get("time_slot") or slot.get("time")
        if not section_id or not day or not time_slot:
            continue
        subject = _resolve_subject(db, slot, section_id)
        if not subject:
            continue
        faculty = _resolve_faculty(db, slot, section_id, subject["id"])
        if not faculty:
            continue
        db.execute(
            """
            INSERT INTO schedules (
                timetable_id, section_id, subject_id, faculty_id, day, time_slot, classroom
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                timetable_id,
                section_id,
                subject["id"],
                faculty["id"],
                day,
                time_slot,
                slot.get("classroom"),
            ),
        )

    refreshed_payload = build_timetable_payload(db, int(timetable_id))
    db.execute(
        "UPDATE timetables SET timetable_data = ? WHERE id = ?",
        (json.dumps(refreshed_payload or {}, default=str), timetable_id),
    )
    db.commit()
    db.close()

    if refreshed_payload:
        broadcast_timetable_update(
            int(timetable_id),
            {
                "timetable_id": int(timetable_id),
                "updated_timetable": refreshed_payload,
                "source": "save",
                "updated_by": user["id"],
            },
        )

    return jsonify({"success": True, "message": "Timetable updated successfully.", "updated_timetable": refreshed_payload})


@timetable_bp.route("/api/timetable/adjust", methods=["POST"])
@auth_required
def adjust_timetable():
    user = request.user
    if user["role"] not in ("admin", "faculty"):
        return json_error("Only admin/faculty can adjust timetable.", 403)

    payload = request.get_json(silent=True) or {}
    moved_slot = payload.get("moved_slot") or {}
    timetable_payload = payload.get("timetable") or {}
    timetable_id = timetable_payload.get("timetable_id") or payload.get("timetable_id")
    if not timetable_id:
        return json_error("timetable_id is required.")

    db = get_db()
    base_payload = build_timetable_payload(db, int(timetable_id))
    if not base_payload:
        db.close()
        return json_error("Timetable not found.", 404)

    adjusted = adjust_timetable_after_drag(
        {
            "days": base_payload.get("days", []),
            "time_slots": base_payload.get("time_slots", []),
            "slots": timetable_payload.get("slots") or _format_slots_for_adjust(base_payload),
        },
        moved_slot,
    )

    db.execute("DELETE FROM schedules WHERE timetable_id = ?", (timetable_id,))
    for slot in adjusted.get("updated_slots", []):
        section_id = slot.get("section_id")
        day = slot.get("day")
        time_slot = slot.get("time_slot") or slot.get("time")
        if not section_id or not day or not time_slot:
            continue
        subject = _resolve_subject(db, slot, section_id)
        faculty = _resolve_faculty(db, slot, section_id, subject["id"]) if subject else None
        if not subject or not faculty:
            continue
        db.execute(
            """
            INSERT INTO schedules (
                timetable_id, section_id, subject_id, faculty_id, day, time_slot, classroom
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                timetable_id,
                section_id,
                subject["id"],
                faculty["id"],
                day,
                time_slot,
                slot.get("classroom"),
            ),
        )

    refreshed_payload = build_timetable_payload(db, int(timetable_id))
    db.execute(
        "UPDATE timetables SET timetable_data = ? WHERE id = ?",
        (json.dumps(refreshed_payload or {}, default=str), timetable_id),
    )
    db.commit()
    db.close()

    broadcast_drag_update(
        int(timetable_id),
        {"timetable_id": int(timetable_id), "moved_slot": moved_slot, "updated_by": user["id"]},
    )
    broadcast_timetable_update(
        int(timetable_id),
        {
            "timetable_id": int(timetable_id),
            "updated_timetable": refreshed_payload,
            "changed_slots": adjusted.get("changed_slots", []),
            "unresolved_conflicts": adjusted.get("unresolved_conflicts", []),
            "suggested_slots": adjusted.get("suggested_slots", []),
            "source": "adjust",
            "updated_by": user["id"],
        },
    )

    return jsonify(
        {
            "updated_timetable": refreshed_payload,
            "changed_slots": adjusted.get("changed_slots", []),
            "unresolved_conflicts": adjusted.get("unresolved_conflicts", []),
            "suggested_slots": adjusted.get("suggested_slots", []),
        }
    )


@timetable_bp.route("/api/timetable/<int:timetable_id>/report", methods=["GET"])
@auth_required
def download_report(timetable_id):
    db = get_db()
    timetable = db.execute("SELECT * FROM timetables WHERE id = ?", (timetable_id,)).fetchone()
    if not timetable:
        db.close()
        return json_error("Timetable not found.", 404)
    schedules = db.execute(
        """
        SELECT s.*, sub.name AS subject_name, sub.code AS subject_code, f.name AS faculty_name
        FROM schedules s
        LEFT JOIN subjects sub ON s.subject_id = sub.id
        LEFT JOIN faculty f ON s.faculty_id = f.id
        WHERE s.timetable_id = ?
        ORDER BY s.day, s.time_slot
        """,
        (timetable_id,),
    ).fetchall()
    department = db.execute("SELECT * FROM departments WHERE id = ?", (timetable["department_id"],)).fetchone()
    db.close()
    pdf_path = ReportGenerator().generate_pdf(timetable, schedules, department)
    return send_file(
        pdf_path,
        as_attachment=True,
        download_name=f'timetable_dept_{department["code"]}_sem_{timetable["semester"]}.pdf',
    )
