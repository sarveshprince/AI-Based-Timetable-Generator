import os

import psycopg2
from psycopg2.extras import DictCursor
from psycopg2.pool import SimpleConnectionPool


db_pool = None
database_url = None


class PostgresCursor:
    def __init__(self, cursor):
        self.cursor = cursor
        self.lastrowid = None

    def execute(self, query, params=None):
        sql = query.replace("?", "%s")
        normalized = sql.strip().rstrip(";")
        upper_sql = normalized.upper()
        self.lastrowid = None
        if upper_sql.startswith("INSERT INTO") and "RETURNING" not in upper_sql:
            sql = f"{normalized} RETURNING id"
            self.cursor.execute(sql, params)
            row = self.cursor.fetchone()
            self.lastrowid = row["id"] if row and "id" in row else None
            return self
        self.cursor.execute(sql, params)
        return self

    def fetchone(self):
        return self.cursor.fetchone()

    def fetchall(self):
        return self.cursor.fetchall()

    def __getattr__(self, name):
        return getattr(self.cursor, name)


class PostgresConnection:
    def __init__(self, connection):
        self.connection = connection

    def cursor(self):
        return PostgresCursor(self.connection.cursor(cursor_factory=DictCursor))

    def execute(self, query, params=None):
        return self.cursor().execute(query, params)

    def commit(self):
        self.connection.commit()

    def rollback(self):
        self.connection.rollback()

    def close(self):
        get_pool().putconn(self.connection)


def init_app(app):
    global database_url
    database_url = app.config["DATABASE_URL"]


def get_pool():
    global db_pool
    if db_pool is None:
        db_pool = SimpleConnectionPool(
            minconn=1,
            maxconn=10,
            dsn=database_url,
        )
    return db_pool


def get_db():
    return PostgresConnection(get_pool().getconn())


def init_db():
    connection = psycopg2.connect(database_url)
    schema_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "schema.sql")
    try:
        with open(schema_path, "r", encoding="utf-8") as schema_file:
            with connection.cursor() as cursor:
                cursor.execute(schema_file.read())
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()
