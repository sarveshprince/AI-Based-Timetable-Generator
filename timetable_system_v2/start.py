#!/usr/bin/env python3
import os
import subprocess
import sys


def check_deps():
    try:
        import flask, flask_socketio, numpy, reportlab, psycopg2
        return True
    except Exception:
        print("Installing dependencies...")
        subprocess.call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        return False


print("=" * 60)
print("AI Timetable System Starting...")
print("=" * 60)
if not check_deps():
    sys.exit(0)

from app import app, init_db, socketio
if os.environ.get("WERKZEUG_RUN_MAIN") == "true":
    init_db()
print("\nLogin: sarvesh.jr10@gmail.com / Sarvesh10")
print("URL: http://localhost:5000\n")
socketio.run(app, debug=True, host="0.0.0.0", port=5000)
