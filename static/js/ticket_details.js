document.addEventListener("DOMContentLoaded", () => {

    // =========================================================
    // USER / AUTH
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

    // =========================================================
    // HEADER
    // =========================================================

    const userRole = document.getElementById("userRole");
    const studentName = document.getElementById("studentName");

    if (userRole) {
        userRole.textContent = user.role
            ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
            : "";
    }

    if (studentName) {
        studentName.textContent =
            `${user.name || ""} (${user.email || ""})`;
    }

    const logoutButton =
        document.getElementById("logoutButton");

    if (logoutButton) {
        logoutButton.addEventListener("click", () => {
            localStorage.removeItem("user");
            window.location.href = "/";
        });
    }

    // =========================================================
    // TICKET ID
    // =========================================================

    const pathParts = window.location.pathname
        .split("/")
        .filter(part => part !== "");

    const ticketId = pathParts[pathParts.length - 1];

    if (!ticketId || Number.isNaN(Number(ticketId))) {
        showError("Invalid ticket ID.");
        return;
    }

    // =========================================================
    // HELPERS
    // =========================================================

    function setText(id, value) {
        const element = document.getElementById(id);

        if (element) {
            element.textContent =
                value === null ||
                value === undefined ||
                value === ""
                    ? "-"
                    : value;
        }
    }

    function formatDate(value) {

        if (!value) {
            return "-";
        }

        try {
            const date = new Date(value);

            if (Number.isNaN(date.getTime())) {
                return value;
            }

            return date.toLocaleString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            });

        } catch (error) {
            return value;
        }
    }

    function escapeHtml(value) {

        if (value === null || value === undefined) {
            return "";
        }

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function showError(message) {

        const loadingMessage =
            document.getElementById("loadingMessage");

        const errorMessage =
            document.getElementById("errorMessage");

        const ticketContent =
            document.getElementById("ticketContent");

        if (loadingMessage) {
            loadingMessage.style.display = "none";
        }

        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.style.display = "block";
        }

        if (ticketContent) {
            ticketContent.style.display = "none";
        }

        console.error(message);
    }

    function showStaffMessage(message, type = "info") {

        const element =
            document.getElementById("staffActionMessage");

        if (!element) {
            console.log(message);
            return;
        }

        element.textContent = message;
        element.style.display = "block";

        element.classList.remove(
            "success",
            "error",
            "info"
        );

        element.classList.add(type);
    }

    function showResponseMessage(message, type = "info") {

        const element =
            document.getElementById("responseMessage");

        if (!element) {
            console.log(message);
            return;
        }

        element.textContent = message;
        element.style.display = "block";

        element.classList.remove(
            "success",
            "error",
            "info"
        );

        element.classList.add(type);
    }

    // =========================================================
    // LOAD TICKET
    // =========================================================

    async function loadTicket() {

        const loadingMessage =
            document.getElementById("loadingMessage");

        const errorMessage =
            document.getElementById("errorMessage");

        const ticketContent =
            document.getElementById("ticketContent");

        try {

            if (loadingMessage) {
                loadingMessage.style.display = "block";
            }

            if (errorMessage) {
                errorMessage.style.display = "none";
            }

            if (ticketContent) {
                ticketContent.style.display = "none";
            }

            const response =
                await fetch(`/api/tickets/${ticketId}`);

            const contentType =
                response.headers.get("content-type") || "";

            if (!contentType.includes("application/json")) {

                const serverText =
                    await response.text();

                console.error(
                    "Non-JSON ticket response:",
                    serverText
                );

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
                showError(
                    data.message ||
                    `Unable to load ticket. Server status: ${response.status}`
                );

                return;
            }

            const ticket = data.ticket;

            if (!ticket) {
                showError(
                    "Ticket information was not found."
                );

                return;
            }

            console.log(
                "Loaded ticket:",
                ticket
            );

            // -------------------------------------------------
            // ACCESS CONTROL
            // -------------------------------------------------

            if (
                user.role === "student" &&
                Number(ticket.student_id) !== Number(user.id)
            ) {
                showError(
                    "You do not have permission to view this ticket."
                );

                return;
            }

            if (
                user.role === "staff" &&
                ticket.assigned_to !== null &&
                ticket.assigned_to !== undefined &&
                Number(ticket.assigned_to) !== Number(user.id)
            ) {
                showError(
                    "This ticket is not assigned to you."
                );

                return;
            }

            // -------------------------------------------------
            // BASIC INFORMATION
            // -------------------------------------------------

            setText(
                "ticketNumber",
                ticket.ticket_number ||
                `#${ticket.id}`
            );

            setText(
                "ticketSubject",
                ticket.subject
            );

            setText(
                "ticketCategory",
                ticket.category
            );

            setText(
                "ticketPriority",
                ticket.priority
            );

            setText(
                "ticketStatus",
                ticket.status
            );

            setText(
                "ticketStudent",
                ticket.student_name ||
                ticket.student_email ||
                ticket.student_id
            );

            setText(
                "assignedStaff",
                ticket.assigned_staff ||
                ticket.assigned_staff_name ||
                ticket.staff_name ||
                "Unassigned"
            );

            setText(
                "ticketCreated",
                formatDate(ticket.created_at)
            );

            setText(
                "ticketUpdated",
                formatDate(ticket.updated_at)
            );

            setText(
                "ticketDescription",
                ticket.description
            );

            // -------------------------------------------------
            // PRIORITY BADGE
            // -------------------------------------------------

            const priorityElement =
                document.getElementById("ticketPriority");

            if (priorityElement) {

                priorityElement.className =
                    "status-badge";

                if (ticket.priority) {

                    priorityElement.classList.add(
                        "priority-" +
                        String(ticket.priority).toLowerCase()
                    );
                }
            }

            // -------------------------------------------------
            // STATUS BADGE
            // -------------------------------------------------

            const statusElement =
                document.getElementById("ticketStatus");

            if (statusElement) {

                statusElement.className =
                    "status-badge " +
                    getStatusClass(ticket.status);
            }

            // -------------------------------------------------
            // OTHER SECTIONS
            // -------------------------------------------------

            loadResolution(ticket);

            await loadSLA();

            await loadActivity();

            setupResponseSection(ticket);

            setupStaffActions(ticket);

            setupBackButton();

            if (loadingMessage) {
                loadingMessage.style.display = "none";
            }

            if (ticketContent) {
                ticketContent.style.display = "block";
            }

        } catch (error) {

            console.error(
                "Ticket loading error:",
                error
            );

            showError(
                error.message ||
                "Unable to load ticket."
            );
        }
    }

    // =========================================================
    // STATUS CLASS
    // =========================================================

    function getStatusClass(status) {

        if (!status) {
            return "";
        }

        const normalizedStatus =
            String(status).toLowerCase();

        if (normalizedStatus === "new") {
            return "status-new";
        }

        if (normalizedStatus === "assigned") {
            return "status-assigned";
        }

        if (normalizedStatus === "open") {
            return "status-open";
        }

        if (normalizedStatus === "in progress") {
            return "status-in-progress";
        }

        if (
            normalizedStatus === "waiting for student" ||
            normalizedStatus === "waiting"
        ) {
            return "status-waiting";
        }

        if (normalizedStatus === "resolved") {
            return "status-resolved";
        }

        if (normalizedStatus === "closed") {
            return "status-closed";
        }

        return "";
    }

    // =========================================================
    // RESOLUTION
    // =========================================================

    function loadResolution(ticket) {

        const resolutionSection =
            document.getElementById("resolutionSection");

        const resolutionContent =
            document.getElementById("resolutionContent");

        if (!resolutionSection || !resolutionContent) {
            return;
        }

        resolutionSection.style.display = "block";

        if (
            ticket.status === "Resolved" ||
            ticket.resolved_at ||
            ticket.resolution_comment
        ) {

            resolutionContent.innerHTML = "";

            const resolvedBy =
                document.createElement("p");

            resolvedBy.innerHTML =
                `<strong>Resolved By:</strong> ` +
                escapeHtml(
                    ticket.resolved_by_name || "-"
                );

            const resolvedAt =
                document.createElement("p");

            resolvedAt.innerHTML =
                `<strong>Resolved At:</strong> ` +
                escapeHtml(
                    formatDate(ticket.resolved_at)
                );

            const comment =
                document.createElement("p");

            comment.innerHTML =
                `<strong>Resolution Comment:</strong> ` +
                escapeHtml(
                    ticket.resolution_comment || "-"
                );

            resolutionContent.appendChild(
                resolvedBy
            );

            resolutionContent.appendChild(
                resolvedAt
            );

            resolutionContent.appendChild(
                comment
            );

        } else {

            resolutionContent.innerHTML =
                `<p class="muted-text">
                    This ticket has not been resolved yet.
                </p>`;
        }
    }

    // =========================================================
    // SLA
    // =========================================================

    async function loadSLA() {

        try {

            const response =
                await fetch(
                    `/api/tickets/${ticketId}/sla`
                );

            const contentType =
                response.headers.get("content-type") || "";

            if (!contentType.includes("application/json")) {
                return;
            }

            const data =
                await response.json();

            if (
                !response.ok ||
                data.status !== "success"
            ) {
                return;
            }

            const sla =
                data.sla || data;

            setText(
                "slaStatus",
                sla.sla_status ||
                sla.status ||
                "-"
            );

            setText(
                "ticketAge",
                sla.ticket_age ||
                sla.age ||
                "-"
            );

            setText(
                "slaDue",
                formatDate(
                    sla.sla_due ||
                    sla.due_at
                )
            );

            setText(
                "slaRemaining",
                sla.sla_remaining ||
                sla.remaining ||
                "-"
            );

            setText(
                "pendingAction",
                sla.pending_action ||
                "-"
            );

        } catch (error) {

            console.error(
                "SLA loading error:",
                error
            );
        }
    }

    // =========================================================
    // ACTIVITY HISTORY
    // =========================================================

    async function loadActivity() {

        const activityHistory =
            document.getElementById(
                "activityHistory"
            );

        if (!activityHistory) {
            return;
        }

        try {

            const response =
                await fetch(
                    `/api/tickets/${ticketId}/activity`
                );

            const contentType =
                response.headers.get("content-type") || "";

            if (!contentType.includes("application/json")) {

                activityHistory.innerHTML =
                    `<p class="muted-text">
                        Unable to load activity history.
                    </p>`;

                return;
            }

            const data =
                await response.json();

            if (
                !response.ok ||
                data.status !== "success"
            ) {

                activityHistory.innerHTML =
                    `<p class="muted-text">
                        Unable to load activity history.
                    </p>`;

                return;
            }

            const activities =
                data.activities ||
                data.activity ||
                [];

            if (!activities.length) {

                activityHistory.innerHTML =
                    `<p class="muted-text">
                        No activity recorded yet.
                    </p>`;

                return;
            }

            activityHistory.innerHTML = "";

            activities.forEach(activity => {

                const item =
                    document.createElement("div");

                item.className =
                    "activity-item";

                const action =
                    activity.action ||
                    activity.activity ||
                    activity.description ||
                    "Activity";

                const actor =
                    activity.actor_name ||
                    activity.staff_name ||
                    activity.user_name ||
                    "";

                const createdAt =
                    activity.created_at ||
                    activity.timestamp;

                // IMPORTANT:
                // Display response comment when available.
                const comment =
                    activity.comment ||
                    activity.response ||
                    activity.message ||
                    "";

                item.innerHTML = `
                    <div class="activity-content">

                        <strong>
                            ${escapeHtml(action)}
                        </strong>

                        ${
                            actor
                                ? `<span class="activity-actor">
                                    by ${escapeHtml(actor)}
                                   </span>`
                                : ""
                        }

                        ${
                            comment
                                ? `<p class="activity-comment">
                                    ${escapeHtml(comment)}
                                   </p>`
                                : ""
                        }

                        <div class="activity-time">
                            ${escapeHtml(
                                formatDate(createdAt)
                            )}
                        </div>

                    </div>
                `;

                activityHistory.appendChild(item);
            });

        } catch (error) {

            console.error(
                "Activity loading error:",
                error
            );

            activityHistory.innerHTML =
                `<p class="muted-text">
                    Unable to load activity history.
                </p>`;
        }
    }

    // =========================================================
    // RESPONSE SECTION
    // =========================================================

    function setupResponseSection(ticket) {

        const responseSection =
            document.getElementById(
                "responseSection"
            );

        const responseSectionTitle =
            document.getElementById(
                "responseSectionTitle"
            );

        const responseSectionDescription =
            document.getElementById(
                "responseSectionDescription"
            );

        const responseForm =
            document.getElementById(
                "responseForm"
            );

        const responseComment =
            document.getElementById(
                "responseComment"
            );

        const responseButton =
            document.getElementById(
                "responseButton"
            );

        if (!responseSection) {
            return;
        }

        // -------------------------------------------------
        // STUDENT
        // -------------------------------------------------

        if (user.role === "student") {

            responseSection.style.display =
                "block";

            if (responseSectionTitle) {
                responseSectionTitle.textContent =
                    "Respond to Support";
            }

            if (responseSectionDescription) {
                responseSectionDescription.textContent =
                    "Add additional information or respond to the support team.";
            }

            // Student can respond only when waiting.
            if (
                String(ticket.status || "")
                    .toLowerCase()
                    !== "waiting for student"
            ) {

                if (responseForm) {
                    responseForm.style.display =
                        "none";
                }

                if (responseSectionDescription) {
                    responseSectionDescription.textContent =
                        "Student can respond only when the ticket is waiting for student.";
                }

                return;
            }

            if (responseForm) {

                responseForm.style.display =
                    "block";

                responseForm.onsubmit =
                    async event => {

                        event.preventDefault();

                        if (!responseComment) {
                            return;
                        }

                        const message =
                            responseComment.value.trim();

                        if (!message) {

                            showResponseMessage(
                                "Please enter a response.",
                                "error"
                            );

                            return;
                        }

                        responseButton.disabled =
                            true;

                        responseButton.textContent =
                            "Sending...";

                        try {

                            const response =
                                await fetch(
                                    `/api/tickets/${ticketId}/student-response`,
                                    {
                                        method: "POST",

                                        headers: {
                                            "Content-Type":
                                                "application/json",
                                            "Accept":
                                                "application/json"
                                        },

                                        body:
                                            JSON.stringify({
                                                student_id:
                                                    user.id,
                                                comment:
                                                    message
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

                            showResponseMessage(
                                "Response submitted successfully.",
                                "success"
                            );

                            responseComment.value = "";

                            setTimeout(() => {
                                window.location.reload();
                            }, 700);

                        } catch (error) {

                            console.error(
                                "Student response error:",
                                error
                            );

                            showResponseMessage(
                                error.message ||
                                "Unable to send response.",
                                "error"
                            );

                        } finally {

                            responseButton.disabled =
                                false;

                            responseButton.textContent =
                                "Send Response";
                        }
                    };
            }

            return;
        }

        // -------------------------------------------------
        // STAFF
        // -------------------------------------------------

        if (user.role === "staff") {

            responseSection.style.display =
                "block";

            if (responseSectionTitle) {
                responseSectionTitle.textContent =
                    "Staff Response";
            }

            if (responseSectionDescription) {
                responseSectionDescription.textContent =
                    "Send a response to the student.";
            }

            if (responseForm) {

                responseForm.style.display =
                    "block";

                responseForm.onsubmit =
                    async event => {

                        event.preventDefault();

                        if (!responseComment) {
                            return;
                        }

                        const message =
                            responseComment.value.trim();

                        if (!message) {

                            showResponseMessage(
                                "Please enter a response.",
                                "error"
                            );

                            return;
                        }

                        responseButton.disabled =
                            true;

                        responseButton.textContent =
                            "Sending...";

                        try {

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

                                        body:
                                            JSON.stringify({
                                                staff_id:
                                                    user.id,
                                                response:
                                                    message
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

                            showResponseMessage(
                                "Response sent successfully.",
                                "success"
                            );

                            responseComment.value = "";

                            setTimeout(() => {
                                window.location.reload();
                            }, 700);

                        } catch (error) {

                            console.error(
                                "Staff response error:",
                                error
                            );

                            showResponseMessage(
                                error.message ||
                                "Unable to send response.",
                                "error"
                            );

                        } finally {

                            responseButton.disabled =
                                false;

                            responseButton.textContent =
                                "Send Response";
                        }
                    };
            }

            return;
        }

        responseSection.style.display =
            "none";
    }

    // =========================================================
    // STAFF ACTIONS
    // =========================================================

    function setupStaffActions(ticket) {

        const section =
            document.getElementById(
                "staffActionsSection"
            );

        if (!section) {
            return;
        }

        if (user.role !== "staff") {

            section.style.display =
                "none";

            return;
        }

        section.style.display =
            "block";

        const startButton =
            document.getElementById(
                "startProgressButton"
            );

        const waitingButton =
            document.getElementById(
                "waitingButton"
            );

        const resolveButton =
            document.getElementById(
                "resolveButton"
            );

        const resolutionFormContainer =
            document.getElementById(
                "resolutionFormContainer"
            );

        const resolutionComment =
            document.getElementById(
                "resolutionComment"
            );

        const confirmResolveButton =
            document.getElementById(
                "confirmResolveButton"
            );

        // -------------------------------------------------
        // RESOLVED
        // -------------------------------------------------

        if (ticket.status === "Resolved") {

            if (startButton) {
                startButton.style.display = "none";
            }

            if (waitingButton) {
                waitingButton.style.display = "none";
            }

            if (resolveButton) {
                resolveButton.style.display = "none";
            }

            if (resolutionFormContainer) {
                resolutionFormContainer.style.display =
                    "none";
            }

            return;
        }

        // -------------------------------------------------
        // STATUS-SPECIFIC BUTTONS
        // -------------------------------------------------

        if (startButton) {

            startButton.style.display =
                ticket.status === "Assigned"
                    ? "inline-block"
                    : "none";

            startButton.onclick = () => {
                updateTicketStatus("In Progress");
            };
        }

        if (waitingButton) {

            waitingButton.style.display =
                ticket.status === "In Progress"
                    ? "inline-block"
                    : "none";

            waitingButton.onclick = () => {
                updateTicketStatus(
                    "Waiting for Student"
                );
            };
        }

        if (resolveButton) {

            resolveButton.style.display =
                (
                    ticket.status === "In Progress" ||
                    ticket.status === "Waiting for Student"
                )
                    ? "inline-block"
                    : "none";

            resolveButton.onclick = () => {

                if (resolutionFormContainer) {
                    resolutionFormContainer.style.display =
                        "block";
                }

                if (resolutionComment) {
                    resolutionComment.focus();
                }
            };
        }

        // -------------------------------------------------
        // CONFIRM RESOLUTION
        // -------------------------------------------------

        if (confirmResolveButton) {

            confirmResolveButton.onclick =
                async () => {

                    const comment =
                        document.getElementById(
                            "resolutionComment"
                        );

                    const resolutionText =
                        comment
                            ? comment.value.trim()
                            : "";

                    if (!resolutionText) {

                        showStaffMessage(
                            "Resolution comment is required.",
                            "error"
                        );

                        if (comment) {
                            comment.focus();
                        }

                        return;
                    }

                    confirmResolveButton.disabled =
                        true;

                    const originalText =
                        confirmResolveButton.textContent;

                    confirmResolveButton.textContent =
                        "Resolving...";

                    try {

                        await updateTicketStatus(
                            "Resolved",
                            resolutionText
                        );

                    } finally {

                        confirmResolveButton.disabled =
                            false;

                        confirmResolveButton.textContent =
                            originalText ||
                            "Confirm Resolution";
                    }
                };
        }
    }

    // =========================================================
    // UPDATE TICKET STATUS
    // =========================================================

    async function updateTicketStatus(
        status,
        comment = ""
    ) {

        showStaffMessage(
            "Updating ticket...",
            "info"
        );

        try {

            const payload = {
                staff_id: user.id,
                status: status
            };

            if (status === "Resolved") {

                payload.resolution_comment =
                    comment;

            } else if (comment) {

                payload.comment =
                    comment;
            }

            const response =
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

                        body:
                            JSON.stringify(payload)
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

                showStaffMessage(
                    data.message ||
                    `Unable to update ticket. Server status: ${response.status}`,
                    "error"
                );

                return;
            }

            showStaffMessage(
                "Ticket updated successfully.",
                "success"
            );

            setTimeout(() => {
                window.location.reload();
            }, 700);

        } catch (error) {

            console.error(
                "Status update error:",
                error
            );

            showStaffMessage(
                error.message ||
                "Unable to connect to the server.",
                "error"
            );
        }
    }

    // =========================================================
    // BACK BUTTON
    // =========================================================

    function setupBackButton() {

        const backButton =
            document.getElementById(
                "backButton"
            );

        if (!backButton) {
            return;
        }

        backButton.onclick = () => {

            if (user.role === "student") {

                window.location.href =
                    "/student";

            } else if (user.role === "staff") {

                window.location.href =
                    "/staff";

            } else if (user.role === "manager") {

                window.location.href =
                    "/manager";

            } else {

                window.history.back();
            }
        };
    }

    // =========================================================
    // START
    // =========================================================

    loadTicket();

});