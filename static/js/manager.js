document.addEventListener("DOMContentLoaded", () => {

    const userData =
        localStorage.getItem("user");

    if (!userData) {
        window.location.href = "/";
        return;
    }

    const user =
        JSON.parse(userData);

    if (user.role !== "manager") {
        window.location.href = "/";
        return;
    }

    const managerName =
        document.getElementById("managerName");

    if (managerName) {
        managerName.textContent =
            `${user.name} (${user.email})`;
    }

    const logoutButton =
        document.getElementById("logoutButton");

    if (logoutButton) {
        logoutButton.addEventListener(
            "click",
            logout
        );
    }

    let selectedTicketId = null;
    let staffList = [];


    async function loadDashboard() {

        try {

            const response =
                await fetch(
                    "/api/manager/dashboard"
                );

            const data =
                await response.json();

            if (!response.ok ||
                data.status !== "success") {

                alert(
                    data.message ||
                    "Unable to load dashboard."
                );

                return;
            }

            const dashboard =
                data.dashboard || {};

            setText(
                "totalTickets",
                dashboard.total_tickets
            );

            setText(
                "resolvedTickets",
                dashboard.resolved
            );

            setText(
                "newTickets",
                dashboard.new
            );

            setText(
                "assignedTickets",
                dashboard.assigned
            );

            setText(
                "inProgressTickets",
                dashboard.in_progress
            );

            setText(
                "waitingTickets",
                dashboard.waiting_for_student
            );

            setText(
                "unassignedTickets",
                dashboard.unassigned_open
            );

            setText(
                "urgentTickets",
                Number(
                    dashboard.high_priority_open || 0
                ) +
                Number(
                    dashboard.critical_open || 0
                )
            );

            setText(
                "slaBreached",
                dashboard.sla_breached
            );

            setText(
                "slaWithin",
                dashboard.sla_within
            );

            setText(
                "slaMet",
                dashboard.sla_met
            );

            setText(
                "averageResolution",
                dashboard.average_resolution_hours !== null &&
                dashboard.average_resolution_hours !== undefined
                    ? `${dashboard.average_resolution_hours} hrs`
                    : "N/A"
            );

            const openCount =
                Number(
                    dashboard.total_tickets || 0
                ) -
                Number(
                    dashboard.resolved || 0
                );

            setText(
                "openTickets",
                openCount
            );


            staffList =
                data.staff_workload || [];

            loadStaffWorkload(
                staffList
            );

            await loadTicketAssignments();

            loadEscalationQueue(
                data.escalation_queue || []
            );

        }
        catch (error) {

            console.error(
                "Manager dashboard error:",
                error
            );

            alert(
                "Unable to connect to the server."
            );
        }
    }


    function setText(id, value) {

        const element =
            document.getElementById(id);

        if (element) {
            element.textContent =
                value ?? 0;
        }
    }


    function loadStaffWorkload(staffList) {

        const body =
            document.getElementById(
                "staffWorkloadBody"
            );

        if (!body) {
            return;
        }

        body.innerHTML = "";

        if (staffList.length === 0) {

            body.innerHTML = `
                <tr>
                    <td colspan="4">
                        No staff workload data.
                    </td>
                </tr>
            `;

            return;
        }

        staffList.forEach(staff => {

            const row =
                document.createElement("tr");

            row.innerHTML = `
                <td>
                    ${escapeHtml(
                        staff.staff_name
                    )}
                </td>

                <td>
                    ${staff.assigned_tickets}
                </td>

                <td>
                    ${staff.open_tickets}
                </td>

                <td>
                    ${staff.resolved_tickets}
                </td>
            `;

            body.appendChild(row);
        });
    }


    async function loadTicketAssignments() {

        const body =
            document.getElementById(
                "ticketAssignmentBody"
            );

        const message =
            document.getElementById(
                "assignmentMessage"
            );

        if (!body) {
            return;
        }

        if (message) {
            message.textContent =
                "Loading tickets...";
        }

        try {

            const response =
                await fetch(
                    "/api/tickets"
                );

            const data =
                await response.json();

            if (!response.ok ||
                data.status !== "success") {

                if (message) {
                    message.textContent =
                        data.message ||
                        "Unable to load tickets.";
                }

                return;
            }

            const tickets =
                data.tickets || [];

            body.innerHTML = "";

            if (tickets.length === 0) {

                body.innerHTML = `
                    <tr>
                        <td colspan="7">
                            No tickets available.
                        </td>
                    </tr>
                `;

                if (message) {
                    message.textContent = "";
                }

                return;
            }

            tickets.forEach(ticket => {

                const row =
                    document.createElement("tr");

                const isResolved =
                    ticket.status === "Resolved";

                const staffOptions =
                    buildStaffOptions(
                        ticket.assigned_to
                    );

                row.innerHTML = `

                    <td>
                        <a
                            href="/ticket/${ticket.id}"
                            class="manager-ticket-link">

                            ${escapeHtml(
                                ticket.ticket_number
                            )}

                        </a>
                    </td>

                    <td>
                        ${escapeHtml(
                            ticket.student_name
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            ticket.subject
                        )}
                    </td>

                    <td>

                        <span
                            class="priority-badge priority-${String(
                                ticket.priority
                            ).toLowerCase()}">

                            ${escapeHtml(
                                ticket.priority
                            )}

                        </span>

                    </td>

                    <td>
                        <span class="status-badge">
                            ${escapeHtml(
                                ticket.status
                            )}
                        </span>
                    </td>

                    <td>
                        ${
                            ticket.assigned_staff
                                ? escapeHtml(
                                    ticket.assigned_staff
                                )
                                : "Unassigned"
                        }
                    </td>

                    <td>

                        ${
                            isResolved

                                ? `
                                    <span class="muted-text">
                                        Resolved
                                    </span>
                                  `

                                : `
                                    <div class="assignment-control">

                                        <select
                                            class="staff-select"
                                            data-ticket-id="${ticket.id}">

                                            ${staffOptions}

                                        </select>

                                        <button
                                            class="primary-button small-button assign-button"
                                            data-ticket-id="${ticket.id}">

                                            Assign

                                        </button>

                                    </div>
                                  `
                        }

                    </td>
                `;

                body.appendChild(row);
            });


            document
                .querySelectorAll(".assign-button")
                .forEach(button => {

                    button.addEventListener(
                        "click",
                        () => {

                            assignTicket(
                                button.dataset.ticketId
                            );

                        }
                    );

                });

            if (message) {
                message.textContent = "";
            }

        }
        catch (error) {

            console.error(
                "Ticket assignment error:",
                error
            );

            if (message) {
                message.textContent =
                    "Unable to connect to the server.";
            }
        }
    }


    function buildStaffOptions(
        assignedStaffId
    ) {

        if (staffList.length === 0) {

            return `
                <option value="">
                    No staff available
                </option>
            `;
        }

        let options = `
            <option value="">
                Select Staff
            </option>
        `;

        staffList.forEach(staff => {

            const selected =
                String(staff.staff_id) ===
                String(assignedStaffId)
                    ? "selected"
                    : "";

            options += `
                <option
                    value="${staff.staff_id}"
                    ${selected}>

                    ${escapeHtml(
                        staff.staff_name
                    )}

                </option>
            `;
        });

        return options;
    }


    async function assignTicket(ticketId) {

        const select =
            document.querySelector(
                `.staff-select[data-ticket-id="${ticketId}"]`
            );

        const message =
            document.getElementById(
                "assignmentMessage"
            );

        if (!select ||
            !select.value) {

            if (message) {
                message.textContent =
                    "Please select a staff member.";
            }

            return;
        }

        const staffId =
            Number(select.value);

        if (message) {
            message.textContent =
                "Assigning ticket...";
        }

        try {

            const response =
                await fetch(
                    `/api/tickets/${ticketId}/assign`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            staff_id: staffId
                        })
                    }
                );

            const data =
                await response.json();

            if (!response.ok ||
                data.status !== "success") {

                if (message) {
                    message.textContent =
                        data.message ||
                        "Unable to assign ticket.";
                }

                return;
            }

            if (message) {
                message.textContent =
                    "Ticket assigned successfully.";
            }

            await loadDashboard();

        }
        catch (error) {

            console.error(
                "Assignment error:",
                error
            );

            if (message) {
                message.textContent =
                    "Unable to connect to the server.";
            }
        }
    }


    function loadEscalationQueue(queue) {

        const body =
            document.getElementById(
                "escalationQueueBody"
            );

        if (!body) {
            return;
        }

        body.innerHTML = "";

        if (queue.length === 0) {

            body.innerHTML = `
                <tr>
                    <td colspan="6">
                        No tickets currently require escalation.
                    </td>
                </tr>
            `;

            return;
        }

        queue.forEach(ticket => {

            const row =
                document.createElement("tr");

            row.innerHTML = `

                <td>
                    <a
                        href="/ticket/${ticket.id}"
                        class="manager-ticket-link">

                        ${escapeHtml(
                            ticket.ticket_number
                        )}

                    </a>
                </td>

                <td>
                    ${escapeHtml(
                        ticket.subject
                    )}
                </td>

                <td>

                    <span
                        class="priority-badge priority-${String(
                            ticket.priority
                        ).toLowerCase()}">

                        ${escapeHtml(
                            ticket.priority
                        )}

                    </span>

                </td>

                <td>
                    <span class="status-badge">
                        ${escapeHtml(
                            ticket.status
                        )}
                    </span>
                </td>

                <td>
                    ${
                        ticket.assigned_staff
                            ? escapeHtml(
                                ticket.assigned_staff
                            )
                            : "Unassigned"
                    }
                </td>

                <td>

                    <button
                        class="primary-button small-button escalate-select-button"
                        data-id="${ticket.id}"
                        data-number="${escapeHtml(
                            ticket.ticket_number
                        )}">

                        Escalate

                    </button>

                </td>
            `;

            body.appendChild(row);
        });


        document
            .querySelectorAll(
                ".escalate-select-button"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        selectTicketForEscalation(
                            button.dataset.id,
                            button.dataset.number
                        );

                    }
                );

            });
    }


    function selectTicketForEscalation(
        ticketId,
        ticketNumber
    ) {

        selectedTicketId =
            ticketId;

        const selectedTicket =
            document.getElementById(
                "selectedEscalationTicket"
            );

        if (selectedTicket) {
            selectedTicket.textContent =
                ticketNumber;
        }

        const section =
            document.getElementById(
                "escalationSection"
            );

        if (section) {
            section.style.display =
                "block";
        }

        const comment =
            document.getElementById(
                "escalationComment"
            );

        if (comment) {
            comment.value = "";
        }

        const message =
            document.getElementById(
                "escalationMessage"
            );

        if (message) {
            message.textContent = "";
        }

        if (section) {
            section.scrollIntoView({
                behavior: "smooth"
            });
        }
    }


    const escalateButton =
        document.getElementById(
            "escalateButton"
        );

    if (escalateButton) {

        escalateButton.addEventListener(
            "click",
            async () => {

                if (!selectedTicketId) {
                    return;
                }

                const comment =
                    document
                        .getElementById(
                            "escalationComment"
                        )
                        .value
                        .trim();

                const message =
                    document.getElementById(
                        "escalationMessage"
                    );

                if (!comment) {

                    message.textContent =
                        "Escalation comment is required.";

                    return;
                }

                message.textContent =
                    "Escalating ticket...";

                try {

                    const response =
                        await fetch(
                            `/api/tickets/${selectedTicketId}/escalate`,
                            {
                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body: JSON.stringify({
                                    manager_id:
                                        user.id,
                                    comment:
                                        comment
                                })
                            }
                        );

                    const data =
                        await response.json();

                    if (!response.ok ||
                        data.status !== "success") {

                        message.textContent =
                            data.message ||
                            "Unable to escalate ticket.";

                        return;
                    }

                    message.textContent =
                        "Ticket escalated successfully.";

                    document
                        .getElementById(
                            "escalationComment"
                        )
                        .value = "";

                    selectedTicketId =
                        null;

                    await loadDashboard();

                }
                catch (error) {

                    console.error(
                        "Escalation error:",
                        error
                    );

                    message.textContent =
                        "Unable to connect to the server.";
                }

            }
        );
    }


    const refreshDashboard =
        document.getElementById(
            "refreshDashboard"
        );

    if (refreshDashboard) {
        refreshDashboard.addEventListener(
            "click",
            loadDashboard
        );
    }


    const refreshTickets =
        document.getElementById(
            "refreshTickets"
        );

    if (refreshTickets) {
        refreshTickets.addEventListener(
            "click",
            loadDashboard
        );
    }


    function logout() {

        localStorage.removeItem("user");

        window.location.href = "/";
    }


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


    loadDashboard();

});