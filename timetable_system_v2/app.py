from base64 import urlsafe_b64decode, urlsafe_b64encode
from datetime import datetime, timedelta, timezone
from functools import wraps
import hashlib
import hmac
import json
import os
import secrets

from flask import Flask, jsonify, request, send_file
import psycopg2
from psycopg2.extras import DictCursor
from psycopg2.pool import SimpleConnectionPool
from werkzeug.security import check_password_hash, generate_password_hash

from utils.report_generator import ReportGenerator
from utils.timetable_generator import TimetableGenerator

app = Flask(__name__)
app.config["DATABASE_URL"] = os.environ.get(
    "DATABASE_URL",
    "postgresql://neondb_owner:npg_TsGR48hQAwju@ep-broad-bread-a1mwr79t-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
)
app.config["SECRET_KEY"] = os.environ.get("TIMETABLE_SECRET", secrets.token_hex(32))
db_pool = None


class PostgresCursor:
    def __init__(self, cursor):
        self.cursor = cursor
        self.lastrowid = None

    def execute(self, query, params=None):
        sql = query.replace("?", "%s")
        normalized = sql.strip().rstrip(";")
        upper_sql = normalized.upper()
        self.lastrowid = None
        if upper_sql.startswith("INSERT INTO") and "RETURNING" not in upper_sql:
            sql = f"{normalized} RETURNING id"
            self.cursor.execute(sql, params)
            row = self.cursor.fetchone()
            self.lastrowid = row["id"] if row and "id" in row else None
            return self
        self.cursor.execute(sql, params)
        return self

    def fetchone(self):
        return self.cursor.fetchone()

    def fetchall(self):
        return self.cursor.fetchall()

    def __getattr__(self, name):
        return getattr(self.cursor, name)


class PostgresConnection:
    def __init__(self, connection):
        self.connection = connection

    def cursor(self):
        return PostgresCursor(self.connection.cursor(cursor_factory=DictCursor))

    def execute(self, query, params=None):
        return self.cursor().execute(query, params)

    def commit(self):
        self.connection.commit()

    def rollback(self):
        self.connection.rollback()

    def close(self):
        get_pool().putconn(self.connection)


def get_pool():
    global db_pool
    if db_pool is None:
        db_pool = SimpleConnectionPool(
            minconn=1,
            maxconn=10,
            dsn=app.config["DATABASE_URL"],
        )
    return db_pool


def get_db():
    return PostgresConnection(get_pool().getconn())


def init_db():
    connection = psycopg2.connect(app.config["DATABASE_URL"])
    try:
        with open("schema.sql", "r", encoding="utf-8") as schema_file:
            with connection.cursor() as cursor:
                cursor.execute(schema_file.read())
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def row_to_dict(row):
    return dict(row) if row else None


def rows_to_list(rows):
    return [dict(row) for row in rows]


def json_error(message, status_code=400):
    return jsonify({"message": message}), status_code


def b64url_encode(data):
    return urlsafe_b64encode(data).rstrip(b"=").decode("utf-8")


def b64url_decode(data):
    padding = "=" * (-len(data) % 4)
    return urlsafe_b64decode(f"{data}{padding}")


def create_token(user):
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "user_id": user["id"],
        "username": user["username"],
        "role": user["role"],
        "full_name": user["full_name"],
        "email": user["email"],
        "linked_id": user["linked_id"],
        "exp": int((datetime.now(timezone.utc) + timedelta(hours=24)).timestamp()),
    }
    header_segment = b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_segment = b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{header_segment}.{payload_segment}".encode("utf-8")
    signature = hmac.new(app.config["SECRET_KEY"].encode("utf-8"), signing_input, hashlib.sha256).digest()
    return f"{header_segment}.{payload_segment}.{b64url_encode(signature)}"


def decode_token(token):
    try:
        header_segment, payload_segment, signature_segment = token.split(".")
    except ValueError:
        return None
    signing_input = f"{header_segment}.{payload_segment}".encode("utf-8")
    expected_signature = hmac.new(app.config["SECRET_KEY"].encode("utf-8"), signing_input, hashlib.sha256).digest()
    if not hmac.compare_digest(expected_signature, b64url_decode(signature_segment)):
        return None
    try:
        payload = json.loads(b64url_decode(payload_segment))
    except (ValueError, json.JSONDecodeError):
        return None
    if payload.get("exp", 0) < int(datetime.now(timezone.utc).timestamp()):
        return None
    return payload


def current_user():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ", 1)[1].strip()
    payload = decode_token(token)
    if not payload:
        return None
    db = get_db()
    user = db.execute(
        "SELECT id, username, role, full_name, email, linked_id, is_active FROM users WHERE id = ?",
        (payload["user_id"],),
    ).fetchone()
    db.close()
    if not user or not user["is_active"]:
        return None
    return dict(user)


def auth_required(handler):
    @wraps(handler)
    def wrapped(*args, **kwargs):
        user = current_user()
        if not user:
            return json_error("Authentication required.", 401)
        request.user = user
        return handler(*args, **kwargs)

    return wrapped


def admin_required(handler):
    @wraps(handler)
    def wrapped(*args, **kwargs):
        user = getattr(request, "user", None) or current_user()
        if not user:
            return json_error("Authentication required.", 401)
        if user["role"] != "admin":
            return json_error("Administrator access required.", 403)
        request.user = user
        return handler(*args, **kwargs)

    return wrapped


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "http://localhost:5173"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    return response


@app.route("/api/<path:_path>", methods=["OPTIONS"])
@app.route("/api", methods=["OPTIONS"])
def handle_options(_path=None):
    return ("", 204)


def serialize_user(user):
    return {
        "id": user["id"],
        "username": user["username"],
        "role": user["role"],
        "full_name": user["full_name"],
        "email": user["email"],
        "linked_id": user["linked_id"],
    }


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


@app.route("/api/login", methods=["POST"])
def login():
    payload = request.get_json(silent=True) or {}
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""
    if not email or not password:
        return json_error("Email and password are required.")
    db = get_db()
    user = db.execute(
        "SELECT * FROM users WHERE email = ? AND is_active = TRUE",
        (email,),
    ).fetchone()
    db.close()
    if not user or not check_password_hash(user["password"], password):
        return json_error("Invalid credentials.", 401)
    token = create_token(user)
    return jsonify({"token": token, "user": serialize_user(user)})


@app.route("/api/me", methods=["GET"])
@auth_required
def me():
    return jsonify({"user": serialize_user(request.user)})


@app.route("/api/dashboard", methods=["GET"])
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


@app.route("/api/departments", methods=["GET"])
@auth_required
def get_departments():
    db = get_db()
    departments = rows_to_list(db.execute("SELECT * FROM departments ORDER BY name").fetchall())
    db.close()
    return jsonify({"departments": departments})


@app.route("/api/departments", methods=["POST"])
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


@app.route("/api/departments/<int:department_id>", methods=["DELETE"])
@auth_required
@admin_required
def delete_department(department_id):
    db = get_db()
    db.execute("DELETE FROM departments WHERE id = ?", (department_id,))
    db.commit()
    db.close()
    return jsonify({"success": True})


@app.route("/api/faculty", methods=["GET"])
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


@app.route("/api/faculty", methods=["POST"])
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


@app.route("/api/faculty/<int:faculty_id>", methods=["DELETE"])
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


@app.route("/api/students", methods=["GET"])
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


@app.route("/api/students", methods=["POST"])
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


@app.route("/api/students/<int:student_id>", methods=["DELETE"])
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


@app.route("/api/subjects", methods=["GET"])
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


@app.route("/api/subjects", methods=["POST"])
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


@app.route("/api/subjects/<int:subject_id>", methods=["DELETE"])
@auth_required
@admin_required
def delete_subject(subject_id):
    db = get_db()
    db.execute("DELETE FROM subjects WHERE id = ?", (subject_id,))
    db.commit()
    db.close()
    return jsonify({"success": True})


@app.route("/api/subject-allocations", methods=["GET"])
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


@app.route("/api/subject-allocations", methods=["POST"])
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


@app.route("/api/subject-allocations/<int:allocation_id>", methods=["DELETE"])
@auth_required
@admin_required
def delete_allocation(allocation_id):
    db = get_db()
    db.execute("DELETE FROM subject_faculty WHERE id = ?", (allocation_id,))
    db.commit()
    db.close()
    return jsonify({"success": True})


@app.route("/api/subjects-by-dept-sem", methods=["GET"])
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


@app.route("/api/faculty-by-dept", methods=["GET"])
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


@app.route("/api/notifications", methods=["GET"])
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


@app.route("/api/timetables", methods=["GET"])
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


@app.route("/api/timetable", methods=["GET"])
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


@app.route("/api/generate-timetable", methods=["POST"])
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


@app.route("/api/timetable/<int:timetable_id>/report", methods=["GET"])
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


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "timestamp": datetime.utcnow().isoformat()})


if __name__ == "__main__":
    init_db()
    app.run(debug=True, host="127.0.0.1", port=5000)
