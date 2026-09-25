document.addEventListener("DOMContentLoaded", () => {

    // =========================================================
    // AUTHENTICATION
    // =========================================================

    const userData = localStorage.getItem("user");

    if (!userData) {
        window.location.href = "/";
        return;
    }

    let user;

    try {
        user = JSON.parse(userData);
    } catch (error) {

        console.error("Invalid user data:", error);

        localStorage.removeItem("user");
        window.location.href = "/";

        return;
    }

    // Staff dashboard is only for staff users
    if (user.role !== "staff") {
        window.location.href = "/";
        return;
    }


    // =========================================================
    // STAFF NAME
    // =========================================================

    const staffName =
        document.getElementById("staffName");

    if (staffName) {

        staffName.textContent =
            `${user.name || ""} (${user.email || ""})`;

    }


    // =========================================================
    // LOGOUT
    // =========================================================

    const logoutButton =
        document.getElementById("logoutButton");

    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            logout
        );

    }


    // =========================================================
    // REFRESH BUTTON
    // =========================================================

    const refreshButton =
        document.getElementById(
            "refreshTickets"
        );

    if (refreshButton) {

        refreshButton.addEventListener(
            "click",
            loadStaffTickets
        );

    }


    // =========================================================
    // INITIAL LOAD
    // =========================================================

    loadStaffTickets();

});


// =============================================================
// LOAD STAFF TICKETS
// =============================================================

async function loadStaffTickets() {

    const userData =
        localStorage.getItem("user");

    if (!userData) {

        window.location.href = "/";
        return;

    }


    let user;

    try {

        user = JSON.parse(userData);

    } catch (error) {

        console.error(
            "Invalid user data:",
            error
        );

        localStorage.removeItem("user");

        window.location.href = "/";

        return;
    }


    const tableBody =
        document.getElementById(
            "staffTicketsTable"
        );

    const message =
        document.getElementById(
            "staffMessage"
        );


    if (!tableBody) {

        console.error(
            "staffTicketsTable element not found."
        );

        return;
    }


    // =========================================================
    // LOADING STATE
    // =========================================================

    tableBody.innerHTML = `
        <tr>
            <td colspan="7">
                Loading assigned tickets...
            </td>
        </tr>
    `;


    if (message) {

        message.textContent = "";
        message.className = "message";

    }


    try {

        console.log(
            "Loading tickets for staff:",
            user.id
        );


        const response =
            await fetch(
                `/api/staff/${user.id}/tickets`,
                {
                    method: "GET",

                    headers: {
                        "Accept":
                            "application/json"
                    }
                }
            );


        console.log(
            "Staff tickets API status:",
            response.status
        );


        const contentType =
            response.headers.get(
                "content-type"
            ) || "";


        // =====================================================
        // CHECK JSON RESPONSE
        // =====================================================

        if (!contentType.includes("application/json")) {

            const text =
                await response.text();

            console.error(
                "Non-JSON response:",
                text
            );

            throw new Error(
                `Server returned ${response.status} instead of JSON.`
            );
        }


        const data =
            await response.json();


        console.log(
            "Staff tickets API response:",
            data
        );


        // =====================================================
        // API ERROR
        // =====================================================

        if (
            !response.ok ||
            data.status !== "success"
        ) {

            throw new Error(
                data.message ||
                `Unable to load tickets. Server status: ${response.status}`
            );

        }


        const tickets =
            Array.isArray(data.tickets)
                ? data.tickets
                : [];


        console.log(
            "Tickets assigned to staff:",
            tickets
        );


        // =====================================================
        // UPDATE DASHBOARD COUNTS
        // =====================================================

        updateStaffMetrics(tickets);


        // =====================================================
        // NO TICKETS
        // =====================================================

        if (tickets.length === 0) {

            tableBody.innerHTML = `
                <tr>

                    <td colspan="7">

                        <div class="staff-empty-state">

                            <div class="empty-state-icon">
                                ✓
                            </div>

                            <strong>
                                No tickets assigned
                            </strong>

                            <p>
                                There are currently no support
                                tickets assigned to you.
                            </p>

                        </div>

                    </td>

                </tr>
            `;

            return;
        }


        // =====================================================
        // DISPLAY TICKETS
        // =====================================================

        tableBody.innerHTML =
            tickets.map(ticket => {

                const status =
                    String(
                        ticket.status || ""
                    );


                const canRespond =
                    status.toLowerCase() !==
                    "resolved";


                const priority =
                    String(
                        ticket.priority || ""
                    );


                return `
                    <tr>

                        <td>

                            <a
                                href="/ticket/${ticket.id}"
                                class="ticket-link">

                                ${escapeHtml(
                                    ticket.ticket_number ||
                                    `#${ticket.id}`
                                )}

                            </a>

                        </td>


                        <td>

                            <strong>
                                ${escapeHtml(
                                    ticket.student_name ||
                                    "-"
                                )}
                            </strong>

                        </td>


                        <td>

                            <strong>
                                ${escapeHtml(
                                    ticket.subject ||
                                    "-"
                                )}
                            </strong>

                        </td>


                        <td>

                            <div class="ticket-description">

                                ${escapeHtml(
                                    ticket.description ||
                                    "-"
                                )}

                            </div>

                        </td>


                        <td>

                            <span
                                class="priority-badge priority-${priority.toLowerCase()}">

                                ${escapeHtml(
                                    ticket.priority ||
                                    "-"
                                )}

                            </span>

                        </td>


                        <td>

                            <span
                                class="status-badge status-${getStatusClass(status)}">

                                ${escapeHtml(
                                    status ||
                                    "-"
                                )}

                            </span>

                        </td>


                        <td>

                            <div class="staff-action-buttons">

                                <a
                                    href="/ticket/${ticket.id}"
                                    class="secondary-button">

                                    View

                                </a>


                                ${
                                    canRespond
                                        ? `
                                            <button
                                                type="button"
                                                class="primary-button small-button"
                                                onclick="respondToTicket(${ticket.id})">

                                                Respond

                                            </button>
                                          `
                                        : ""
                                }

                            </div>

                        </td>

                    </tr>
                `;

            }).join("");


    } catch (error) {

        console.error(
            "Staff ticket loading error:",
            error
        );


        // Reset counts if API fails
        updateStaffMetrics([]);


        tableBody.innerHTML = `
            <tr>

                <td colspan="7">

                    Unable to load assigned tickets.

                </td>

            </tr>
        `;


        if (message) {

            message.textContent =
                error.message ||
                "Unable to load assigned tickets.";

            message.className =
                "message error";

        }

    }

}


// =============================================================
// STAFF DASHBOARD METRICS
// =============================================================

function updateStaffMetrics(tickets) {

    // IMPORTANT:
    // These IDs now match the actual staff.html

    const assignedElement =
        document.getElementById(
            "staffAssignedCount"
        );


    const openElement =
        document.getElementById(
            "staffOpenCount"
        );


    const resolvedElement =
        document.getElementById(
            "staffResolvedCount"
        );


    // =========================================================
    // ASSIGNED TICKETS
    // =========================================================

    const assigned =
        tickets.length;


    // =========================================================
    // RESOLVED TICKETS
    // =========================================================

    const resolved =
        tickets.filter(ticket => {

            const status =
                String(
                    ticket.status || ""
                )
                    .trim()
                    .toLowerCase();

            return status === "resolved";

        }).length;


    // =========================================================
    // OPEN WORK
    // =========================================================
    //
    // Everything assigned to the staff member that is
    // not resolved.
    //
    // Example:
    //
    // 3 assigned
    // 1 resolved
    //
    // Open Work = 2
    // =========================================================

    const openWork =
        tickets.filter(ticket => {

            const status =
                String(
                    ticket.status || ""
                )
                    .trim()
                    .toLowerCase();

            return status !== "resolved";

        }).length;


    // =========================================================
    // UPDATE UI
    // =========================================================

    if (assignedElement) {

        assignedElement.textContent =
            assigned;

    }


    if (openElement) {

        openElement.textContent =
            openWork;

    }


    if (resolvedElement) {

        resolvedElement.textContent =
            resolved;

    }


    // Helpful debugging
    console.log(
        "Staff dashboard metrics:",
        {
            assigned: assigned,
            openWork: openWork,
            resolved: resolved
        }
    );

}


// =============================================================
// STATUS CLASS
// =============================================================

function getStatusClass(status) {

    if (!status) {
        return "default";
    }


    return String(status)
        .toLowerCase()
        .replace(/\s+/g, "-");

}


// =============================================================
// RESPOND TO TICKET
// =============================================================

async function respondToTicket(ticketId) {

    const userData =
        localStorage.getItem("user");


    if (!userData) {

        window.location.href = "/";
        return;

    }


    let user;

    try {

        user = JSON.parse(userData);

    } catch (error) {

        localStorage.removeItem("user");

        window.location.href = "/";

        return;

    }


    const comment =
        prompt(
            "Enter your response to the student:"
        );


    if (comment === null) {
        return;
    }


    const trimmedComment =
        comment.trim();


    if (!trimmedComment) {

        alert(
            "Please enter a response."
        );

        return;

    }


    try {

        // =====================================================
        // SEND STAFF RESPONSE
        // =====================================================

        const response =
            await fetch(
                `/api/tickets/${ticketId}/response`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Accept":
                            "application/json"
                    },

                    body: JSON.stringify({

                        staff_id:
                            user.id,

                        comment:
                            trimmedComment

                    })
                }
            );


        const contentType =
            response.headers.get(
                "content-type"
            ) || "";


        if (
            !contentType.includes(
                "application/json"
            )
        ) {

            throw new Error(
                `Server returned ${response.status} instead of JSON.`
            );

        }


        const data =
            await response.json();


        if (
            !response.ok ||
            data.status !== "success"
        ) {

            throw new Error(
                data.message ||
                "Unable to send response."
            );

        }


        // =====================================================
        // UPDATE STATUS
        // =====================================================

        const statusResponse =
            await fetch(
                `/api/tickets/${ticketId}/status`,
                {
                    method: "PATCH",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Accept":
                            "application/json"
                    },

                    body: JSON.stringify({

                        staff_id:
                            user.id,

                        status:
                            "Waiting for Student"

                    })
                }
            );


        const statusContentType =
            statusResponse.headers.get(
                "content-type"
            ) || "";


        if (
            !statusContentType.includes(
                "application/json"
            )
        ) {

            throw new Error(
                `Server returned ${statusResponse.status} instead of JSON.`
            );

        }


        const statusData =
            await statusResponse.json();


        if (
            !statusResponse.ok ||
            statusData.status !== "success"
        ) {

            throw new Error(
                statusData.message ||
                "Response sent, but ticket status could not be updated."
            );

        }


        alert(
            "Response sent. Ticket is now waiting for the student's response."
        );


        // Refresh dashboard
        await loadStaffTickets();


    } catch (error) {

        console.error(
            "Staff response error:",
            error
        );


        alert(
            error.message ||
            "Unable to send response."
        );

    }

}


// =============================================================
// LOGOUT
// =============================================================

function logout() {

    localStorage.removeItem("user");

    window.location.href = "/";

}


// =============================================================
// ESCAPE HTML
// =============================================================

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