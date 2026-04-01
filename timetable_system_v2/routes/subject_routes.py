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
    year = request.args.get("year", "").strip()

    db = get_db()
    query = """
        SELECT s.*, d.name AS department_name
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
    if year:
        query += " AND s.year = ?"
        params.append(year)
    query += " ORDER BY d.name, s.year, s.semester, s.name"

    subjects = rows_to_list(db.execute(query, params).fetchall())
    departments = rows_to_list(db.execute("SELECT * FROM departments ORDER BY name").fetchall())
    db.close()
    return jsonify(
        {
            "subjects": subjects,
            "departments": departments,
            "filters": {"department_id": department_id, "semester": semester, "year": year},
        }
    )


@subject_bp.route("/api/subjects", methods=["POST"])
@auth_required
@admin_required
def create_subject():
    payload = request.get_json(silent=True) or {}

    name = (payload.get("name") or "").strip()
    code = (payload.get("code") or "").strip()
    department_id = payload.get("department_id")
    semester_raw = payload.get("semester")
    credits = payload.get("credits")
    hours_per_week = payload.get("hours_per_week")
    subject_type = (payload.get("subject_type") or "theory").strip().lower()
    weightage = payload.get("weightage") or 1

    # 🔥 FIX 1: parse semester properly
    semester = None
    if semester_raw:
        if isinstance(semester_raw, str):
            semester = int(semester_raw.split()[-1])  # handles "Semester 6"
        else:
            semester = int(semester_raw)

    # 🔥 FIX 2: derive year
    year = (semester + 1) // 2 if semester else None

    # 🔥 FIX 3: validation (remove year from required)
    if not all([name, code, department_id, semester, credits, hours_per_week]):
        return json_error("All required subject fields must be provided.")

    if subject_type not in ("theory", "lab", "viva"):
        return json_error("subject_type must be one of theory/lab/viva.")

    db = get_db()

    try:
        cursor = db.execute(
            """
            INSERT INTO subjects (
                name, code, department_id, year, semester, credits, hours_per_week, subject_type, weightage
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                name,
                code,
                department_id,
                year,
                semester,
                credits,
                hours_per_week,
                subject_type,
                weightage,
            ),
        )

        db.commit()

        subject = db.execute(
            """
            SELECT s.*, d.name AS department_name
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
            SELECT sf.*,
                   s.name AS subject_name,
                   s.code AS subject_code,
                   f.name AS faculty_name,
                   d.name AS department_name,
                   sec.name AS section_name,
                   sec.name AS section_code,
                   y.year_number AS section_year
            FROM subject_faculty sf
            JOIN subjects s ON sf.subject_id = s.id
            JOIN faculty f ON sf.faculty_id = f.id
            JOIN sections sec ON sf.section_id = sec.id
            JOIN years y ON sec.year_id = y.id
            JOIN departments d ON y.department_id = d.id
            ORDER BY d.name, y.year_number, sec.name, s.name
            """
        ).fetchall()
    )
    departments = rows_to_list(db.execute("SELECT * FROM departments ORDER BY name").fetchall())
    sections = rows_to_list(
        db.execute(
            """
            SELECT sec.id,
                   sec.year_id,
                   sec.name,
                   sec.strength,
                   y.department_id,
                   y.year_number AS year,
                   d.name AS department_name
            FROM sections sec
            JOIN years y ON sec.year_id = y.id
            JOIN departments d ON y.department_id = d.id
            ORDER BY d.name, y.year_number, sec.name
            """
        ).fetchall()
    )
    db.close()
    return jsonify({"allocations": allocations, "departments": departments, "sections": sections})


@subject_bp.route("/api/subject-allocations", methods=["POST"])
@auth_required
@admin_required
def create_allocation():
    payload = request.get_json(silent=True) or {}
    subject_id = payload.get("subject_id")
    faculty_id = payload.get("faculty_id")
    section_id = payload.get("section_id")
    if not subject_id or not faculty_id or not section_id:
        return json_error("subject_id, faculty_id and section_id are required.")

    db = get_db()
    subject = db.execute("SELECT department_id, semester, year FROM subjects WHERE id = ?", (subject_id,)).fetchone()
    section = db.execute(
        """
        SELECT y.department_id, y.year_number AS year
        FROM sections s
        JOIN years y ON s.year_id = y.id
        WHERE s.id = ?
        """,
        (section_id,),
    ).fetchone()
    faculty = db.execute("SELECT department_id FROM faculty WHERE id = ?", (faculty_id,)).fetchone()
    if not subject or not section or not faculty:
        db.close()
        return json_error("Invalid subject/faculty/section.", 404)
    if subject["department_id"] != section["department_id"] or subject["department_id"] != faculty["department_id"]:
        db.close()
        return json_error("subject/faculty/section must belong to same department.", 400)
    if subject["year"] != section["year"]:
        db.close()
        return json_error("Subject year must match section year.", 400)

    try:
        cursor = db.execute(
            """
            INSERT INTO subject_faculty (subject_id, faculty_id, section_id)
            VALUES (?, ?, ?)
            """,
            (subject_id, faculty_id, section_id),
        )
        db.commit()
    except psycopg2.IntegrityError:
        db.rollback()
        db.close()
        return json_error("This subject-faculty-section allocation already exists.", 409)

    allocation = db.execute(
        """
        SELECT sf.*,
               s.name AS subject_name,
               s.code AS subject_code,
               f.name AS faculty_name,
               sec.name AS section_name
        FROM subject_faculty sf
        JOIN subjects s ON sf.subject_id = s.id
        JOIN faculty f ON sf.faculty_id = f.id
        JOIN sections sec ON sf.section_id = sec.id
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
    year = request.args.get("year")
    db = get_db()

    query = "SELECT id, name, code FROM subjects WHERE department_id = ?"
    params = [dept_id]
    if semester:
        query += " AND semester = ?"
        params.append(semester)
    if year:
        query += " AND year = ?"
        params.append(year)
    query += " ORDER BY name"

    subjects = rows_to_list(db.execute(query, params).fetchall())
    db.close()
    return jsonify({"subjects": subjects})
