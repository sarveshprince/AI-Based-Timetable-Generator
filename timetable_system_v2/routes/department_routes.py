import psycopg2
from flask import Blueprint, jsonify, request

from db.database import get_db
from utils.decorators import admin_required, auth_required
from utils.helpers import json_error, row_to_dict, rows_to_list


department_bp = Blueprint("department", __name__)


@department_bp.route("/api/departments", methods=["GET"])
@auth_required
def get_departments():
    db = get_db()
    departments = rows_to_list(db.execute("SELECT * FROM departments ORDER BY name").fetchall())
    db.close()
    return jsonify({"departments": departments})


@department_bp.route("/api/departments", methods=["POST"])
@auth_required
@admin_required
def create_department():
    payload = request.get_json(silent=True) or {}
    name = (payload.get("name") or "").strip()
    code = (payload.get("code") or "").strip()
    if not name or not code:
        return json_error("Name and code are required.")
    db = get_db()
    try:
        cursor = db.execute("INSERT INTO departments (name, code) VALUES (?, ?)", (name, code))
        db.commit()
        department = db.execute("SELECT * FROM departments WHERE id = ?", (cursor.lastrowid,)).fetchone()
    except psycopg2.IntegrityError:
        db.rollback()
        db.close()
        return json_error("Department code already exists.", 409)
    db.close()
    return jsonify({"department": row_to_dict(department)}), 201


@department_bp.route("/api/departments/<int:department_id>", methods=["DELETE"])
@auth_required
@admin_required
def delete_department(department_id):
    db = get_db()
    db.execute("DELETE FROM departments WHERE id = ?", (department_id,))
    db.commit()
    db.close()
    return jsonify({"success": True})
