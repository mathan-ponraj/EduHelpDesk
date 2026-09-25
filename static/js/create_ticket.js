document.addEventListener("DOMContentLoaded", () => {

    const userData = localStorage.getItem("user");

    if (!userData) {
        window.location.href = "/";
        return;
    }

    const user = JSON.parse(userData);

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
        logoutButton.addEventListener("click", () => {
            localStorage.removeItem("user");
            window.location.href = "/";
        });
    }

    const form =
        document.getElementById("createTicketForm");

    const message =
        document.getElementById("ticketMessage");

    if (!form) {
        return;
    }

    form.addEventListener("submit", async (event) => {

        event.preventDefault();

        const category =
            document.getElementById("category").value;

        const subject =
            document.getElementById("subject").value.trim();

        const description =
            document.getElementById("description").value.trim();

        const priority =
            document.getElementById("priority").value;

        if (!category || !subject || !description || !priority) {
            message.textContent =
                "Please complete all required fields.";
            message.className = "message error";
            return;
        }

        message.textContent =
            "Creating ticket...";
        message.className = "message";

        try {

            const response =
                await fetch("/api/tickets", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        student_id: user.id,
                        category: category,
                        subject: subject,
                        description: description,
                        priority: priority
                    })
                });

            const data =
                await response.json();

            if (!response.ok ||
                data.status !== "success") {

                message.textContent =
                    data.message ||
                    "Unable to create ticket.";

                message.className =
                    "message error";

                return;
            }

            message.textContent =
                `Ticket ${data.ticket.ticket_number} created successfully.`;

            message.className =
                "message success";

            form.reset();

            setTimeout(() => {

                window.location.href =
                    `/ticket/${data.ticket.id}`;

            }, 800);

        }
        catch (error) {

            console.error(
                "Create ticket error:",
                error
            );

            message.textContent =
                "Unable to connect to the server.";

            message.className =
                "message error";
        }

    });

});