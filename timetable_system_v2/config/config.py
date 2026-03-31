import os
import secrets


class Config:
    DATABASE_URL = os.environ.get(
        "DATABASE_URL",
        "postgresql://neondb_owner:npg_TsGR48hQAwju@ep-broad-bread-a1mwr79t-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
    )
    SECRET_KEY = os.environ.get("TIMETABLE_SECRET", secrets.token_hex(32))
