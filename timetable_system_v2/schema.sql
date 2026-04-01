-- =============================
-- USERS
-- =============================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'faculty')),
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    linked_id INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- =============================
-- DEPARTMENTS
-- =============================
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================
-- YEARS
-- =============================
CREATE TABLE IF NOT EXISTS years (
    id SERIAL PRIMARY KEY,
    department_id INTEGER NOT NULL,
    year_number INTEGER NOT NULL CHECK (year_number BETWEEN 1 AND 4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    CONSTRAINT unique_year_per_department UNIQUE (department_id, year_number)
);

-- =============================
-- SECTIONS
-- =============================
CREATE TABLE IF NOT EXISTS sections (
    id SERIAL PRIMARY KEY,
    year_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    strength INTEGER NOT NULL CHECK (strength >= 0),
    semester INTEGER NOT NULL CHECK (semester BETWEEN 1 AND 8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (year_id) REFERENCES years(id) ON DELETE CASCADE,
    CONSTRAINT unique_section_per_year UNIQUE (year_id, name)
);

-- =============================
-- FACULTY
-- =============================
CREATE TABLE IF NOT EXISTS faculty (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    department_id INTEGER NOT NULL,
    employee_id TEXT UNIQUE NOT NULL,
    phone TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
);

-- =============================
-- SUBJECTS
-- =============================
CREATE TABLE IF NOT EXISTS subjects (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    department_id INTEGER NOT NULL,
    year INTEGER NOT NULL CHECK (year BETWEEN 1 AND 4),
    semester INTEGER NOT NULL CHECK (semester BETWEEN 1 AND 8),
    credits INTEGER NOT NULL,
    hours_per_week INTEGER NOT NULL,
    subject_type TEXT NOT NULL CHECK (subject_type IN ('theory', 'lab', 'viva')),
    weightage INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
);

-- =============================
-- SUBJECT ALLOCATION
-- =============================
CREATE TABLE IF NOT EXISTS subject_faculty (
    id SERIAL PRIMARY KEY,
    subject_id INTEGER NOT NULL,
    faculty_id INTEGER NOT NULL,
    section_id INTEGER NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE,
    FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
    UNIQUE (subject_id, faculty_id, section_id)
);

-- =============================
-- TIMETABLES
-- =============================
CREATE TABLE IF NOT EXISTS timetables (
    id SERIAL PRIMARY KEY,
    semester INTEGER NOT NULL,
    academic_year TEXT NOT NULL,
    department_id INTEGER NOT NULL,
    timetable_data TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'draft')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- =============================
-- SCHEDULES
-- =============================
CREATE TABLE IF NOT EXISTS schedules (
    id SERIAL PRIMARY KEY,
    timetable_id INTEGER NOT NULL,
    section_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,
    faculty_id INTEGER NOT NULL,
    day TEXT NOT NULL,
    time_slot TEXT NOT NULL,
    classroom TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (timetable_id) REFERENCES timetables(id) ON DELETE CASCADE,
    FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE
);

-- =============================
-- FACULTY AVAILABILITY
-- =============================
CREATE TABLE IF NOT EXISTS faculty_availability (
    id SERIAL PRIMARY KEY,
    faculty_id INTEGER NOT NULL,
    day TEXT NOT NULL,
    time_slot TEXT NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE,
    UNIQUE (faculty_id, day, time_slot)
);

-- =============================
-- NOTIFICATIONS
-- =============================
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    notification_type TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================
-- CONSTRAINTS
-- =============================
CREATE TABLE IF NOT EXISTS constraints (
    id SERIAL PRIMARY KEY,
    constraint_type TEXT NOT NULL CHECK (constraint_type IN ('hard', 'soft')),
    description TEXT NOT NULL,
    priority INTEGER DEFAULT 1,
    department_id INTEGER,
    constraint_data TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
);

-- =============================
-- INDEXES
-- =============================
CREATE INDEX IF NOT EXISTS idx_years_department_year ON years(department_id, year_number);
CREATE INDEX IF NOT EXISTS idx_sections_year_id ON sections(year_id);
CREATE INDEX IF NOT EXISTS idx_sections_semester ON sections(semester);
CREATE INDEX IF NOT EXISTS idx_subjects_dept_sem ON subjects(department_id, semester);
CREATE INDEX IF NOT EXISTS idx_subject_faculty_section ON subject_faculty(section_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_schedules_timetable_day_time ON schedules(timetable_id, day, time_slot);
CREATE INDEX IF NOT EXISTS idx_schedules_faculty_day_time ON schedules(faculty_id, day, time_slot);

-- =============================
-- SAFE ADMIN INSERT
-- =============================
INSERT INTO users (
    id,
    username,
    password,
    role,
    full_name,
    email,
    is_active
)
SELECT
    1,
    'Sarvesh',
    'pbkdf2:sha256:600000$HK8n3R2wPQVJ8z0g$8f3c4e8c0a3d2b1f9e8d7c6b5a4e3d2c1b0a9f8e7d6c5b4a3e2d1c0b9a8f7e6d',
    'admin',
    'System Administrator',
    'sarvesh.jr10@gmail.com',
    TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE username = 'Sarvesh'
);

-- =============================
-- SEQUENCE FIX
-- =============================
SELECT setval(
    'users_id_seq',
    GREATEST((SELECT COALESCE(MAX(id), 1) FROM users), 1),
    TRUE
);
