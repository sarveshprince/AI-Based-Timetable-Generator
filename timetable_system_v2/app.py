from flask import Flask

from config.config import Config
from db.database import init_app as init_db_app
from db.database import init_db
from routes.auth_routes import auth_bp
from routes.department_routes import department_bp
from routes.faculty_routes import faculty_bp
from routes.subject_routes import subject_bp
from routes.timetable_routes import timetable_bp
from routes.user_routes import user_bp
from services.realtime_service import init_socketio, socketio


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    init_db_app(app)
    init_socketio(app)

    @app.after_request
    def add_cors_headers(response):
        response.headers["Access-Control-Allow-Origin"] = "http://localhost:5173"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        return response

    app.register_blueprint(auth_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(timetable_bp)
    app.register_blueprint(faculty_bp)
    app.register_blueprint(subject_bp)
    app.register_blueprint(department_bp)

    return app


app = create_app()


if __name__ == "__main__":
    init_db()
    socketio.run(app, debug=True, host="127.0.0.1", port=5000)
