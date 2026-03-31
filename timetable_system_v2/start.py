#!/usr/bin/env python3
import subprocess
import sys


def check_deps():
    try:
        import flask, numpy, reportlab, psycopg2
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

from app import app, init_db

init_db()
print("\nLogin: admin / admin123")
print("URL: http://localhost:5000\n")
app.run(debug=True, host="0.0.0.0", port=5000)
