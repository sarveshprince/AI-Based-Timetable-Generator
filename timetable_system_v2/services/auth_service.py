from base64 import urlsafe_b64decode, urlsafe_b64encode
from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import json

from flask import current_app, request

from db.database import get_db


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
    signature = hmac.new(current_app.config["SECRET_KEY"].encode("utf-8"), signing_input, hashlib.sha256).digest()
    return f"{header_segment}.{payload_segment}.{b64url_encode(signature)}"


def decode_token(token):
    try:
        header_segment, payload_segment, signature_segment = token.split(".")
    except ValueError:
        return None
    signing_input = f"{header_segment}.{payload_segment}".encode("utf-8")
    expected_signature = hmac.new(current_app.config["SECRET_KEY"].encode("utf-8"), signing_input, hashlib.sha256).digest()
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
