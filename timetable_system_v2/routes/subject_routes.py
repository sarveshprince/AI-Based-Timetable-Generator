import psycopg2
from flask import Blueprint, jsonify, request

from db.database import get_db
from utils.decorators import admin_required, auth_required
from utils.helpers import json_error, row_to_dict, rows_to_list


subject_bp = Blueprint("subject", __name__)


@subject_bp.route("/api/subjects", methods=["GET"])
@auth_required
def get_subjects():
    department_id = request.args.get("department_id", "").strip()
    semester = request.args.get("semester", "").strip()
    db = get_db()
    query = """
        SELECT s.*, d.name as department_name
        FROM subjects s
        LEFT JOIN departments d ON s.department_id = d.id
        WHERE 1 = 1
    """
    params = []
    if department_id:
        query += " AND s.department_id = ?"
        params.append(department_id)
    if semester:
        query += " AND s.semester = ?"
        params.append(semester)
    query += " ORDER BY d.name, s.semester, s.name"
    subjects = rows_to_list(db.execute(query, params).fetchall())
    departments = rows_to_list(db.execute("SELECT * FROM departments ORDER BY name").fetchall())
    db.close()
    return jsonify({"subjects": subjects, "departments": departments, "filters": {"department_id": department_id, "semester": semester}})


@subject_bp.route("/api/subjects", methods=["POST"])
@auth_required
@admin_required
def create_subject():
    payload = request.get_json(silent=True) or {}
    values = (
        (payload.get("name") or "").strip(),
        (payload.get("code") or "").strip(),
        payload.get("department_id"),
        payload.get("semester"),
        payload.get("credits"),
        payload.get("hours_per_week"),
        (payload.get("subject_type") or "theory").strip(),
    )
    if not all(values[:6]):
        return json_error("All required subject fields must be provided.")
    db = get_db()
    try:
        cursor = db.execute(
            """
            INSERT INTO subjects (name, code, department_id, semester, credits, hours_per_week, subject_type)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            values,
        )
        db.commit()
        subject = db.execute(
            """
            SELECT s.*, d.name as department_name
            FROM subjects s
            LEFT JOIN departments d ON s.department_id = d.id
            WHERE s.id = ?
            """,
            (cursor.lastrowid,),
        ).fetchone()
    except psycopg2.IntegrityError:
        db.rollback()
        db.close()
        return json_error("Subject code already exists.", 409)
    db.close()
    return jsonify({"subject": row_to_dict(subject)}), 201


@subject_bp.route("/api/subjects/<int:subject_id>", methods=["DELETE"])
@auth_required
@admin_required
def delete_subject(subject_id):
    db = get_db()
    db.execute("DELETE FROM subjects WHERE id = ?", (subject_id,))
    db.commit()
    db.close()
    return jsonify({"success": True})


@subject_bp.route("/api/subject-allocations", methods=["GET"])
@auth_required
def get_allocations():
    db = get_db()
    allocations = rows_to_list(
        db.execute(
            """
            SELECT sf.*, s.name as subject_name, s.code as subject_code,
                   f.name as faculty_name, d.name as department_name
            FROM subject_faculty sf
            JOIN subjects s ON sf.subject_id = s.id
            JOIN faculty f ON sf.faculty_id = f.id
            JOIN departments d ON sf.department_id = d.id
            ORDER BY d.name, sf.semester, s.name
            """
        ).fetchall()
    )
    departments = rows_to_list(db.execute("SELECT * FROM departments ORDER BY name").fetchall())
    db.close()
    return jsonify({"allocations": allocations, "departments": departments})


@subject_bp.route("/api/subject-allocations", methods=["POST"])
@auth_required
@admin_required
def create_allocation():
    payload = request.get_json(silent=True) or {}
    subject_id = payload.get("subject_id")
    faculty_id = payload.get("faculty_id")
    if not subject_id or not faculty_id:
        return json_error("Subject and faculty are required.")
    db = get_db()
    subject = db.execute("SELECT department_id, semester FROM subjects WHERE id = ?", (subject_id,)).fetchone()
    if not subject:
        db.close()
        return json_error("Subject not found.", 404)
    try:
        cursor = db.execute(
            """
            INSERT INTO subject_faculty (subject_id, faculty_id, department_id, semester)
            VALUES (?, ?, ?, ?)
            """,
            (subject_id, faculty_id, subject["department_id"], subject["semester"]),
        )
        db.commit()
    except psycopg2.IntegrityError:
        db.rollback()
        db.close()
        return json_error("This subject is already allocated to this faculty.", 409)
    allocation = db.execute(
        """
        SELECT sf.*, s.name as subject_name, s.code as subject_code,
               f.name as faculty_name, d.name as department_name
        FROM subject_faculty sf
        JOIN subjects s ON sf.subject_id = s.id
        JOIN faculty f ON sf.faculty_id = f.id
        JOIN departments d ON sf.department_id = d.id
        WHERE sf.id = ?
        """,
        (cursor.lastrowid,),
    ).fetchone()
    db.close()
    return jsonify({"allocation": row_to_dict(allocation)}), 201


@subject_bp.route("/api/subject-allocations/<int:allocation_id>", methods=["DELETE"])
@auth_required
@admin_required
def delete_allocation(allocation_id):
    db = get_db()
    db.execute("DELETE FROM subject_faculty WHERE id = ?", (allocation_id,))
    db.commit()
    db.close()
    return jsonify({"success": True})


@subject_bp.route("/api/subjects-by-dept-sem", methods=["GET"])
@auth_required
def subjects_by_department_semester():
    dept_id = request.args.get("dept_id")
    semester = request.args.get("semester")
    db = get_db()
    subjects = rows_to_list(
        db.execute(
            "SELECT id, name, code FROM subjects WHERE department_id = ? AND semester = ? ORDER BY name",
            (dept_id, semester),
        ).fetchall()
    )
    db.close()
    return jsonify({"subjects": subjects})
