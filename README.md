<div align="center">

# EduHelpDesk

### Student Support & Ticket Management System

<p>
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white" />
  <img src="https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" />
</p>

<br/>

<a href="https://eduhelpdesk.onrender.com/">
  <img src="https://img.shields.io/badge/🚀_EXPLORE_LIVE_DEMO-7C3AED?style=for-the-badge&logoColor=white" />
</a>

<br/><br/>

*A centralized platform for managing student support requests from creation to resolution.*

</div>

---

## About the Project

EduHelpDesk is a web-based student support and ticket management system designed to simplify communication between students, support staff, and managers.

The platform provides a structured ticket lifecycle with assignment, priority management, SLA tracking, escalation, pending actions, and resolution history.

It focuses on making support operations more organized, transparent, and accountable.

## Key Features

* **Role-Based Access:** Separate dashboards for Students, Support Staff, and Managers.
* **Ticket Management:** Create, assign, track, and resolve support requests.
* **Priority Management:** Low, Medium, High, and Critical ticket priorities.
* **SLA Tracking:** Monitor deadlines, remaining time, and SLA breaches.
* **Ticket Ageing:** Identify requests that remain unresolved for longer periods.
* **Escalation Workflow:** Allow managers to escalate tickets requiring additional attention.
* **Pending Actions:** Track tickets waiting for student information or staff action.
* **Activity History:** Maintain a chronological record of important ticket activities.
* **Management Dashboard:** Monitor ticket statistics, staff workload, and operational performance.

## Ticket Lifecycle

```text
       Ticket Creation
              |
              v
          Assignment
              |
              v
         In Progress
              |
       +------+------+
       |             |
       v             v
 Waiting for       Resolved
  Student
       |
       v
 Student Response
       |
       v
  In Progress
```

Managers can also monitor and escalate tickets when additional attention is required.

## User Roles

| Student                   | Support Staff         | Manager                 |
| ------------------------- | --------------------- | ----------------------- |
| Create tickets            | View assigned tickets | Monitor all tickets     |
| Track ticket status       | Respond to students   | Assign tickets          |
| View responses            | Request information   | Escalate tickets        |
| Submit additional details | Resolve tickets       | Monitor SLA performance |
| View resolution details   | Track ageing          | Monitor staff workload  |

## Engineering Challenges & Solutions

| Challenge                            | Implementation                                                               |
| ------------------------------------ | ---------------------------------------------------------------------------- |
| Managing multiple user roles         | Implemented role-based dashboards and access controls.                       |
| Maintaining consistent ticket states | Developed controlled backend status transitions.                             |
| Tracking SLA deadlines               | Implemented timestamp-based SLA calculations and breach detection.           |
| Managing ticket ownership            | Developed staff assignment and workload tracking.                            |
| Handling pending requests            | Implemented a student-response workflow that returns tickets to In Progress. |
| Maintaining accountability           | Created a separate ticket activity history.                                  |
| Managing escalations                 | Implemented manager-controlled escalation with priority updates.             |
| Tracking resolutions                 | Required resolution comments and recorded resolution timestamps.             |

## Technology Stack

| Category        | Technologies            |
| --------------- | ----------------------- |
| Programming     | Python, JavaScript      |
| Frontend        | HTML5, CSS3, JavaScript |
| Backend         | Flask                   |
| Database        | SQLite                  |
| API Development | REST APIs               |
| Deployment      | Render, Gunicorn        |
| Version Control | Git, GitHub             |

## System Architecture

```text
       User Interface
      HTML / CSS / JS
              |
              v
          REST APIs
              |
              v
        Flask Backend
              |
       Business Logic
              |
    ---------------------
    |         |         |
    v         v         v
  Tickets   SLA      Escalation
    |         |         |
    ---------------------
              |
              v
          SQLite DB
              |
    ---------------------
    |         |         |
    v         v         v
   Users   Tickets   Activity
```

## Database Design

The application uses three main database tables:

* **Users:** Stores student, staff, and manager accounts, roles, and password hashes.
* **Tickets:** Stores ticket information, priority, status, assignment, SLA deadlines, and resolution details.
* **Ticket Activity:** Maintains historical records of actions, comments, users, and timestamps.

Separating ticket information from activity history helps maintain both the current ticket state and its historical record.

## Key Learning Outcomes

* Python backend development using Flask.
* REST API development and integration.
* Relational database design using SQLite.
* Role-based access control.
* Business logic and workflow implementation.
* SLA calculations and ticket lifecycle management.
* Frontend and backend integration.
* Application testing, debugging, and deployment.

## Validation & Testing

Tested the major application workflows, including:

* User registration and authentication.
* Ticket creation and assignment.
* Priority and status transitions.
* Student and staff communication.
* SLA calculations and ticket ageing.
* Escalation and resolution workflows.
* Activity history and manager dashboard.
* API integration and role-based access.

## Quick Start

```bash
# Clone the repository
git clone https://github.com/mathan-ponraj/EduHelpDesk.git

# Navigate to the project
cd EduHelpDesk

# Create a virtual environment
python -m venv venv

# Activate the environment (Windows)
venv\Scripts\activate

# Install dependencies
python -m pip install -r requirements.txt

# Run the application
python app.py
```

Open `http://127.0.0.1:5000` in your browser.

## Project Links

<div align="center">

<a href="https://eduhelpdesk.onrender.com/">
  <img src="https://img.shields.io/badge/LIVE_DEMO-7C3AED?style=for-the-badge&logo=render&logoColor=white" />
</a>
<a href="https://github.com/mathan-ponraj/EduHelpDesk">
  <img src="https://img.shields.io/badge/SOURCE_CODE-181717?style=for-the-badge&logo=github&logoColor=white" />
</a>
<a href="https://www.linkedin.com/in/mathan03/">
  <img src="https://img.shields.io/badge/LINKEDIN-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white" />
</a>

</div>

---

## Developer

<div align="center">

### Mathan Ponraj

**M.E. Computer Science | Python | Backend Development | Data Science**

*Building practical applications, solving engineering challenges, and learning through implementation.*

</div>

---

<div align="center">

**Designed to organize support. Built to improve accountability.**

</div>
