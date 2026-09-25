# EduHelpDesk — Student Support & Ticket Management System

A web-based student support and ticket management system developed for the **Edumerge Solutions Product Engineering Assignment**.

EduHelpDesk provides a structured workflow for students to raise support requests and for support staff and managers to manage, prioritize, assign, communicate, escalate, and resolve those requests.

The system is designed around the complete ticket lifecycle, with emphasis on **ownership, priority, SLA tracking, ageing, pending actions, escalation, resolution tracking, activity history, and management visibility**.

---

## Challenge

### Your Challenge

Design a ticket/support system with:

- Statuses
- Priorities
- Assignment
- SLAs
- Ageing
- Ownership
- Resolution tracking
- Activity history
- Management visibility
- Escalation workflow
- Pending-action workflow

The goal was to design a practical workflow that allows support requests to be tracked from creation through resolution while giving students, support staff, and management the appropriate level of visibility.

---

# Solution Overview

EduHelpDesk implements the support process as a centralized ticket management workflow.

A student creates a ticket with a category, subject, description, and priority. The ticket can then be assigned to a support staff member.

The assigned staff member processes the ticket, communicates with the student when required, and either requests additional information or resolves the issue.

Managers have a separate dashboard to monitor workload, priorities, SLA status, unassigned tickets, pending actions, and escalations.

The complete history of important ticket actions is stored in an activity log.

---

# User Roles

## Student

Students can:

- Register and login
- Create support tickets
- Select ticket category
- Set ticket priority
- View their own tickets
- Track ticket status
- See assigned support staff
- View staff responses
- Provide additional information when requested
- View resolution details
- View ticket activity history

## Support Staff

Support staff can:

- View tickets assigned to them
- Open complete ticket details
- Start processing a ticket
- Respond to students
- Request additional information
- Continue processing after receiving a student response
- Resolve tickets with a resolution comment
- Monitor SLA and ageing information
- View ticket activity history

## Manager

Managers can:

- View overall ticket statistics
- Monitor ticket status distribution
- Monitor high and critical priority tickets
- Identify unassigned tickets
- Monitor SLA performance
- View staff workload
- Assign tickets to staff
- Escalate tickets
- Increase priority during escalation
- Monitor pending-action tickets

---

# Ticket Lifecycle

The system uses controlled ticket status transitions instead of allowing arbitrary status changes.

```text
New
  │
  ▼
Assigned
  │
  ▼
In Progress
  │
  ├───────────────► Resolved
  │
  ▼
Waiting for Student
  │
  ▼
In Progress
  │
  ▼
Resolved
```

### Supported transitions

```text
New → Assigned

Assigned → In Progress

In Progress → Waiting for Student
In Progress → Resolved

Waiting for Student → In Progress
Waiting for Student → Resolved
```

A resolved ticket cannot be moved back into an active state through the normal workflow.

This prevents inconsistent ticket states and makes the lifecycle predictable.

---

# Priorities

Each ticket has one of four priority levels:

```text
Low
Medium
High
Critical
```

Priority helps staff and managers identify which requests require greater attention.

Managers can also escalate a ticket when additional attention is required. During escalation, a Low or Medium priority ticket can be raised to High priority.

---

# Assignment & Ownership

Every ticket has a student owner and can have an assigned support staff member.

The assignment workflow allows managers to allocate tickets to specific staff members.

The system also provides:

- Assigned staff information
- Staff workload
- Open ticket count
- Resolved ticket count
- Unassigned ticket visibility

This makes ownership visible instead of leaving tickets without a clear responsible person.

---

# SLA Management

Each ticket receives an SLA deadline based on its creation time.

The system calculates SLA information dynamically using ticket timestamps.

The SLA section provides:

- SLA due time
- Time elapsed since ticket creation
- Remaining SLA time
- SLA status
- SLA breach detection
- Pending action

The system identifies tickets as:

```text
Within SLA
Breached
Met
Unknown
```

For resolved tickets, the system records whether the SLA was met or breached based on the ticket timeline.

---

# Ticket Ageing

Ticket ageing helps identify requests that have been open for longer periods.

The system calculates the age of a ticket from its creation timestamp and displays the information along with SLA status.

This helps staff and managers identify tickets that may require attention before they become overdue.

---

# Pending-Action Workflow

A ticket may require an action from a specific party before it can progress.

The workflow distinguishes situations where:

- Staff action is required
- Student information is required
- A ticket is unassigned
- A ticket has an SLA concern

When staff require additional information, the ticket moves to:

```text
Waiting for Student
```

The student can then provide additional information.

After the student responds, the ticket automatically moves back to:

```text
In Progress
```

This creates a clear handoff between student and support staff instead of relying on informal communication.

---

# Escalation Workflow

Managers can escalate tickets when they require additional attention.

The escalation workflow:

1. Manager selects the ticket.
2. Manager provides an escalation reason/comment.
3. The escalation is recorded in the ticket activity history.
4. Low or Medium priority tickets are raised to High priority.
5. The ticket becomes visible in the manager escalation queue.

Resolved tickets cannot be escalated because they are already closed.

This keeps escalation focused on tickets that still require action.

---

# Resolution Tracking

A ticket cannot be resolved without a resolution comment.

When a ticket is resolved, the system records:

- Resolution status
- Resolution comment
- Resolution timestamp
- Staff member who resolved the ticket

Example:

```text
Status: Resolved

Resolution:
Issue has been resolved and the student can
collect the requested document from the concerned department.
```

This provides a clear explanation of how the request was completed.

---

# Activity History

Every important ticket action is recorded in the activity history.

Examples include:

```text
Ticket Created
Ticket Assigned
Status Changed
Staff Response
Student Response
Escalation
Resolution
```

Each activity contains information such as:

- Action
- User
- User role
- Comment
- Timestamp

Example:

```text
02:00 — Ticket Assigned
02:01 — Status Changed: Assigned → In Progress
02:02 — Staff Response
02:03 — Status Changed: In Progress → Waiting for Student
02:04 — Student Response
02:04 — Status Changed: Waiting for Student → In Progress
02:05 — Ticket Resolved
```

This provides traceability throughout the ticket lifecycle.

---

# Management Visibility

The manager dashboard provides an operational overview of the support system.

It includes:

- Total tickets
- Status distribution
- High and critical priority tickets
- Unassigned tickets
- Pending-action tickets
- SLA-breached tickets
- SLA-within-target tickets
- Resolved ticket information
- Average resolution time
- Staff workload
- Escalation queue

This allows management to understand the current support workload without opening every ticket individually.

---

# Architecture

The application follows a simple frontend/backend architecture:

```text
┌──────────────────────────┐
│        Browser           │
│   HTML / CSS / JavaScript│
└────────────┬─────────────┘
             │
             │ REST API
             ▼
┌──────────────────────────┐
│       Flask Backend      │
│                          │
│  API + Business Logic   │
│  Validation + Workflows │
│  SLA + Ticket Handling  │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│        SQLite            │
│                          │
│ Users                    │
│ Tickets                  │
│ Ticket Activity          │
└──────────────────────────┘
```

The frontend is responsible for the user interface and API communication.

The Flask backend handles:

- Business rules
- Validation
- Status transitions
- Assignment
- Responses
- Escalation
- SLA calculations
- Resolution tracking
- Database operations

SQLite stores the application data and activity history.

---

# Technology Stack

## Frontend

- HTML5
- CSS3
- JavaScript

## Backend

- Python
- Flask
- Flask REST APIs

## Database

- SQLite

## Deployment

- Git
- GitHub
- Gunicorn
- Render

---

# Database Design

The main database tables are:

## Users

Stores:

- Student accounts
- Staff accounts
- Manager accounts
- Roles
- Password hashes

## Tickets

Stores:

- Ticket number
- Student
- Category
- Subject
- Description
- Priority
- Status
- Assigned staff
- Creation time
- Updated time
- SLA deadline
- Resolution information

## Ticket Activity

Stores:

- Ticket
- User
- Action
- Comment
- Timestamp

The separation of ticket data and activity history allows the system to maintain both the **current state** and the **historical record** of a ticket.

---

# API Structure

The backend exposes REST APIs for the main operations.

### Authentication

```text
POST /api/login
POST /api/register
```

### Tickets

```text
GET /api/tickets
GET /api/tickets/<id>
GET /api/tickets/<id>/activity
GET /api/tickets/<id>/sla
```

### Student

```text
GET /api/students/<student_id>/tickets
POST /api/tickets/<id>/student-response
```

### Staff

```text
GET /api/staff/<staff_id>/tickets
POST /api/tickets/<id>/response
PATCH /api/tickets/<id>/status
```

### Manager

```text
GET /api/manager/dashboard
POST /api/tickets/<id>/assign
POST /api/tickets/<id>/escalate
```

---

# Project Structure

```text
EduHelpDesk/
│
├── app.py
├── requirements.txt
│
├── database/
│   └── schema.sql
│
├── instance/
│   └── support.db
│
├── templates/
│   ├── login.html
│   ├── register.html
│   ├── student_dashboard.html
│   ├── create_ticket.html
│   ├── ticket_detail.html
│   ├── staff_dashboard.html
│   └── manager_dashboard.html
│
├── static/
│   ├── css/
│   │   └── style.css
│   │
│   └── js/
│       ├── login.js
│       ├── register.js
│       ├── student.js
│       ├── create_ticket.js
│       ├── ticket_details.js
│       ├── staff.js
│       └── manager.js
│
├── tests/
│
├── README.md
└── AI_USAGE_REPORT.md
```

---

# Demo Accounts

| Role | Email | Password |
|---|---|---|
| Student | `student@edumerge.com` | `student123` |
| Staff | `staff@edumerge.com` | `staff123` |
| Manager | `manager@edumerge.com` | `manager123` |

These accounts are provided for demonstration and evaluation purposes.

---

# Running Locally

### 1. Clone the repository

```bash
git clone https://github.com/mathan-ponraj/EduHelpDesk.git
cd EduHelpDesk
```

### 2. Create a virtual environment

```bash
python -m venv venv
```

### 3. Activate the environment

Windows:

```bash
venv\Scripts\activate
```

### 4. Install dependencies

```bash
python -m pip install -r requirements.txt
```

### 5. Start the application

```bash
python app.py
```

Open:

```text
http://127.0.0.1:5000
```

---

# Validation & Testing

The application was validated across the main support workflow.

Testing covered:

- Student registration
- Login
- Ticket creation
- Ticket assignment
- Priority handling
- Status transitions
- Staff responses
- Student responses
- Waiting-for-student workflow
- Resolution validation
- Resolution comments
- SLA calculation
- Ticket ageing
- Activity history
- Manager dashboard
- Staff workload
- Escalation
- Unassigned ticket handling
- API responses
- Role-based page access

Special attention was given to invalid workflow states, such as attempting to resolve a ticket without a resolution comment or performing an unsupported status transition.

Frontend/backend API integration was also validated by checking actual API responses during testing.

---

# Engineering Decisions

### Controlled Workflow

Status transitions are enforced by the backend rather than relying only on frontend controls.

### Activity Log

Ticket activities are stored independently so that the system maintains a complete history rather than only the latest ticket state.

### SLA Calculation

SLA information is calculated from timestamps so ageing and remaining SLA time can be determined dynamically.

### Role-Based Views

Students, staff, and managers receive different views according to their responsibilities.

### SQLite

SQLite was selected because it provides a lightweight database suitable for a functional assignment prototype without requiring a separate database server.

---

# AI-Assisted Development

AI tools were used as development assistance during implementation.

AI assistance was used for:

- Flask API development
- SQLite query development
- Ticket workflow implementation
- SLA calculations
- JavaScript API integration
- Dashboard logic
- Activity history implementation
- Error handling
- Test-case preparation
- Debugging

AI-generated code and suggestions were reviewed, modified, and tested during development.

One example occurred during frontend/backend integration. A staff response was not appearing on the student dashboard. The API activity history was inspected and the issue was traced to a mismatch between the frontend request field and the backend field expected by the API. The mismatch was corrected and the response flow was tested again.

The detailed AI usage and validation process is documented in:

```text
AI_USAGE_REPORT.md
```

---

# Live Application

**Live Demo:**  
https://eduhelpdesk.onrender.com

**Source Code:**  
https://github.com/mathan-ponraj/EduHelpDesk

---

# Project Summary

EduHelpDesk implements a complete support-ticket workflow covering:

```text
Ticket Creation
      ↓
Priority
      ↓
Assignment & Ownership
      ↓
SLA & Ageing
      ↓
Staff Processing
      ↓
Student Communication
      ↓
Pending Action
      ↓
Escalation when required
      ↓
Resolution
      ↓
Activity History
      ↓
Management Visibility
```

The implementation focuses on providing a practical and traceable support workflow where every ticket has a clear state, ownership, priority, communication history, SLA information, and resolution record.
