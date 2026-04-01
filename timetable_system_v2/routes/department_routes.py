import psycopg2
from flask import Blueprint, jsonify, request

from db.database import get_db
from utils.decorators import admin_required, auth_required
from utils.helpers import json_error, row_to_dict, rows_to_list


department_bp = Blueprint("department", __name__)


def _coerce_int(value, field_name):
    try:
        return int(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field_name} must be an integer.")


def _normalize_department_payload(payload):
    payload = payload or {}
    department_name = (payload.get("department_name") or "").strip()
    department_code = (payload.get("department_code") or "").strip()
    raw_years = payload.get("years") or []

    if not isinstance(raw_years, list):
        raise ValueError("years must be an array.")

    normalized_years = []
    seen_years = set()
    for year_item in raw_years:
        year_number = _coerce_int((year_item or {}).get("year"), "year")
        if year_number < 1 or year_number > 4:
            raise ValueError("year must be between 1 and 4.")
        if year_number in seen_years:
            raise ValueError(f"Duplicate year entry: {year_number}.")
        seen_years.add(year_number)

        section_items = (year_item or {}).get("sections") or []
        if not isinstance(section_items, list):
            raise ValueError("sections must be an array.")

        normalized_sections = []
        seen_section_names = set()
        for section_item in section_items:
            section_name = ((section_item or {}).get("name") or "").strip().upper()
            if not section_name:
                raise ValueError("Section names must not be empty.")
            if section_name in seen_section_names:
                raise ValueError(f"Duplicate section name '{section_name}' in year {year_number}.")
            seen_section_names.add(section_name)

            strength = _coerce_int((section_item or {}).get("strength"), "strength")
            if strength < 0:
                raise ValueError("strength must be a non-negative integer.")

            normalized_sections.append({"name": section_name, "strength": strength})

        normalized_years.append({"year": year_number, "sections": normalized_sections})

    normalized_years.sort(key=lambda item: item["year"])
    return {
        "department_name": department_name,
        "department_code": department_code,
        "years": normalized_years,
    }


def _fetch_department_hierarchy(db):
    departments = rows_to_list(db.execute("SELECT * FROM departments ORDER BY name").fetchall())
    year_rows = rows_to_list(
        db.execute(
            """
            SELECT y.id, y.department_id, y.year_number
            FROM years y
            ORDER BY y.department_id, y.year_number
            """
        ).fetchall()
    )
    section_rows = rows_to_list(
        db.execute(
            """
        SELECT s.id, s.year_id, s.name, s.strength
        FROM sections s
        WHERE s.year_id IS NOT NULL
        ORDER BY s.year_id, s.name
            """
        ).fetchall()
    )

    sections_by_year = {}
    for section in section_rows:
        sections_by_year.setdefault(section["year_id"], []).append(
            {
                "id": section["id"],
                "name": section["name"],
                "strength": section["strength"],
            }
        )

    years_by_department = {}
    for year in year_rows:
        years_by_department.setdefault(year["department_id"], []).append(
            {
                "id": year["id"],
                "year": year["year_number"],
                "sections": sections_by_year.get(year["id"], []),
            }
        )

    for department in departments:
        department["years"] = years_by_department.get(department["id"], [])

    return departments


@department_bp.route("/api/departments", methods=["GET"])
@auth_required
def get_departments():
    db = get_db()
    departments = _fetch_department_hierarchy(db)
    db.close()
    return jsonify({"departments": departments})


@department_bp.route("/api/departments", methods=["POST"])
@auth_required
@admin_required
def create_department():
    data = request.get_json(silent=True)
    print(f"[POST /api/departments] incoming_json={data}")
    if data is None:
        return json_error("Invalid JSON body.")

    try:
        payload = _normalize_department_payload(data)
    except ValueError as exc:
        return json_error(str(exc))

    name = payload["department_name"]
    code = payload["department_code"]
    if not name or not code:
        return json_error("department_name and department_code are required.")

    db = get_db()
    try:
        cursor = db.execute(
            "INSERT INTO departments (name, code) VALUES (?, ?)",
            (name, code),
        )
        department_id = cursor.lastrowid

        print(f"[POST /api/departments] inserted_department id={department_id} name={name} code={code}")

        # ✅ Loop Years
        for year_item in payload["years"]:
            print(f"Inserting year: {year_item['year']}")

            year_cursor = db.execute(
                """
                INSERT INTO years (department_id, year_number)
                VALUES (?, ?)
                """,
                (department_id, year_item["year"]),
            )
            year_id = year_cursor.lastrowid

            print(
                f"[POST /api/departments] inserted_year id={year_id} department_id={department_id} year={year_item['year']}"
            )

            # ✅ Calculate semester
            semester = (year_item["year"] - 1) * 2 + 1

            # 🔥 FIX: Section loop INSIDE year loop
            for section_item in year_item["sections"]:
                print(f"Inserting section: {section_item['name']} {section_item['strength']}")

                section_cursor = db.execute(
                    """
                    INSERT INTO sections (year_id, name, strength, semester)
                    VALUES (?, ?, ?, ?)
                    """,
                    (
                        year_id,
                        section_item["name"],
                        section_item["strength"],
                        semester,
                    ),
                )

                print(
                    "[POST /api/departments] inserted_section "
                    f"id={section_cursor.lastrowid} year_id={year_id} "
                    f"name={section_item['name']} strength={section_item['strength']} semester={semester}"
                )

        db.commit()

    except psycopg2.errors.UniqueViolation as exc:
        db.rollback()
        db.close()
        print(f"UNIQUE ERROR: {exc}")
        return jsonify({"error": "Duplicate constraint violation", "details": str(exc)}), 409

    except Exception as exc:
        db.rollback()
        db.close()
        print(f"GENERAL ERROR: {exc}")
        return jsonify({"error": str(exc)}), 500

    db.close()

    return jsonify({
        "message": "Department created successfully",
        "department_id": department_id
    }), 201


@department_bp.route("/api/departments/<int:department_id>", methods=["DELETE"])
@auth_required
@admin_required
def delete_department(department_id):
    db = get_db()
    db.execute("DELETE FROM departments WHERE id = ?", (department_id,))
    db.commit()
    db.close()
    return jsonify({"success": True})


@department_bp.route("/api/sections", methods=["GET"])
# @auth_required
def get_sections():
    department_id = request.args.get("department_id", "").strip()
    semester = request.args.get("semester", "").strip()
    print(f"Sections API: {department_id} {semester}")
    db = get_db()
    query = """
        SELECT s.id,
               s.name,
               s.strength,
               s.semester,
               y.year_number,
               y.department_id
        FROM sections s
        JOIN years y ON s.year_id = y.id
        WHERE 1 = 1
    """
    params = []
    if department_id:
        query += " AND y.department_id = ?"
        params.append(int(department_id))
    if semester:
        sem = int(semester)
        base_sem = sem if sem % 2 == 1 else sem - 1   # 🔥 FIX
        query += " AND s.semester = ?"
        params.append(base_sem)
    query += " ORDER BY s.name"
    rows = db.execute(query, params).fetchall()
    sections = [{"id": row["id"], "name": row["name"]} for row in rows]
    db.close()
    return jsonify({"sections": sections})


@department_bp.route("/api/sections", methods=["POST"])
@auth_required
@admin_required
def create_section():
    payload = request.get_json(silent=True) or {}
    name = (payload.get("name") or "").strip().upper()
    department_id = payload.get("department_id")
    year_id = payload.get("year_id")
    year = payload.get("year")
    try:
        strength = _coerce_int(payload.get("strength"), "strength")
    except ValueError as exc:
        return json_error(str(exc))
    if not name:
        return json_error("Section name is required.")
    if strength < 0:
        return json_error("strength must be a non-negative integer.")

    db = get_db()
    try:
        year_number = None
        if year_id is None:
            if not department_id or not year:
                db.close()
                return json_error("year_id or department_id with year is required.")
            year_number = _coerce_int(year, "year")
            year_row = db.execute(
                """
                INSERT INTO years (department_id, year_number)
                VALUES (?, ?)
                ON CONFLICT (department_id, year_number)
                DO UPDATE SET year_number = EXCLUDED.year_number
                RETURNING id
                """,
                (department_id, year_number),
            ).fetchone()
            year_id = year_row["id"]
        else:
            year_row = db.execute("SELECT year_number FROM years WHERE id = ?", (year_id,)).fetchone()
            if not year_row:
                db.close()
                return json_error("Invalid year_id.", 404)
            year_number = year_row["year_number"]

        semester = (year_number - 1) * 2 + 1

        cursor = db.execute(
            """
            INSERT INTO sections (year_id, name, strength, semester)
            VALUES (?, ?, ?, ?)
            """,
            (
                year_id,
                name,
                strength,
                semester
            ),
        )
        db.commit()
        created = db.execute(
            """
            SELECT s.id,
                   s.year_id,
                   s.name,
                   s.strength,
                   s.semester,
                   y.department_id,
                   y.year_number AS year
            FROM sections s
            JOIN years y ON s.year_id = y.id
            WHERE s.id = ?
            """,
            (cursor.lastrowid,),
        ).fetchone()
    except psycopg2.IntegrityError:
        db.rollback()
        db.close()
        return json_error("Section already exists for this year.", 409)
    db.close()
    return jsonify({"section": row_to_dict(created)}), 201


@department_bp.route("/api/sections/<int:section_id>", methods=["DELETE"])
@auth_required
@admin_required
def delete_section(section_id):
    db = get_db()
    db.execute("DELETE FROM sections WHERE id = ?", (section_id,))
    db.commit()
    db.close()
    return jsonify({"success": True})
