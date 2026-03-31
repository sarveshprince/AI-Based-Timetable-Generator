from datetime import datetime

import psycopg2
from flask import Blueprint, jsonify, request
from werkzeug.security import generate_password_hash

from db.database import get_db
from services.user_service import serialize_user
from utils.decorators import admin_required, auth_required
from utils.helpers import json_error, row_to_dict, rows_to_list


user_bp = Blueprint("user", __name__)


@user_bp.route("/api/<path:_path>", methods=["OPTIONS"])
@user_bp.route("/api", methods=["OPTIONS"])
def handle_options(_path=None):
    return ("", 204)


@user_bp.route("/api/me", methods=["GET"])
@auth_required
def me():
    return jsonify({"user": serialize_user(request.user)})


@user_bp.route("/api/dashboard", methods=["GET"])
@auth_required
def dashboard():
    db = get_db()
    user = request.user
    if user["role"] == "admin":
        stats = {
            "departments": db.execute("SELECT COUNT(*) as count FROM departments").fetchone()["count"],
            "subjects": db.execute("SELECT COUNT(*) as count FROM subjects").fetchone()["count"],
            "faculty": db.execute("SELECT COUNT(*) as count FROM faculty").fetchone()["count"],
            "classrooms": db.execute("SELECT COUNT(*) as count FROM classrooms").fetchone()["count"],
            "students": db.execute("SELECT COUNT(*) as count FROM students").fetchone()["count"],
            "timetables": db.execute("SELECT COUNT(*) as count FROM timetables").fetchone()["count"],
        }
        recent_timetables = rows_to_list(
            db.execute(
                """
                SELECT t.*, d.name as department_name
                FROM timetables t
                LEFT JOIN departments d ON t.department_id = d.id
                ORDER BY t.created_at DESC LIMIT 5
                """
            ).fetchall()
        )
    elif user["role"] == "faculty":
        faculty = db.execute("SELECT * FROM faculty WHERE user_id = ?", (user["id"],)).fetchone()
        if not faculty:
            db.close()
            return json_error("Faculty profile not found.", 404)
        stats = {
            "assigned_subjects": db.execute(
                "SELECT COUNT(*) FROM subject_faculty WHERE faculty_id = ?",
                (faculty["id"],),
            ).fetchone()[0],
            "department": db.execute(
                "SELECT name FROM departments WHERE id = ?",
                (faculty["department_id"],),
            ).fetchone()["name"],
        }
        recent_timetables = rows_to_list(
            db.execute(
                """
                SELECT DISTINCT t.*, d.name as department_name
                FROM timetables t
                LEFT JOIN departments d ON t.department_id = d.id
                JOIN schedules s ON s.timetable_id = t.id
                WHERE s.faculty_id = ? AND t.status = 'active'
                ORDER BY t.created_at DESC LIMIT 5
                """,
                (faculty["id"],),
            ).fetchall()
        )
    else:
        student = db.execute("SELECT * FROM students WHERE user_id = ?", (user["id"],)).fetchone()
        if not student:
            db.close()
            return json_error("Student profile not found.", 404)
        stats = {
            "enrolled_subjects": db.execute(
                "SELECT COUNT(*) FROM student_subjects WHERE student_id = ?",
                (student["id"],),
            ).fetchone()[0],
            "semester": student["semester"],
            "department": db.execute(
                "SELECT name FROM departments WHERE id = ?",
                (student["department_id"],),
            ).fetchone()["name"],
        }
        recent_timetables = rows_to_list(
            db.execute(
                """
                SELECT t.*, d.name as department_name
                FROM timetables t
                LEFT JOIN departments d ON t.department_id = d.id
                WHERE t.department_id = ? AND t.semester = ? AND t.status = 'active'
                ORDER BY t.created_at DESC LIMIT 5
                """,
                (student["department_id"], student["semester"]),
            ).fetchall()
        )
    db.close()
    return jsonify({"stats": stats, "recent_timetables": recent_timetables, "user": serialize_user(user)})


@user_bp.route("/api/students", methods=["GET"])
@auth_required
def get_students():
    db = get_db()
    departments = rows_to_list(db.execute("SELECT * FROM departments ORDER BY name").fetchall())
    if request.user["role"] == "student":
        students = rows_to_list(
            db.execute(
                """
                SELECT s.*, d.name as department_name, u.username, u.is_active
                FROM students s
                LEFT JOIN departments d ON s.department_id = d.id
                LEFT JOIN users u ON s.user_id = u.id
                WHERE s.user_id = ?
                ORDER BY s.name
                """,
                (request.user["id"],),
            ).fetchall()
        )
    else:
        students = rows_to_list(
            db.execute(
                """
                SELECT s.*, d.name as department_name, u.username, u.is_active
                FROM students s
                LEFT JOIN departments d ON s.department_id = d.id
                LEFT JOIN users u ON s.user_id = u.id
                ORDER BY s.name
                """
            ).fetchall()
        )
    db.close()
    return jsonify({"students": students, "departments": departments})


@user_bp.route("/api/students", methods=["POST"])
@auth_required
@admin_required
def create_student():
    payload = request.get_json(silent=True) or {}
    name = (payload.get("name") or "").strip()
    roll_number = (payload.get("roll_number") or "").strip()
    department_id = payload.get("department_id")
    semester = payload.get("semester")
    email = (payload.get("email") or "").strip().lower()
    phone = (payload.get("phone") or "").strip()
    username = (payload.get("username") or "").strip()
    password = payload.get("password") or ""
    if not all([name, roll_number, department_id, semester, email, username, password]):
        return json_error("All required student fields must be provided.")
    db = get_db()
    try:
        hashed_password = generate_password_hash(password, method="pbkdf2:sha256")
        cursor = db.execute(
            """
            INSERT INTO users (username, email, password, role, full_name, created_by)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (username, email, hashed_password, "student", name, request.user["id"]),
        )
        user_id = cursor.lastrowid
        cursor = db.execute(
            """
            INSERT INTO students (user_id, name, roll_number, department_id, semester, email, phone)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (user_id, name, roll_number, department_id, semester, email, phone),
        )
        student_id = cursor.lastrowid
        db.execute("UPDATE users SET linked_id = ? WHERE id = ?", (student_id, user_id))
        subjects = db.execute(
            "SELECT id FROM subjects WHERE department_id = ? AND semester = ?",
            (department_id, semester),
        ).fetchall()
        for subject in subjects:
            db.execute(
                "INSERT INTO student_subjects (student_id, subject_id, semester) VALUES (?, ?, ?)",
                (student_id, subject["id"], semester),
            )
        db.commit()
    except psycopg2.IntegrityError:
        db.rollback()
        db.close()
        return json_error("Username, email, or roll number already exists.", 409)
    student = db.execute(
        """
        SELECT s.*, d.name as department_name, u.username, u.is_active
        FROM students s
        LEFT JOIN departments d ON s.department_id = d.id
        LEFT JOIN users u ON s.user_id = u.id
        WHERE s.id = ?
        """,
        (student_id,),
    ).fetchone()
    db.close()
    return jsonify({"student": row_to_dict(student)}), 201


@user_bp.route("/api/students/<int:student_id>", methods=["DELETE"])
@auth_required
@admin_required
def delete_student(student_id):
    db = get_db()
    student = db.execute("SELECT user_id FROM students WHERE id = ?", (student_id,)).fetchone()
    if student and student["user_id"]:
        db.execute("DELETE FROM users WHERE id = ?", (student["user_id"],))
    db.execute("DELETE FROM students WHERE id = ?", (student_id,))
    db.commit()
    db.close()
    return jsonify({"success": True})


@user_bp.route("/api/notifications", methods=["GET"])
@auth_required
def get_notifications():
    db = get_db()
    notifications = rows_to_list(
        db.execute(
            """
            SELECT * FROM notifications
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 50
            """,
            (request.user["id"],),
        ).fetchall()
    )
    db.execute("UPDATE notifications SET is_read = 1 WHERE user_id = ?", (request.user["id"],))
    db.commit()
    db.close()
    return jsonify({"notifications": notifications})


@user_bp.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "timestamp": datetime.utcnow().isoformat()})
