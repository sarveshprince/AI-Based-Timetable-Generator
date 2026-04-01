from datetime import datetime

import psycopg2
from flask import Blueprint, jsonify, request
from werkzeug.security import generate_password_hash

from db.database import get_db
from services.realtime_service import broadcast_timetable_update
from services.timetable_service import build_timetable_payload
from utils.decorators import admin_required, auth_required
from utils.helpers import json_error, row_to_dict, rows_to_list


faculty_bp = Blueprint("faculty", __name__)


@faculty_bp.route("/api/faculty", methods=["GET"])
@auth_required
def get_faculty():
    db = get_db()
    if request.user["role"] == "faculty":
        faculty_list = rows_to_list(
            db.execute(
                """
                SELECT f.*, d.name AS department_name, u.username, u.is_active
                FROM faculty f
                LEFT JOIN departments d ON f.department_id = d.id
                LEFT JOIN users u ON f.user_id = u.id
                WHERE f.user_id = ?
                ORDER BY f.name
                """,
                (request.user["id"],),
            ).fetchall()
        )
    else:
        faculty_list = rows_to_list(
            db.execute(
                """
                SELECT f.*, d.name AS department_name, u.username, u.is_active
                FROM faculty f
                LEFT JOIN departments d ON f.department_id = d.id
                LEFT JOIN users u ON f.user_id = u.id
                ORDER BY f.name
                """
            ).fetchall()
        )
    departments = rows_to_list(db.execute("SELECT * FROM departments ORDER BY name").fetchall())
    db.close()
    return jsonify({"faculty": faculty_list, "departments": departments})


@faculty_bp.route("/api/faculty", methods=["POST"])
@auth_required
@admin_required
def create_faculty():
    payload = request.get_json(silent=True) or {}
    name = (payload.get("name") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    department_id = payload.get("department_id")
    employee_id = (payload.get("employee_id") or "").strip()
    phone = (payload.get("phone") or "").strip()
    username = (payload.get("username") or "").strip()
    password = payload.get("password") or ""
    if not all([name, email, department_id, employee_id, username, password]):
        return json_error("All required faculty fields must be provided.")

    db = get_db()
    try:
        hashed_password = generate_password_hash(password, method="pbkdf2:sha256")
        user_cursor = db.execute(
            """
            INSERT INTO users (username, password, role, full_name, email, created_by)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (username, hashed_password, "faculty", name, email, request.user["id"]),
        )
        user_id = user_cursor.lastrowid
        faculty_cursor = db.execute(
            """
            INSERT INTO faculty (user_id, name, email, department_id, employee_id, phone)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (user_id, name, email, department_id, employee_id, phone),
        )
        faculty_id = faculty_cursor.lastrowid
        db.execute("UPDATE users SET linked_id = ? WHERE id = ?", (faculty_id, user_id))
        db.commit()
    except psycopg2.IntegrityError:
        db.rollback()
        db.close()
        return json_error("Username, email, or employee ID already exists.", 409)

    faculty = db.execute(
        """
        SELECT f.*, d.name AS department_name, u.username, u.is_active
        FROM faculty f
        LEFT JOIN departments d ON f.department_id = d.id
        LEFT JOIN users u ON f.user_id = u.id
        WHERE f.id = ?
        """,
        (faculty_id,),
    ).fetchone()
    db.close()
    return jsonify({"faculty": row_to_dict(faculty)}), 201


@faculty_bp.route("/api/faculty/<int:faculty_id>", methods=["DELETE"])
@auth_required
@admin_required
def remove_faculty(faculty_id):
    db = get_db()
    faculty = db.execute("SELECT user_id FROM faculty WHERE id = ?", (faculty_id,)).fetchone()
    if faculty and faculty["user_id"]:
        db.execute("DELETE FROM users WHERE id = ?", (faculty["user_id"],))
    db.execute("DELETE FROM faculty WHERE id = ?", (faculty_id,))
    db.commit()
    db.close()
    return jsonify({"success": True})


@faculty_bp.route("/api/faculty-by-dept", methods=["GET"])
@auth_required
def faculty_by_department():
    dept_id = request.args.get("dept_id")
    db = get_db()
    faculty = rows_to_list(
        db.execute(
            "SELECT id, name, employee_id FROM faculty WHERE department_id = ? ORDER BY name",
            (dept_id,),
        ).fetchall()
    )
    db.close()
    return jsonify({"faculty": faculty})


@faculty_bp.route("/api/faculty/mark-absent", methods=["POST"])
@auth_required
def mark_faculty_absent():
    if request.user["role"] not in ("admin", "faculty"):
        return json_error("Only admin/faculty can mark absences.", 403)

    payload = request.get_json(silent=True) or {}
    faculty_id = payload.get("faculty_id")
    date_value = (payload.get("date") or "").strip()
    time_slot = (payload.get("time_slot") or "").strip()
    if not faculty_id or not date_value or not time_slot:
        return json_error("faculty_id, date, and time_slot are required.")

    try:
        day_name = datetime.strptime(date_value, "%Y-%m-%d").strftime("%A")
    except ValueError:
        return json_error("date must be YYYY-MM-DD.", 400)

    db = get_db()
    absent_faculty = db.execute("SELECT * FROM faculty WHERE id = ?", (faculty_id,)).fetchone()
    if not absent_faculty:
        db.close()
        return json_error("Faculty not found.", 404)

    impacted = db.execute(
        """
        SELECT s.*, sub.name AS subject_name, sub.code AS subject_code, t.status
        FROM schedules s
        JOIN timetables t ON t.id = s.timetable_id
        JOIN subjects sub ON sub.id = s.subject_id
        WHERE s.faculty_id = ?
          AND s.day = ?
          AND s.time_slot = ?
          AND t.status = 'active'
        ORDER BY t.created_at DESC
        LIMIT 1
        """,
        (faculty_id, day_name, time_slot),
    ).fetchone()
    if not impacted:
        db.close()
        return json_error("No affected active slot found.", 404)

    timetable_id = impacted["timetable_id"]
    subject_id = impacted["subject_id"]
    section_id = impacted["section_id"]
    department_id = absent_faculty["department_id"]

    candidates = rows_to_list(
        db.execute(
            """
            SELECT
                f.id,
                f.name,
                f.user_id,
                CASE WHEN sf.id IS NULL THEN 0 ELSE 1 END AS subject_match,
                COUNT(w.id) AS workload
            FROM faculty f
            LEFT JOIN subject_faculty sf
                ON sf.faculty_id = f.id
               AND sf.subject_id = ?
               AND sf.section_id = ?
            LEFT JOIN schedules w
                ON w.faculty_id = f.id
               AND w.timetable_id = ?
            WHERE f.department_id = ?
              AND f.id <> ?
              AND NOT EXISTS (
                SELECT 1
                FROM schedules s2
                WHERE s2.timetable_id = ?
                  AND s2.faculty_id = f.id
                  AND s2.day = ?
                  AND s2.time_slot = ?
              )
            GROUP BY f.id, f.name, f.user_id, sf.id
            ORDER BY subject_match DESC, workload ASC, f.name ASC
            """,
            (
                subject_id,
                section_id,
                timetable_id,
                department_id,
                faculty_id,
                timetable_id,
                day_name,
                time_slot,
            ),
        ).fetchall()
    )
    if not candidates:
        db.close()
        return json_error("No available replacement faculty found.", 409)

    replacement = candidates[0]
    db.execute("UPDATE schedules SET faculty_id = ? WHERE id = ?", (replacement["id"], impacted["id"]))

    if replacement.get("user_id"):
        db.execute(
            """
            INSERT INTO notifications (user_id, message, notification_type)
            VALUES (?, ?, ?)
            """,
            (
                replacement["user_id"],
                f"Substitution assigned: {impacted['subject_name']} on {day_name} {time_slot}.",
                "faculty_substitution",
            ),
        )

    admin_users = db.execute("SELECT id FROM users WHERE role = 'admin' AND is_active = TRUE").fetchall()
    for admin in admin_users:
        db.execute(
            """
            INSERT INTO notifications (user_id, message, notification_type)
            VALUES (?, ?, ?)
            """,
            (
                admin["id"],
                f"Faculty substitution: {absent_faculty['name']} -> {replacement['name']} for {impacted['subject_name']} ({day_name} {time_slot}).",
                "faculty_substitution",
            ),
        )

    db.commit()
    updated_timetable = build_timetable_payload(db, timetable_id)
    db.close()

    if updated_timetable:
        broadcast_timetable_update(
            timetable_id,
            {
                "timetable_id": timetable_id,
                "updated_timetable": updated_timetable,
                "source": "substitution",
            },
        )

    return jsonify(
        {
            "success": True,
            "message": "Substitution assigned successfully.",
            "replacement": replacement,
            "updated_timetable": updated_timetable,
        }
    )
