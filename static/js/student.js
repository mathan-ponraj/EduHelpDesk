document.addEventListener("DOMContentLoaded", () => {

    const userData = localStorage.getItem("user");

    if (!userData) {
        window.location.href = "/";
        return;
    }

    let user;

    try {
        user = JSON.parse(userData);
    }
    catch (error) {
        console.error("Invalid user data:", error);
        localStorage.removeItem("user");
        window.location.href = "/";
        return;
    }

    if (user.role !== "student") {
        window.location.href = "/";
        return;
    }

    const studentName = document.getElementById("studentName");

    if (studentName) {
        studentName.textContent =
            `${user.name} (${user.email})`;
    }

    const logoutButton =
        document.getElementById("logoutButton");

    if (logoutButton) {
        logoutButton.addEventListener("click", logout);
    }

    const refreshButtons =
        document.querySelectorAll("#refreshTickets");

    refreshButtons.forEach(button => {
        button.addEventListener("click", loadStudentTickets);
    });

    loadStudentTickets();
});


// =========================================================
// LOAD STUDENT TICKETS
// =========================================================

async function loadStudentTickets() {

    const userData = localStorage.getItem("user");

    if (!userData) {
        window.location.href = "/";
        return;
    }

    let user;

    try {
        user = JSON.parse(userData);
    }
    catch (error) {
        localStorage.removeItem("user");
        window.location.href = "/";
        return;
    }

    const tableBody =
        document.getElementById("studentTicketsTable");

    const message =
        document.getElementById("studentMessage");

    if (!tableBody) {
        return;
    }

    tableBody.innerHTML = `
        <tr>
            <td colspan="5">
                Loading tickets...
            </td>
        </tr>
    `;

    if (message) {
        message.textContent = "";
        message.className = "message";
    }

    try {

        const response = await fetch(
            `/api/students/${user.id}/tickets`
        );

        const data = await response.json();

        if (!response.ok || data.status !== "success") {
            throw new Error(
                data.message || "Unable to load tickets."
            );
        }

        const tickets = data.tickets || [];

        updateStudentMetrics(tickets);

        if (tickets.length === 0) {

            tableBody.innerHTML = `
                <tr>
                    <td colspan="5">
                        <div class="student-empty-state">

                            <div class="empty-state-icon">
                                +
                            </div>

                            <strong>
                                No support tickets yet
                            </strong>

                            <p>
                                Create a ticket when you need
                                help from the support team.
                            </p>

                            <button
                                type="button"
                                class="primary-button"
                                onclick="window.location.href='/create-ticket'">

                                Create Your First Ticket

                            </button>

                        </div>
                    </td>
                </tr>
            `;

            return;
        }


        tableBody.innerHTML =
            tickets.map(ticket => {

                const hasStaffResponse =
                    Boolean(
                        ticket.latest_staff_response &&
                        String(
                            ticket.latest_staff_response
                        ).trim()
                    );


                let responseHtml = "";


                // =========================================
                // STAFF RESPONSE
                // =========================================

                if (hasStaffResponse) {

                    responseHtml = `
                        <div class="staff-response">

                            <strong>
                                Staff Response
                            </strong>

                            <p>
                                ${escapeHtml(
                                    ticket.latest_staff_response
                                )}
                            </p>

                            ${
                                ticket.latest_staff_response_at
                                    ? `
                                        <small>
                                            ${formatDate(
                                                ticket.latest_staff_response_at
                                            )}
                                        </small>
                                      `
                                    : ""
                            }

                        </div>
                    `;

                }
                else {

                    responseHtml = `
                        <span class="muted-text">
                            No staff response yet
                        </span>
                    `;

                }


                // =========================================
                // STUDENT RESPONSE
                // =========================================

                if (
                    String(ticket.status || "").trim()
                        .toLowerCase() === "waiting for student"
                ) {

                    responseHtml += `
                        <div class="student-response-box">

                            <textarea
                                id="studentResponse-${ticket.id}"
                                maxlength="2000"
                                rows="3"
                                placeholder="Enter your response...">
                            </textarea>

                            <button
                                type="button"
                                class="primary-button"
                                onclick="sendStudentResponse(${ticket.id})">

                                Send Response

                            </button>

                        </div>
                    `;
                }


                // =========================================
                // TICKET ROW
                // =========================================

                return `
                    <tr>

                        <td>

                            <span class="ticket-number">
                                ${escapeHtml(
                                    ticket.ticket_number
                                )}
                            </span>

                        </td>


                        <td>

                            <strong class="student-ticket-subject">
                                ${escapeHtml(
                                    ticket.subject
                                )}
                            </strong>

                        </td>


                        <td>

                            <span class="status-badge status-${getStatusClass(ticket.status)}">

                                ${escapeHtml(
                                    ticket.status
                                )}

                            </span>

                        </td>


                        <td>

                            ${responseHtml}

                        </td>


                        <td>

                            <span class="ticket-created-date">

                                ${formatDate(
                                    ticket.created_at
                                )}

                            </span>

                        </td>

                    </tr>
                `;

            }).join("");

    }
    catch (error) {

        console.error(
            "Student ticket loading error:",
            error
        );

        updateStudentMetrics([]);

        tableBody.innerHTML = `
            <tr>
                <td colspan="5">
                    Unable to load tickets.
                </td>
            </tr>
        `;

        if (message) {

            message.textContent =
                error.message ||
                "Unable to load tickets.";

            message.className =
                "message error";
        }
    }
}


// =========================================================
// SEND STUDENT RESPONSE
// =========================================================

async function sendStudentResponse(ticketId) {

    const userData =
        localStorage.getItem("user");

    if (!userData) {
        window.location.href = "/";
        return;
    }

    const user = JSON.parse(userData);

    const textarea =
        document.getElementById(
            `studentResponse-${ticketId}`
        );

    if (!textarea) {
        return;
    }

    const comment =
        textarea.value.trim();

    if (!comment) {

        alert(
            "Please enter a response before sending."
        );

        return;
    }

    try {

        const response = await fetch(
            `/api/tickets/${ticketId}/student-response`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    student_id: user.id,
                    comment: comment
                })
            }
        );


        const data =
            await response.json();


        if (!response.ok || data.status !== "success") {

            throw new Error(
                data.message ||
                "Unable to send response."
            );

        }


        alert("Response sent successfully.");

        await loadStudentTickets();

    }
    catch (error) {

        console.error(
            "Student response error:",
            error
        );

        alert(
            error.message ||
            "Unable to send response."
        );
    }
}


// =========================================================
// STUDENT DASHBOARD METRICS
// =========================================================

function updateStudentMetrics(tickets) {

    const totalElement =
        document.getElementById(
            "studentTotalTickets"
        );

    const openElement =
        document.getElementById(
            "studentOpenTickets"
        );

    const resolvedElement =
        document.getElementById(
            "studentResolvedTickets"
        );

    const total = tickets.length;

    const resolved =
        tickets.filter(ticket =>
            String(ticket.status || "")
                .toLowerCase()
                .includes("resolved")
        ).length;

    const open = total - resolved;

    if (totalElement) {
        totalElement.textContent = total;
    }

    if (openElement) {
        openElement.textContent = open;
    }

    if (resolvedElement) {
        resolvedElement.textContent = resolved;
    }
}


// =========================================================
// STATUS CLASS
// =========================================================

function getStatusClass(status) {

    if (!status) {
        return "default";
    }

    return String(status)
        .toLowerCase()
        .replace(/\s+/g, "-");
}


// =========================================================
// LOGOUT
// =========================================================

function logout() {

    localStorage.removeItem("user");

    window.location.href = "/";
}


// =========================================================
// DATE FORMAT
// =========================================================

function formatDate(value) {

    if (!value) {
        return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString();
}


// =========================================================
// HTML ESCAPING
// =========================================================

function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}