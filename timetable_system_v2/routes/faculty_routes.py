import psycopg2
from flask import Blueprint, jsonify, request
from werkzeug.security import generate_password_hash

from db.database import get_db
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
                SELECT f.*, d.name as department_name, u.username, u.is_active
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
                SELECT f.*, d.name as department_name, u.username, u.is_active
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
    max_hours = int(payload.get("max_hours") or 20)
    username = (payload.get("username") or "").strip()
    password = payload.get("password") or ""
    if not all([name, email, department_id, employee_id, username, password]):
        return json_error("All required faculty fields must be provided.")
    db = get_db()
    try:
        hashed_password = generate_password_hash(password, method="pbkdf2:sha256")
        cursor = db.execute(
            """
            INSERT INTO users (username, password, role, full_name, email, created_by)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (username, hashed_password, "faculty", name, email, request.user["id"]),
        )
        user_id = cursor.lastrowid
        cursor = db.execute(
            """
            INSERT INTO faculty (user_id, name, email, department_id, employee_id, phone, max_hours_per_week)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (user_id, name, email, department_id, employee_id, phone, max_hours),
        )
        faculty_id = cursor.lastrowid
        db.execute("UPDATE users SET linked_id = ? WHERE id = ?", (faculty_id, user_id))
        db.commit()
    except psycopg2.IntegrityError:
        db.rollback()
        db.close()
        return json_error("Username, email, or employee ID already exists.", 409)
    faculty = db.execute(
        """
        SELECT f.*, d.name as department_name, u.username, u.is_active
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
