import os
import psycopg2
from psycopg2.extras import DictCursor
from psycopg2.pool import SimpleConnectionPool
from psycopg2 import OperationalError

db_pool = None
database_url = None


# -------------------- CURSOR WRAPPER --------------------

class PostgresCursor:
    def __init__(self, connection):
        self.connection = connection
        self.cursor = connection.cursor(cursor_factory=DictCursor)
        self.lastrowid = None

    def execute(self, query, params=None):
        sql = query.replace("?", "%s")
        normalized = sql.strip().rstrip(";")
        upper_sql = normalized.upper()
        self.lastrowid = None

        try:
            if upper_sql.startswith("INSERT INTO") and "RETURNING" not in upper_sql:
                sql = f"{normalized} RETURNING id"
                self.cursor.execute(sql, params)
                row = self.cursor.fetchone()
                self.lastrowid = row["id"] if row and "id" in row else None
                return self

            self.cursor.execute(sql, params)
            return self

        except OperationalError:
            # 🔥 Auto-reconnect on dead connection
            print("⚠️ DB connection lost. Reconnecting...")
            self.connection.reset()
            self.cursor = self.connection.cursor(cursor_factory=DictCursor)
            self.cursor.execute(sql, params)
            return self

    def fetchone(self):
        return self.cursor.fetchone()

    def fetchall(self):
        return self.cursor.fetchall()

    def __getattr__(self, name):
        return getattr(self.cursor, name)


# -------------------- CONNECTION WRAPPER --------------------

class PostgresConnection:
    def __init__(self, connection):
        self.connection = connection

    def cursor(self):
        return PostgresCursor(self.connection)

    def execute(self, query, params=None):
        return self.cursor().execute(query, params)

    def commit(self):
        self.connection.commit()

    def rollback(self):
        self.connection.rollback()

    def close(self):
        try:
            self.connection.rollback()  # 🔥 clean state before returning
        except Exception:
            pass
        get_pool().putconn(self.connection)


# -------------------- INIT --------------------

def init_app(app):
    global database_url
    database_url = app.config["DATABASE_URL"]


# -------------------- CONNECTION POOL --------------------

def get_pool():
    global db_pool

    if db_pool is None:
        db_pool = SimpleConnectionPool(
            minconn=1,
            maxconn=10,
            dsn=database_url,
            sslmode="require",  # 🔥 REQUIRED for NeonDB
            keepalives=1,
            keepalives_idle=30,
            keepalives_interval=10,
            keepalives_count=5,
        )

    return db_pool


# -------------------- GET DB --------------------

def get_db():
    pool = get_pool()

    conn = pool.getconn()

    try:
        # 🔥 Validate connection before using
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
    except Exception:
        print("⚠️ Dead connection detected. Recreating...")
        pool.putconn(conn, close=True)
        conn = pool.getconn()

    return PostgresConnection(conn)


# -------------------- INIT DB --------------------

def init_db():
    connection = psycopg2.connect(
        database_url,
        sslmode="require",
        keepalives=1,
        keepalives_idle=30,
        keepalives_interval=10,
        keepalives_count=5,
    )

    schema_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        "schema.sql"
    )

    try:
        with open(schema_path, "r", encoding="utf-8") as schema_file:
            with connection.cursor() as cursor:
                cursor.execute(schema_file.read())

        connection.commit()

    except Exception as e:
        connection.rollback()
        print("❌ DB INIT ERROR:", e)
        raise

    finally:
        connection.close()