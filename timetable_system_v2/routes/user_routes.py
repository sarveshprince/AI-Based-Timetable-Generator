from datetime import datetime

from flask import Blueprint, jsonify, request

from db.database import get_db
from services.user_service import serialize_user
from utils.decorators import auth_required
from utils.helpers import rows_to_list


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
            "departments": db.execute("SELECT COUNT(*) AS count FROM departments").fetchone()["count"],
            "sections": db.execute("SELECT COUNT(*) AS count FROM sections").fetchone()["count"],
            "subjects": db.execute("SELECT COUNT(*) AS count FROM subjects").fetchone()["count"],
            "faculty": db.execute("SELECT COUNT(*) AS count FROM faculty").fetchone()["count"],
            "timetables": db.execute("SELECT COUNT(*) AS count FROM timetables").fetchone()["count"],
        }
        recent_timetables = rows_to_list(
            db.execute(
                """
                SELECT t.*, d.name AS department_name
                FROM timetables t
                LEFT JOIN departments d ON t.department_id = d.id
                ORDER BY t.created_at DESC
                LIMIT 5
                """
            ).fetchall()
        )
    else:
        faculty = db.execute("SELECT * FROM faculty WHERE user_id = ?", (user["id"],)).fetchone()
        stats = {
            "assigned_subjects": db.execute(
                """
                SELECT COUNT(DISTINCT subject_id) AS count
                FROM subject_faculty
                WHERE faculty_id = ?
                """,
                (faculty["id"],),
            ).fetchone()["count"]
            if faculty
            else 0,
            "assigned_sections": db.execute(
                """
                SELECT COUNT(DISTINCT section_id) AS count
                FROM subject_faculty
                WHERE faculty_id = ?
                """,
                (faculty["id"],),
            ).fetchone()["count"]
            if faculty
            else 0,
        }
        recent_timetables = rows_to_list(
            db.execute(
                """
                SELECT DISTINCT t.*, d.name AS department_name
                FROM timetables t
                JOIN schedules s ON s.timetable_id = t.id
                LEFT JOIN departments d ON t.department_id = d.id
                WHERE s.faculty_id = ? AND t.status = 'active'
                ORDER BY t.created_at DESC
                LIMIT 5
                """,
                (faculty["id"],),
            ).fetchall()
        ) if faculty else []

    db.close()
    return jsonify({"stats": stats, "recent_timetables": recent_timetables, "user": serialize_user(user)})


@user_bp.route("/api/notifications", methods=["GET"])
@auth_required
def get_notifications():
    db = get_db()
    notifications = rows_to_list(
        db.execute(
            """
            SELECT *
            FROM notifications
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 50
            """,
            (request.user["id"],),
        ).fetchall()
    )
    db.execute("UPDATE notifications SET is_read = TRUE WHERE user_id = ?", (request.user["id"],))
    db.commit()
    db.close()
    return jsonify({"notifications": notifications})


@user_bp.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "timestamp": datetime.utcnow().isoformat()})
