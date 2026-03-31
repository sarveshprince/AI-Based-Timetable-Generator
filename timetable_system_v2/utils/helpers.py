from flask import jsonify


def row_to_dict(row):
    return dict(row) if row else None


def rows_to_list(rows):
    return [dict(row) for row in rows]


def json_error(message, status_code=400):
    return jsonify({"message": message}), status_code
