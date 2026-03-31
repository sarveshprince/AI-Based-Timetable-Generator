import json

from flask import Blueprint, jsonify, request, send_file

from db.database import get_db
from services.timetable_service import build_timetable_payload, relevant_timetable_query
from utils.decorators import admin_required, auth_required
from utils.helpers import json_error, rows_to_list
from utils.report_generator import ReportGenerator
from utils.timetable_generator import TimetableGenerator


timetable_bp = Blueprint("timetable", __name__)


@timetable_bp.route("/api/timetables", methods=["GET"])
@auth_required
def get_timetables():
    db = get_db()
    user = request.user
    if user["role"] == "admin":
        timetables = rows_to_list(
            db.execute(
                """
                SELECT t.*, d.name as department_name
                FROM timetables t
                LEFT JOIN departments d ON t.department_id = d.id
                ORDER BY t.created_at DESC
                """
            ).fetchall()
        )
    elif user["role"] == "faculty":
        faculty = db.execute("SELECT * FROM faculty WHERE user_id = ?", (user["id"],)).fetchone()
        if not faculty:
            db.close()
            return json_error("Faculty profile not found.", 404)
        timetables = rows_to_list(
            db.execute(
                """
                SELECT DISTINCT t.*, d.name as department_name
                FROM timetables t
                LEFT JOIN departments d ON t.department_id = d.id
                JOIN schedules s ON s.timetable_id = t.id
                WHERE s.faculty_id = ?
                ORDER BY t.created_at DESC
                """,
                (faculty["id"],),
            ).fetchall()
        )
    else:
        student = db.execute("SELECT * FROM students WHERE user_id = ?", (user["id"],)).fetchone()
        if not student:
            db.close()
            return json_error("Student profile not found.", 404)
        timetables = rows_to_list(
            db.execute(
                """
                SELECT t.*, d.name as department_name
                FROM timetables t
                LEFT JOIN departments d ON t.department_id = d.id
                WHERE t.department_id = ? AND t.semester = ?
                ORDER BY t.created_at DESC
                """,
                (student["department_id"], student["semester"]),
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
    db = get_db()
    data = {
        "subjects": rows_to_list(
            db.execute(
                "SELECT * FROM subjects WHERE department_id = ? AND semester = ?",
                (department_id, semester),
            ).fetchall()
        ),
        "subject_faculty": rows_to_list(
            db.execute(
                "SELECT * FROM subject_faculty WHERE department_id = ? AND semester = ?",
                (department_id, semester),
            ).fetchall()
        ),
        "faculty": rows_to_list(db.execute("SELECT * FROM faculty WHERE department_id = ?", (department_id,)).fetchall()),
        "classrooms": rows_to_list(
            db.execute(
                "SELECT * FROM classrooms WHERE department_id IS NULL OR department_id = ?",
                (department_id,),
            ).fetchall()
        ),
        "students": rows_to_list(
            db.execute(
                "SELECT * FROM students WHERE department_id = ? AND semester = ?",
                (department_id, semester),
            ).fetchall()
        ),
        "constraints": rows_to_list(
            db.execute(
                "SELECT * FROM constraints WHERE department_id IS NULL OR department_id = ?",
                (department_id,),
            ).fetchall()
        ),
    }
    if not data["subjects"]:
        db.close()
        return json_error("No subjects found for this department and semester.", 400)
    if not data["subject_faculty"]:
        db.close()
        return json_error("No faculty allocated to subjects. Please allocate faculty first.", 400)
    generator = TimetableGenerator(data, int(department_id), int(semester))
    timetable_data = generator.generate()
    timetable_json = json.dumps(timetable_data)
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
                timetable_id, day, time_slot, subject_id, faculty_id, classroom_id,
                department_id, semester, student_group
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                timetable_id,
                schedule["day"],
                schedule["time_slot"],
                schedule["subject_id"],
                schedule["faculty_id"],
                schedule["classroom_id"],
                department_id,
                semester,
                schedule.get("student_group", "All"),
            ),
        )
    for faculty_id in {item["faculty_id"] for item in timetable_data["schedules"] if item["faculty_id"]}:
        faculty_user = db.execute("SELECT user_id FROM faculty WHERE id = ?", (faculty_id,)).fetchone()
        if faculty_user:
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
    student_users = db.execute(
        "SELECT user_id FROM students WHERE department_id = ? AND semester = ?",
        (department_id, semester),
    ).fetchall()
    for student in student_users:
        db.execute(
            """
            INSERT INTO notifications (user_id, message, notification_type)
            VALUES (?, ?, ?)
            """,
            (
                student["user_id"],
                f"New timetable generated for Semester {semester} - {academic_year}",
                "timetable_update",
            ),
        )
    db.commit()
    timetable_payload = build_timetable_payload(db, timetable_id)
    db.close()
    return jsonify({"message": f'Timetable generated successfully. Fitness Score: {timetable_data["metadata"]["fitness_score"]:.2f}', **timetable_payload}), 201


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
    department = db.execute("SELECT * FROM departments WHERE id = ?", (timetable["department_id"],)).fetchone()
    db.close()
    pdf_path = ReportGenerator().generate_pdf(timetable, schedules, department)
    return send_file(pdf_path, as_attachment=True, download_name=f'timetable_dept_{department["code"]}_sem_{timetable["semester"]}.pdf')
