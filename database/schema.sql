CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('student', 'staff', 'manager')),
    created_at TEXT NOT NULL
);


CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_number TEXT NOT NULL UNIQUE,
    student_id INTEGER NOT NULL,
    category TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,

    priority TEXT NOT NULL CHECK (
        priority IN ('Low', 'Medium', 'High', 'Critical')
    ),

    status TEXT NOT NULL CHECK (
        status IN (
            'New',
            'Assigned',
            'In Progress',
            'Waiting for Student',
            'Resolved'
        )
    ),

    assigned_to INTEGER,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    resolved_at TEXT,

    resolved_by INTEGER,
    resolution_comment TEXT,

    sla_due_at TEXT,

    FOREIGN KEY (student_id) REFERENCES users(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    FOREIGN KEY (resolved_by) REFERENCES users(id)
);


CREATE TABLE IF NOT EXISTS ticket_activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL,
    user_id INTEGER,
    action TEXT NOT NULL,
    comment TEXT,
    created_at TEXT NOT NULL,

    FOREIGN KEY (ticket_id) REFERENCES tickets(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);