from flask import Blueprint, jsonify, request
from werkzeug.security import check_password_hash

from db.database import get_db
from services.auth_service import create_token
from services.user_service import serialize_user
from utils.helpers import json_error


auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/api/login", methods=["POST"])
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
