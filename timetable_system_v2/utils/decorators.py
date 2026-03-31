from functools import wraps

from flask import request

from services.auth_service import current_user
from utils.helpers import json_error


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
