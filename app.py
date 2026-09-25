from flask import Flask, request, render_template
import sqlite3
from pathlib import Path
from datetime import datetime, timedelta, timezone
from werkzeug.security import generate_password_hash, check_password_hash


app = Flask(__name__)


# ============================================================
# PROJECT PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent
DATABASE_DIR = BASE_DIR / "instance"
DATABASE_PATH = DATABASE_DIR / "support.db"
SCHEMA_PATH = BASE_DIR / "database" / "schema.sql"


# ============================================================
# DATABASE CONNECTION
# ============================================================

def get_db_connection():
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


# ============================================================
# DATABASE INITIALIZATION
# ============================================================

def initialize_database():

    DATABASE_DIR.mkdir(exist_ok=True)

    connection = sqlite3.connect(DATABASE_PATH)

    with open(
        SCHEMA_PATH,
        "r",
        encoding="utf-8"
    ) as schema_file:

        schema = schema_file.read()

    connection.executescript(schema)
    connection.commit()
    connection.close()


# ============================================================
# CREATE DEMO USERS
# ============================================================

def create_demo_users():

    connection = get_db_connection()

    users = [
        (
            "Demo Student",
            "student@edumerge.com",
            "student123",
            "student"
        ),
        (
            "Support Staff",
            "staff@edumerge.com",
            "staff123",
            "staff"
        ),
        (
            "Support Manager",
            "manager@edumerge.com",
            "manager123",
            "manager"
        )
    ]

    for name, email, password, role in users:

        existing_user = connection.execute(
            """
            SELECT id
            FROM users
            WHERE email = ?
            """,
            (email,)
        ).fetchone()

        if existing_user is None:

            connection.execute(
                """
                INSERT INTO users
                (
                    name,
                    email,
                    password_hash,
                    role,
                    created_at
                )
                VALUES (?, ?, ?, ?, datetime('now'))
                """,
                (
                    name,
                    email,
                    generate_password_hash(password),
                    role
                )
            )

    connection.commit()
    connection.close()


# ============================================================
# GENERATE TICKET NUMBER
# ============================================================

def generate_ticket_number(connection):

    last_ticket = connection.execute(
        """
        SELECT ticket_number
        FROM tickets
        ORDER BY id DESC
        LIMIT 1
        """
    ).fetchone()

    if last_ticket is None:
        return "TKT-1001"

    last_number = int(
        last_ticket["ticket_number"].split("-")[1]
    )

    return f"TKT-{last_number + 1}"


# ============================================================
# CALCULATE SLA DUE TIME
# ============================================================

def calculate_sla_due(priority):

    sla_hours = {
        "Critical": 8,
        "High": 24,
        "Medium": 48,
        "Low": 72
    }

    hours = sla_hours[priority]

    due_time = (
        datetime.now(timezone.utc)
        + timedelta(hours=hours)
    )

    return due_time.isoformat()


# ============================================================
# PARSE ISO DATETIME
# ============================================================

def parse_datetime(value):

    if not value:
        return None

    try:
        parsed = datetime.fromisoformat(value)

        if parsed.tzinfo is None:
            parsed = parsed.replace(
                tzinfo=timezone.utc
            )

        return parsed

    except ValueError:
        return None


# ============================================================
# CALCULATE SLA / AGEING INFORMATION
# ============================================================

def calculate_sla_information(ticket):

    now = datetime.now(timezone.utc)

    created_at = parse_datetime(
        ticket["created_at"]
    )

    sla_due_at = parse_datetime(
        ticket["sla_due_at"]
    )

    resolved_at = parse_datetime(
        ticket["resolved_at"]
    )

    if created_at is None:

        return {
            "age_hours": None,
            "age_minutes": None,
            "sla_remaining_hours": None,
            "sla_status": "Unknown",
            "is_breached": False,
            "pending_action": False
        }

    # --------------------------------------------------------
    # Age is measured until resolution if resolved.
    # Otherwise it is measured until current time.
    # --------------------------------------------------------

    end_time = resolved_at or now

    age_seconds = max(
        0,
        (end_time - created_at).total_seconds()
    )

    age_hours = round(
        age_seconds / 3600,
        2
    )

    age_minutes = round(
        age_seconds / 60,
        2
    )

    # --------------------------------------------------------
    # Determine SLA
    # --------------------------------------------------------

    if sla_due_at is None:

        sla_remaining_hours = None
        sla_status = "Unknown"
        is_breached = False

    else:

        if resolved_at:

            remaining_seconds = (
                sla_due_at - resolved_at
            ).total_seconds()

            sla_remaining_hours = round(
                remaining_seconds / 3600,
                2
            )

            if resolved_at <= sla_due_at:
                sla_status = "Met"
                is_breached = False
            else:
                sla_status = "Breached"
                is_breached = True

        else:

            remaining_seconds = (
                sla_due_at - now
            ).total_seconds()

            sla_remaining_hours = round(
                remaining_seconds / 3600,
                2
            )

            if now > sla_due_at:
                sla_status = "Breached"
                is_breached = True
            else:
                sla_status = "Within SLA"
                is_breached = False

    # --------------------------------------------------------
    # Pending action
    # --------------------------------------------------------

    pending_action = (
        ticket["status"] != "Resolved"
    )

    return {
        "age_hours": age_hours,
        "age_minutes": age_minutes,
        "sla_remaining_hours": sla_remaining_hours,
        "sla_status": sla_status,
        "is_breached": is_breached,
        "pending_action": pending_action
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.route("/api/health")
def health_check():

    return {
        "status": "ok",
        "message": "EduSupport API is running"
    }


# ============================================================
# DATABASE CHECK
# ============================================================

@app.route("/api/database-check")
def database_check():

    connection = get_db_connection()

    tables = connection.execute(
        """
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
        ORDER BY name
        """
    ).fetchall()

    connection.close()

    return {
        "status": "ok",
        "tables": [
            table["name"]
            for table in tables
        ]
    }


# ============================================================
# LOGIN
# ============================================================

@app.route(
    "/api/login",
    methods=["POST"]
)
def login():

    data = request.get_json()

    if not data:

        return {
            "status": "error",
            "message": "Request body is required"
        }, 400

    email = data.get(
        "email",
        ""
    ).strip()

    password = data.get(
        "password",
        ""
    )

    if not email or not password:

        return {
            "status": "error",
            "message": "Email and password are required"
        }, 400

    connection = get_db_connection()

    user = connection.execute(
        """
        SELECT
            id,
            name,
            email,
            password_hash,
            role
        FROM users
        WHERE email = ?
        """,
        (email,)
    ).fetchone()

    connection.close()

    if user is None:

        return {
            "status": "error",
            "message": "Invalid email or password"
        }, 401

    if not check_password_hash(
        user["password_hash"],
        password
    ):

        return {
            "status": "error",
            "message": "Invalid email or password"
        }, 401

    return {
        "status": "success",
        "message": "Login successful",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"]
        }
    }

# ============================================================
# STUDENT REGISTRATION
# ============================================================

@app.route(
    "/api/register",
    methods=["POST"]
)
def register_student():

    data = request.get_json()

    if not data:

        return {
            "status": "error",
            "message": "Request body is required"
        }, 400

    name = data.get(
        "name",
        ""
    ).strip()

    email = data.get(
        "email",
        ""
    ).strip().lower()

    password = data.get(
        "password",
        ""
    )

    confirm_password = data.get(
        "confirm_password",
        ""
    )

    # --------------------------------------------------------
    # Required fields
    # --------------------------------------------------------

    if not name:

        return {
            "status": "error",
            "message": "Full name is required"
        }, 400

    if not email:

        return {
            "status": "error",
            "message": "Email is required"
        }, 400

    if not password:

        return {
            "status": "error",
            "message": "Password is required"
        }, 400

    if not confirm_password:

        return {
            "status": "error",
            "message": "Please confirm your password"
        }, 400

    # --------------------------------------------------------
    # Password validation
    # --------------------------------------------------------

    if len(password) < 6:

        return {
            "status": "error",
            "message": "Password must be at least 6 characters"
        }, 400

    if password != confirm_password:

        return {
            "status": "error",
            "message": "Passwords do not match"
        }, 400

    # --------------------------------------------------------
    # Create student account
    # --------------------------------------------------------

    connection = get_db_connection()

    existing_user = connection.execute(
        """
        SELECT id
        FROM users
        WHERE email = ?
        """,
        (email,)
    ).fetchone()

    if existing_user is not None:

        connection.close()

        return {
            "status": "error",
            "message": "An account with this email already exists"
        }, 409

    password_hash = generate_password_hash(
        password
    )

    created_at = datetime.now(
        timezone.utc
    ).isoformat()

    connection.execute(
        """
        INSERT INTO users
        (
            name,
            email,
            password_hash,
            role,
            created_at
        )
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            name,
            email,
            password_hash,
            "student",
            created_at
        )
    )

    connection.commit()

    connection.close()

    return {
        "status": "success",
        "message": "Student account created successfully"
    }, 201
# ============================================================
# GET ALL TICKETS
# ============================================================

@app.route(
    "/api/tickets",
    methods=["GET"]
)
def get_tickets():

    connection = get_db_connection()

    tickets = connection.execute(
        """
        SELECT
            t.id,
            t.ticket_number,
            t.student_id,
            u.name AS student_name,
            t.category,
            t.subject,
            t.description,
            t.priority,
            t.status,
            t.assigned_to,
            staff.name AS assigned_staff,
            t.created_at,
            t.updated_at,
            t.resolved_at,
            t.resolved_by,
            resolver.name AS resolved_by_name,
            t.resolution_comment,
            t.sla_due_at
        FROM tickets t

        JOIN users u
            ON t.student_id = u.id

        LEFT JOIN users staff
            ON t.assigned_to = staff.id

        LEFT JOIN users resolver
            ON t.resolved_by = resolver.id

        ORDER BY t.created_at DESC
        """
    ).fetchall()

    connection.close()

    return {
        "status": "success",
        "count": len(tickets),
        "tickets": [
            dict(ticket)
            for ticket in tickets
        ]
    }


# ============================================================
# GET TICKET DETAIL
# ============================================================

@app.route(
    "/api/tickets/<int:ticket_id>",
    methods=["GET"]
)
def get_ticket_detail(ticket_id):

    connection = get_db_connection()

    ticket = connection.execute(
        """
        SELECT
            t.id,
            t.ticket_number,
            t.student_id,
            student.name AS student_name,
            student.email AS student_email,
            t.category,
            t.subject,
            t.description,
            t.priority,
            t.status,
            t.assigned_to,
            staff.name AS assigned_staff,
            t.created_at,
            t.updated_at,
            t.resolved_at,
            t.resolved_by,
            resolver.name AS resolved_by_name,
            t.resolution_comment,
            t.sla_due_at

        FROM tickets t

        JOIN users student
            ON t.student_id = student.id

        LEFT JOIN users staff
            ON t.assigned_to = staff.id

        LEFT JOIN users resolver
            ON t.resolved_by = resolver.id

        WHERE t.id = ?
        """,
        (ticket_id,)
    ).fetchone()

    if ticket is None:

        connection.close()

        return {
            "status": "error",
            "message": "Ticket not found"
        }, 404

    activities = connection.execute(
        """
        SELECT
            a.id,
            a.ticket_id,
            a.user_id,
            u.name AS user_name,
            u.role AS user_role,
            a.action,
            a.comment,
            a.created_at

        FROM ticket_activity a

        LEFT JOIN users u
            ON a.user_id = u.id

        WHERE a.ticket_id = ?

        ORDER BY
            a.created_at ASC,
            a.id ASC
        """,
        (ticket_id,)
    ).fetchall()

    connection.close()

    return {
        "status": "success",
        "ticket": dict(ticket),
        "activity": [
            dict(activity)
            for activity in activities
        ]
    }


# ============================================================
# GET TICKET ACTIVITY / HISTORY
# ============================================================

@app.route(
    "/api/tickets/<int:ticket_id>/activity",
    methods=["GET"]
)
def get_ticket_activity(ticket_id):

    connection = get_db_connection()

    ticket = connection.execute(
        """
        SELECT
            id,
            ticket_number
        FROM tickets
        WHERE id = ?
        """,
        (ticket_id,)
    ).fetchone()

    if ticket is None:

        connection.close()

        return {
            "status": "error",
            "message": "Ticket not found"
        }, 404

    activities = connection.execute(
        """
        SELECT
            a.id,
            a.ticket_id,
            a.user_id,
            u.name AS user_name,
            u.role AS user_role,
            a.action,
            a.comment,
            a.created_at

        FROM ticket_activity a

        LEFT JOIN users u
            ON a.user_id = u.id

        WHERE a.ticket_id = ?

        ORDER BY
            a.created_at ASC,
            a.id ASC
        """,
        (ticket_id,)
    ).fetchall()

    connection.close()

    return {
        "status": "success",
        "ticket_number": ticket["ticket_number"],
        "count": len(activities),
        "activities": [
            dict(activity)
            for activity in activities
        ]
    }


# ============================================================
# SLA / AGEING INFORMATION
# ============================================================

@app.route(
    "/api/tickets/<int:ticket_id>/sla",
    methods=["GET"]
)
def get_ticket_sla(ticket_id):

    connection = get_db_connection()

    ticket = connection.execute(
        """
        SELECT
            id,
            ticket_number,
            priority,
            status,
            created_at,
            updated_at,
            resolved_at,
            sla_due_at,
            assigned_to
        FROM tickets
        WHERE id = ?
        """,
        (ticket_id,)
    ).fetchone()

    if ticket is None:

        connection.close()

        return {
            "status": "error",
            "message": "Ticket not found"
        }, 404

    sla_information = calculate_sla_information(
        ticket
    )

    connection.close()

    return {
        "status": "success",
        "ticket_number": ticket["ticket_number"],
        "priority": ticket["priority"],
        "ticket_status": ticket["status"],
        "created_at": ticket["created_at"],
        "sla_due_at": ticket["sla_due_at"],
        "resolved_at": ticket["resolved_at"],
        "assigned_to": ticket["assigned_to"],
        **sla_information
    }


# ============================================================
# ASSIGN TICKET TO STAFF
# ============================================================

@app.route(
    "/api/tickets/<int:ticket_id>/assign",
    methods=["POST"]
)
def assign_ticket(ticket_id):

    data = request.get_json()

    if not data:

        return {
            "status": "error",
            "message": "Request body is required"
        }, 400

    staff_id = data.get("staff_id")

    if not staff_id:

        return {
            "status": "error",
            "message": "staff_id is required"
        }, 400

    connection = get_db_connection()

    staff = connection.execute(
        """
        SELECT
            id,
            name,
            role
        FROM users
        WHERE id = ?
        """,
        (staff_id,)
    ).fetchone()

    if staff is None:

        connection.close()

        return {
            "status": "error",
            "message": "Staff user not found"
        }, 404

    if staff["role"] != "staff":

        connection.close()

        return {
            "status": "error",
            "message": (
                "Only users with staff role "
                "can be assigned tickets"
            )
        }, 403

    ticket = connection.execute(
        """
        SELECT
            id,
            ticket_number,
            status
        FROM tickets
        WHERE id = ?
        """,
        (ticket_id,)
    ).fetchone()

    if ticket is None:

        connection.close()

        return {
            "status": "error",
            "message": "Ticket not found"
        }, 404

    if ticket["status"] == "Resolved":

        connection.close()

        return {
            "status": "error",
            "message": "Resolved tickets cannot be assigned"
        }, 400

    updated_at = datetime.now(
        timezone.utc
    ).isoformat()

    connection.execute(
        """
        UPDATE tickets
        SET
            assigned_to = ?,
            status = 'Assigned',
            updated_at = ?
        WHERE id = ?
        """,
        (
            staff_id,
            updated_at,
            ticket_id
        )
    )

    connection.execute(
        """
        INSERT INTO ticket_activity
        (
            ticket_id,
            user_id,
            action,
            comment,
            created_at
        )
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            ticket_id,
            staff_id,
            "Ticket Assigned",
            f"Ticket assigned to {staff['name']}.",
            updated_at
        )
    )

    connection.commit()

    updated_ticket = connection.execute(
        """
        SELECT
            t.id,
            t.ticket_number,
            t.student_id,
            t.category,
            t.subject,
            t.priority,
            t.status,
            t.assigned_to,
            u.name AS assigned_staff,
            t.created_at,
            t.updated_at,
            t.resolved_at,
            t.sla_due_at
        FROM tickets t

        LEFT JOIN users u
            ON t.assigned_to = u.id

        WHERE t.id = ?
        """,
        (ticket_id,)
    ).fetchone()

    connection.close()

    return {
        "status": "success",
        "message": "Ticket assigned successfully",
        "ticket": dict(updated_ticket)
    }


# ============================================================
# UPDATE TICKET STATUS
# ============================================================

@app.route(
    "/api/tickets/<int:ticket_id>/status",
    methods=["PATCH"]
)
def update_ticket_status(ticket_id):

    data = request.get_json()

    if not data:

        return {
            "status": "error",
            "message": "Request body is required"
        }, 400

    new_status = data.get(
        "status",
        ""
    ).strip()

    staff_id = data.get("staff_id")

    resolution_comment = data.get(
        "resolution_comment",
        ""
    ).strip()

    valid_statuses = [
        "New",
        "Assigned",
        "In Progress",
        "Waiting for Student",
        "Resolved"
    ]

    if new_status not in valid_statuses:

        return {
            "status": "error",
            "message": (
                "status must be New, Assigned, "
                "In Progress, Waiting for Student, "
                "or Resolved"
            )
        }, 400

    if not staff_id:

        return {
            "status": "error",
            "message": "staff_id is required"
        }, 400

    connection = get_db_connection()

    staff = connection.execute(
        """
        SELECT
            id,
            name,
            role
        FROM users
        WHERE id = ?
        """,
        (staff_id,)
    ).fetchone()

    if staff is None:

        connection.close()

        return {
            "status": "error",
            "message": "Staff user not found"
        }, 404

    if staff["role"] != "staff":

        connection.close()

        return {
            "status": "error",
            "message": (
                "Only staff users can "
                "update ticket status"
            )
        }, 403

    ticket = connection.execute(
        """
        SELECT
            id,
            ticket_number,
            status,
            assigned_to
        FROM tickets
        WHERE id = ?
        """,
        (ticket_id,)
    ).fetchone()

    if ticket is None:

        connection.close()

        return {
            "status": "error",
            "message": "Ticket not found"
        }, 404

    if ticket["assigned_to"] != staff_id:

        connection.close()

        return {
            "status": "error",
            "message": (
                "Only the assigned staff member "
                "can update this ticket"
            )
        }, 403

    current_status = ticket["status"]

    if current_status == new_status:

        connection.close()

        return {
            "status": "error",
            "message": (
                f"Ticket is already in "
                f"'{new_status}' status"
            )
        }, 400

    allowed_transitions = {
        "New": [
            "Assigned"
        ],
        "Assigned": [
            "In Progress"
        ],
        "In Progress": [
            "Waiting for Student",
            "Resolved"
        ],
        "Waiting for Student": [
            "In Progress",
            "Resolved"
        ],
        "Resolved": []
    }

    if new_status not in allowed_transitions.get(
        current_status,
        []
    ):

        connection.close()

        return {
            "status": "error",
            "message": (
                f"Invalid status transition: "
                f"{current_status} -> {new_status}"
            )
        }, 400

    if new_status == "Resolved" and not resolution_comment:

        connection.close()

        return {
            "status": "error",
            "message": (
                "resolution_comment is required "
                "when resolving a ticket"
            )
        }, 400

    updated_at = datetime.now(
        timezone.utc
    ).isoformat()

    if new_status == "Resolved":

        connection.execute(
            """
            UPDATE tickets
            SET
                status = ?,
                updated_at = ?,
                resolved_at = ?,
                resolved_by = ?,
                resolution_comment = ?
            WHERE id = ?
            """,
            (
                new_status,
                updated_at,
                updated_at,
                staff_id,
                resolution_comment,
                ticket_id
            )
        )

        activity_comment = (
            f"Status changed from "
            f"{current_status} to {new_status}. "
            f"Resolution: {resolution_comment}"
        )

    else:

        connection.execute(
            """
            UPDATE tickets
            SET
                status = ?,
                updated_at = ?
            WHERE id = ?
            """,
            (
                new_status,
                updated_at,
                ticket_id
            )
        )

        activity_comment = (
            f"Status changed from "
            f"{current_status} to {new_status}."
        )

    connection.execute(
        """
        INSERT INTO ticket_activity
        (
            ticket_id,
            user_id,
            action,
            comment,
            created_at
        )
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            ticket_id,
            staff_id,
            "Status Changed",
            activity_comment,
            updated_at
        )
    )

    connection.commit()

    updated_ticket = connection.execute(
        """
        SELECT
            t.id,
            t.ticket_number,
            t.student_id,
            t.category,
            t.subject,
            t.description,
            t.priority,
            t.status,
            t.assigned_to,
            u.name AS assigned_staff,
            t.created_at,
            t.updated_at,
            t.resolved_at,
            t.resolved_by,
            resolver.name AS resolved_by_name,
            t.resolution_comment,
            t.sla_due_at

        FROM tickets t

        LEFT JOIN users u
            ON t.assigned_to = u.id

        LEFT JOIN users resolver
            ON t.resolved_by = resolver.id

        WHERE t.id = ?
        """,
        (ticket_id,)
    ).fetchone()

    connection.close()

    return {
        "status": "success",
        "message": "Ticket status updated successfully",
        "ticket": dict(updated_ticket)
    }


# ============================================================
# STAFF RESPONSE
# ============================================================

@app.route(
    "/api/tickets/<int:ticket_id>/response",
    methods=["POST"]
)
def add_staff_response(ticket_id):

    data = request.get_json()

    if not data:

        return {
            "status": "error",
            "message": "Request body is required"
        }, 400

    staff_id = data.get("staff_id")

    comment = data.get(
        "comment",
        ""
    ).strip()

    if not staff_id:

        return {
            "status": "error",
            "message": "staff_id is required"
        }, 400

    if not comment:

        return {
            "status": "error",
            "message": "comment is required"
        }, 400

    connection = get_db_connection()

    staff = connection.execute(
        """
        SELECT
            id,
            name,
            role
        FROM users
        WHERE id = ?
        """,
        (staff_id,)
    ).fetchone()

    if staff is None:

        connection.close()

        return {
            "status": "error",
            "message": "Staff user not found"
        }, 404

    if staff["role"] != "staff":

        connection.close()

        return {
            "status": "error",
            "message": "Only staff users can respond"
        }, 403

    ticket = connection.execute(
        """
        SELECT
            id,
            status,
            assigned_to
        FROM tickets
        WHERE id = ?
        """,
        (ticket_id,)
    ).fetchone()

    if ticket is None:

        connection.close()

        return {
            "status": "error",
            "message": "Ticket not found"
        }, 404

    if ticket["assigned_to"] != staff_id:

        connection.close()

        return {
            "status": "error",
            "message": (
                "Only the assigned staff member "
                "can respond to this ticket"
            )
        }, 403

    if ticket["status"] == "Resolved":

        connection.close()

        return {
            "status": "error",
            "message": (
                "Resolved tickets cannot receive "
                "staff responses"
            )
        }, 400

    created_at = datetime.now(
        timezone.utc
    ).isoformat()

    connection.execute(
        """
        INSERT INTO ticket_activity
        (
            ticket_id,
            user_id,
            action,
            comment,
            created_at
        )
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            ticket_id,
            staff_id,
            "Staff Response",
            comment,
            created_at
        )
    )

    connection.execute(
        """
        UPDATE tickets
        SET updated_at = ?
        WHERE id = ?
        """,
        (
            created_at,
            ticket_id
        )
    )

    connection.commit()
    connection.close()

    return {
        "status": "success",
        "message": "Staff response added successfully"
    }


# ============================================================
# STUDENT RESPONSE
# ============================================================

@app.route(
    "/api/tickets/<int:ticket_id>/student-response",
    methods=["POST"]
)
def add_student_response(ticket_id):

    data = request.get_json()

    if not data:

        return {
            "status": "error",
            "message": "Request body is required"
        }, 400

    student_id = data.get("student_id")

    comment = data.get(
        "comment",
        ""
    ).strip()

    if not student_id:

        return {
            "status": "error",
            "message": "student_id is required"
        }, 400

    if not comment:

        return {
            "status": "error",
            "message": "comment is required"
        }, 400

    connection = get_db_connection()

    student = connection.execute(
        """
        SELECT
            id,
            name,
            role
        FROM users
        WHERE id = ?
        """,
        (student_id,)
    ).fetchone()

    if student is None:

        connection.close()

        return {
            "status": "error",
            "message": "Student not found"
        }, 404

    if student["role"] != "student":

        connection.close()

        return {
            "status": "error",
            "message": "Only students can respond"
        }, 403

    ticket = connection.execute(
        """
        SELECT
            id,
            student_id,
            status
        FROM tickets
        WHERE id = ?
        """,
        (ticket_id,)
    ).fetchone()

    if ticket is None:

        connection.close()

        return {
            "status": "error",
            "message": "Ticket not found"
        }, 404

    if ticket["student_id"] != student_id:

        connection.close()

        return {
            "status": "error",
            "message": (
                "Only the ticket owner "
                "can respond"
            )
        }, 403

    if ticket["status"] != "Waiting for Student":

        connection.close()

        return {
            "status": "error",
            "message": (
                "Student can respond only when "
                "the ticket is waiting for student"
            )
        }, 400

    created_at = datetime.now(
        timezone.utc
    ).isoformat()

    connection.execute(
        """
        INSERT INTO ticket_activity
        (
            ticket_id,
            user_id,
            action,
            comment,
            created_at
        )
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            ticket_id,
            student_id,
            "Student Response",
            comment,
            created_at
        )
    )

    connection.execute(
        """
        UPDATE tickets
        SET
            status = 'In Progress',
            updated_at = ?
        WHERE id = ?
        """,
        (
            created_at,
            ticket_id
        )
    )

    connection.execute(
        """
        INSERT INTO ticket_activity
        (
            ticket_id,
            user_id,
            action,
            comment,
            created_at
        )
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            ticket_id,
            student_id,
            "Status Changed",
            (
                "Status changed from "
                "Waiting for Student to In Progress."
            ),
            created_at
        )
    )

    connection.commit()
    connection.close()

    return {
        "status": "success",
        "message": "Student response added successfully"
    }


# ============================================================
# GET STUDENT'S OWN TICKETS
# ============================================================

@app.route(
    "/api/students/<int:student_id>/tickets",
    methods=["GET"]
)
def get_student_tickets(student_id):

    connection = get_db_connection()

    student = connection.execute(
        """
        SELECT
            id,
            name,
            email,
            role
        FROM users
        WHERE id = ?
        """,
        (student_id,)
    ).fetchone()

    if student is None:

        connection.close()

        return {
            "status": "error",
            "message": "Student not found"
        }, 404

    if student["role"] != "student":

        connection.close()

        return {
            "status": "error",
            "message": "User is not a student"
        }, 403

    tickets = connection.execute(
        """
        SELECT
            t.id,
            t.ticket_number,
            t.category,
            t.subject,
            t.description,
            t.priority,
            t.status,
            t.assigned_to,
            staff.name AS assigned_staff,
            t.created_at,
            t.updated_at,
            t.resolved_at,
            t.resolved_by,
            resolver.name AS resolved_by_name,
            t.resolution_comment,
            t.sla_due_at,
            (
                SELECT a.comment
                FROM ticket_activity a
                WHERE a.ticket_id = t.id
                  AND a.action = 'Staff Response'
                ORDER BY a.created_at DESC, a.id DESC
                LIMIT 1
            ) AS latest_staff_response,
            (
                SELECT a.created_at
                FROM ticket_activity a
                WHERE a.ticket_id = t.id
                  AND a.action = 'Staff Response'
                ORDER BY a.created_at DESC, a.id DESC
                LIMIT 1
            ) AS latest_staff_response_at

        FROM tickets t

        LEFT JOIN users staff
            ON t.assigned_to = staff.id

        LEFT JOIN users resolver
            ON t.resolved_by = resolver.id

        WHERE t.student_id = ?

        ORDER BY
            t.created_at DESC
        """,
        (student_id,)
    ).fetchall()

    connection.close()

    return {
        "status": "success",
        "student": {
            "id": student["id"],
            "name": student["name"],
            "email": student["email"]
        },
        "count": len(tickets),
        "tickets": [
            dict(ticket)
            for ticket in tickets
        ]
    }


# ============================================================
# GET STAFF'S ASSIGNED TICKETS
# ============================================================

@app.route(
    "/api/staff/<int:staff_id>/tickets",
    methods=["GET"]
)
def get_staff_tickets(staff_id):

    connection = get_db_connection()

    # --------------------------------------------------------
    # Validate staff user
    # --------------------------------------------------------

    staff = connection.execute(
        """
        SELECT
            id,
            name,
            email,
            role
        FROM users
        WHERE id = ?
        """,
        (staff_id,)
    ).fetchone()

    if staff is None:

        connection.close()

        return {
            "status": "error",
            "message": "Staff user not found"
        }, 404

    if staff["role"] != "staff":

        connection.close()

        return {
            "status": "error",
            "message": "User is not a staff member"
        }, 403

    # --------------------------------------------------------
    # Get tickets assigned to this staff member
    # --------------------------------------------------------

    tickets = connection.execute(
        """
        SELECT
            t.id,
            t.ticket_number,
            t.student_id,
            student.name AS student_name,
            student.email AS student_email,
            t.category,
            t.subject,
            t.description,
            t.priority,
            t.status,
            t.assigned_to,
            staff.name AS assigned_staff,
            t.created_at,
            t.updated_at,
            t.resolved_at,
            t.resolved_by,
            resolver.name AS resolved_by_name,
            t.resolution_comment,
            t.sla_due_at

        FROM tickets t

        JOIN users student
            ON t.student_id = student.id

        LEFT JOIN users staff
            ON t.assigned_to = staff.id

        LEFT JOIN users resolver
            ON t.resolved_by = resolver.id

        WHERE t.assigned_to = ?

        ORDER BY
            CASE t.status
                WHEN 'New' THEN 1
                WHEN 'Assigned' THEN 2
                WHEN 'In Progress' THEN 3
                WHEN 'Waiting for Student' THEN 4
                WHEN 'Resolved' THEN 5
                ELSE 6
            END,
            t.created_at DESC
        """,
        (staff_id,)
    ).fetchall()

    connection.close()

    return {
        "status": "success",
        "staff": {
            "id": staff["id"],
            "name": staff["name"],
            "email": staff["email"]
        },
        "count": len(tickets),
        "tickets": [
            dict(ticket)
            for ticket in tickets
        ]
    }


# ============================================================
# CREATE TICKET
# ============================================================
@app.route(
    "/api/tickets",
    methods=["POST"]
)
def create_ticket():

    data = request.get_json()

    if not data:

        return {
            "status": "error",
            "message": "Request body is required"
        }, 400

    student_id = data.get("student_id")

    category = data.get(
        "category",
        ""
    ).strip()

    subject = data.get(
        "subject",
        ""
    ).strip()

    description = data.get(
        "description",
        ""
    ).strip()

    priority = data.get(
        "priority",
        ""
    ).strip()

    # --------------------------------------------------------
    # Required fields
    # --------------------------------------------------------

    if not student_id:

        return {
            "status": "error",
            "message": "student_id is required"
        }, 400

    if not category:

        return {
            "status": "error",
            "message": "category is required"
        }, 400

    if not subject:

        return {
            "status": "error",
            "message": "subject is required"
        }, 400

    if not description:

        return {
            "status": "error",
            "message": "description is required"
        }, 400

    valid_priorities = [
        "Low",
        "Medium",
        "High",
        "Critical"
    ]

    if priority not in valid_priorities:

        return {
            "status": "error",
            "message": (
                "priority must be Low, Medium, "
                "High, or Critical"
            )
        }, 400

    connection = get_db_connection()

    student = connection.execute(
        """
        SELECT
            id,
            name,
            role
        FROM users
        WHERE id = ?
        """,
        (student_id,)
    ).fetchone()

    if student is None:

        connection.close()

        return {
            "status": "error",
            "message": "Student not found"
        }, 404

    if student["role"] != "student":

        connection.close()

        return {
            "status": "error",
            "message": (
                "Only users with student role "
                "can create tickets"
            )
        }, 403

    # --------------------------------------------------------
    # Ticket information
    # --------------------------------------------------------

    ticket_number = generate_ticket_number(
        connection
    )

    created_at = datetime.now(
        timezone.utc
    ).isoformat()

    sla_due_at = calculate_sla_due(
        priority
    )

    # --------------------------------------------------------
    # Insert ticket
    # --------------------------------------------------------

    cursor = connection.execute(
        """
        INSERT INTO tickets
        (
            ticket_number,
            student_id,
            category,
            subject,
            description,
            priority,
            status,
            assigned_to,
            created_at,
            updated_at,
            resolved_at,
            sla_due_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            ticket_number,
            student_id,
            category,
            subject,
            description,
            priority,
            "New",
            None,
            created_at,
            created_at,
            None,
            sla_due_at
        )
    )

    ticket_id = cursor.lastrowid

    # --------------------------------------------------------
    # Creation activity
    # --------------------------------------------------------

    connection.execute(
        """
        INSERT INTO ticket_activity
        (
            ticket_id,
            user_id,
            action,
            comment,
            created_at
        )
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            ticket_id,
            student_id,
            "Ticket Created",
            (
                f"Ticket {ticket_number} "
                f"created with {priority} priority."
            ),
            created_at
        )
    )

    connection.commit()

    ticket = connection.execute(
        """
        SELECT
            id,
            ticket_number,
            student_id,
            category,
            subject,
            description,
            priority,
            status,
            assigned_to,
            created_at,
            updated_at,
            resolved_at,
            sla_due_at
        FROM tickets
        WHERE id = ?
        """,
        (ticket_id,)
    ).fetchone()

    connection.close()

    return {
        "status": "success",
        "message": "Ticket created successfully",
        "ticket": dict(ticket)
    }, 201


# ============================================================
# MANAGER DASHBOARD / MANAGEMENT VISIBILITY
# ============================================================

@app.route(
    "/api/manager/dashboard",
    methods=["GET"]
)
def manager_dashboard():

    connection = get_db_connection()

    # --------------------------------------------------------
    # Overall ticket counts
    # --------------------------------------------------------

    total_tickets = connection.execute(
        "SELECT COUNT(*) AS count FROM tickets"
    ).fetchone()["count"]

    status_rows = connection.execute(
        """
        SELECT status, COUNT(*) AS count
        FROM tickets
        GROUP BY status
        """
    ).fetchall()

    status_counts = {
        "New": 0,
        "Assigned": 0,
        "In Progress": 0,
        "Waiting for Student": 0,
        "Resolved": 0
    }

    for row in status_rows:
        status_counts[row["status"]] = row["count"]

    # --------------------------------------------------------
    # Priority counts
    # --------------------------------------------------------

    critical_tickets = connection.execute(
        """
        SELECT COUNT(*) AS count
        FROM tickets
        WHERE priority = 'Critical'
        AND status != 'Resolved'
        """
    ).fetchone()["count"]

    high_priority_tickets = connection.execute(
        """
        SELECT COUNT(*) AS count
        FROM tickets
        WHERE priority = 'High'
        AND status != 'Resolved'
        """
    ).fetchone()["count"]

    # --------------------------------------------------------
    # Ownership / pending action
    # --------------------------------------------------------

    unassigned_tickets = connection.execute(
        """
        SELECT COUNT(*) AS count
        FROM tickets
        WHERE assigned_to IS NULL
        AND status != 'Resolved'
        """
    ).fetchone()["count"]

    pending_action_tickets = connection.execute(
        """
        SELECT COUNT(*) AS count
        FROM tickets
        WHERE status != 'Resolved'
        """
    ).fetchone()["count"]

    # --------------------------------------------------------
    # SLA breach calculation
    # --------------------------------------------------------

    all_tickets = connection.execute(
        """
        SELECT
            id,
            ticket_number,
            priority,
            status,
            created_at,
            resolved_at,
            sla_due_at,
            assigned_to
        FROM tickets
        """
    ).fetchall()

    sla_breached_tickets = 0
    sla_within_tickets = 0
    sla_met_tickets = 0

    for ticket in all_tickets:
        sla_info = calculate_sla_information(ticket)

        if sla_info["sla_status"] == "Breached":
            sla_breached_tickets += 1
        elif sla_info["sla_status"] == "Within SLA":
            sla_within_tickets += 1
        elif sla_info["sla_status"] == "Met":
            sla_met_tickets += 1

    # --------------------------------------------------------
    # Average resolution time
    # --------------------------------------------------------

    resolved_tickets = connection.execute(
        """
        SELECT created_at, resolved_at
        FROM tickets
        WHERE status = 'Resolved'
        AND resolved_at IS NOT NULL
        """
    ).fetchall()

    resolution_durations = []

    for ticket in resolved_tickets:
        created_at = parse_datetime(ticket["created_at"])
        resolved_at = parse_datetime(ticket["resolved_at"])

        if created_at and resolved_at:
            duration_seconds = (
                resolved_at - created_at
            ).total_seconds()

            if duration_seconds >= 0:
                resolution_durations.append(
                    duration_seconds
                )

    if resolution_durations:
        average_resolution_hours = round(
            sum(resolution_durations)
            / len(resolution_durations)
            / 3600,
            2
        )
    else:
        average_resolution_hours = None

    # --------------------------------------------------------
    # Staff workload / ownership visibility
    # --------------------------------------------------------

    staff_workload_rows = connection.execute(
        """
        SELECT
            u.id AS staff_id,
            u.name AS staff_name,
            COUNT(t.id) AS assigned_tickets,
            SUM(
                CASE
                    WHEN t.status != 'Resolved' THEN 1
                    ELSE 0
                END
            ) AS open_tickets,
            SUM(
                CASE
                    WHEN t.status = 'Resolved' THEN 1
                    ELSE 0
                END
            ) AS resolved_tickets
        FROM users u
        LEFT JOIN tickets t
            ON t.assigned_to = u.id
        WHERE u.role = 'staff'
        GROUP BY u.id, u.name
        ORDER BY open_tickets DESC, u.name ASC
        """
    ).fetchall()

    staff_workload = []

    for row in staff_workload_rows:
        staff_workload.append({
            "staff_id": row["staff_id"],
            "staff_name": row["staff_name"],
            "assigned_tickets": row["assigned_tickets"] or 0,
            "open_tickets": row["open_tickets"] or 0,
            "resolved_tickets": row["resolved_tickets"] or 0
        })

    # --------------------------------------------------------
    # Escalation queue
    # --------------------------------------------------------

    escalation_rows = connection.execute(
        """
        SELECT
            t.id,
            t.ticket_number,
            t.category,
            t.subject,
            t.priority,
            t.status,
            t.assigned_to,
            staff.name AS assigned_staff,
            t.created_at,
            t.updated_at,
            t.resolved_at,
            t.sla_due_at
        FROM tickets t
        LEFT JOIN users staff
            ON t.assigned_to = staff.id
        WHERE t.status != 'Resolved'
        ORDER BY
            CASE t.priority
                WHEN 'Critical' THEN 1
                WHEN 'High' THEN 2
                WHEN 'Medium' THEN 3
                WHEN 'Low' THEN 4
            END,
            t.created_at ASC
        """
    ).fetchall()

    escalation_queue = []

    for ticket in escalation_rows:
        sla_info = calculate_sla_information(ticket)

        should_escalate = (
            sla_info["is_breached"]
            or ticket["priority"] == "Critical"
            or ticket["assigned_to"] is None
        )

        if should_escalate:
            if sla_info["is_breached"]:
                escalation_reason = "SLA breached"
            elif ticket["assigned_to"] is None:
                escalation_reason = "Unassigned ticket"
            else:
                escalation_reason = "Critical priority"

            escalation_queue.append({
                "id": ticket["id"],
                "ticket_number": ticket["ticket_number"],
                "category": ticket["category"],
                "subject": ticket["subject"],
                "priority": ticket["priority"],
                "status": ticket["status"],
                "assigned_to": ticket["assigned_to"],
                "assigned_staff": ticket["assigned_staff"],
                "created_at": ticket["created_at"],
                "sla_due_at": ticket["sla_due_at"],
                "sla_status": sla_info["sla_status"],
                "age_hours": sla_info["age_hours"],
                "pending_action": sla_info["pending_action"],
                "escalation_reason": escalation_reason
            })

    connection.close()

    return {
        "status": "success",
        "dashboard": {
            "total_tickets": total_tickets,
            "new": status_counts["New"],
            "assigned": status_counts["Assigned"],
            "in_progress": status_counts["In Progress"],
            "waiting_for_student": status_counts["Waiting for Student"],
            "resolved": status_counts["Resolved"],
            "critical_open": critical_tickets,
            "high_priority_open": high_priority_tickets,
            "unassigned_open": unassigned_tickets,
            "pending_action": pending_action_tickets,
            "sla_breached": sla_breached_tickets,
            "sla_within": sla_within_tickets,
            "sla_met": sla_met_tickets,
            "average_resolution_hours": average_resolution_hours
        },
        "staff_workload": staff_workload,
        "escalation_queue": escalation_queue
    }


# ============================================================
# MANAGER ESCALATION ACTION
# ============================================================

@app.route(
    "/api/tickets/<int:ticket_id>/escalate",
    methods=["POST"]
)
def escalate_ticket(ticket_id):

    data = request.get_json()

    if not data:
        return {
            "status": "error",
            "message": "Request body is required"
        }, 400

    manager_id = data.get("manager_id")
    comment = data.get("comment", "").strip()

    if not manager_id:
        return {
            "status": "error",
            "message": "manager_id is required"
        }, 400

    if not comment:
        return {
            "status": "error",
            "message": "comment is required"
        }, 400

    connection = get_db_connection()

    manager = connection.execute(
        """
        SELECT id, name, role
        FROM users
        WHERE id = ?
        """,
        (manager_id,)
    ).fetchone()

    if manager is None:
        connection.close()
        return {
            "status": "error",
            "message": "Manager not found"
        }, 404

    if manager["role"] != "manager":
        connection.close()
        return {
            "status": "error",
            "message": "Only manager users can escalate tickets"
        }, 403

    ticket = connection.execute(
        """
        SELECT
            id,
            ticket_number,
            status,
            priority,
            assigned_to
        FROM tickets
        WHERE id = ?
        """,
        (ticket_id,)
    ).fetchone()

    if ticket is None:
        connection.close()
        return {
            "status": "error",
            "message": "Ticket not found"
        }, 404

    if ticket["status"] == "Resolved":
        connection.close()
        return {
            "status": "error",
            "message": "Resolved tickets cannot be escalated"
        }, 400

    created_at = datetime.now(
        timezone.utc
    ).isoformat()

    escalation_comment = (
        f"Ticket escalated by {manager['name']}. "
        f"Reason: {comment}"
    )

    connection.execute(
        """
        INSERT INTO ticket_activity
        (
            ticket_id,
            user_id,
            action,
            comment,
            created_at
        )
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            ticket_id,
            manager_id,
            "Ticket Escalated",
            escalation_comment,
            created_at
        )
    )

    connection.execute(
        """
        UPDATE tickets
        SET
            updated_at = ?,
            priority = CASE
                WHEN priority IN ('Low', 'Medium') THEN 'High'
                ELSE priority
            END
        WHERE id = ?
        """,
        (
            created_at,
            ticket_id
        )
    )

    connection.commit()

    updated_ticket = connection.execute(
        """
        SELECT
            t.id,
            t.ticket_number,
            t.priority,
            t.status,
            t.assigned_to,
            staff.name AS assigned_staff,
            t.updated_at
        FROM tickets t
        LEFT JOIN users staff
            ON t.assigned_to = staff.id
        WHERE t.id = ?
        """,
        (ticket_id,)
    ).fetchone()

    connection.close()

    return {
        "status": "success",
        "message": "Ticket escalated successfully",
        "ticket": dict(updated_ticket)
    }


# ============================================================
# FRONTEND PAGE ROUTES
# ============================================================

@app.route("/", methods=["GET"])
def home_page():
    return render_template("login.html")


@app.route("/login", methods=["GET"])
def login_page():
    return render_template("login.html")


@app.route("/student", methods=["GET"])
def student_page():
    return render_template("student_dashboard.html")

@app.route("/register", methods=["GET"])
def register_page():
    return render_template("register.html")

@app.route("/staff", methods=["GET"])
def staff_page():
    return render_template("staff_dashboard.html")


@app.route("/manager", methods=["GET"])
def manager_page():
    return render_template("manager_dashboard.html")


@app.route("/create-ticket", methods=["GET"])
def create_ticket_page():
    return render_template("create_ticket.html")


@app.route("/ticket/<int:ticket_id>", methods=["GET"])
def ticket_detail_page(ticket_id):
    return render_template("ticket_detail.html", ticket_id=ticket_id)



# ============================================================
# APPLICATION START
# ============================================================

# Initialize the SQLite database and demo accounts when
# the Flask application is imported by Gunicorn or started directly.
initialize_database()
create_demo_users()


if __name__ == "__main__":
    import os

    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000)),
        debug=False
    )
