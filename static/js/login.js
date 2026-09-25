document.addEventListener("DOMContentLoaded", () => {

    const loginForm =
        document.getElementById("loginForm");

    const loginMessage =
        document.getElementById("loginMessage");

    if (!loginForm) {
        return;
    }

    loginForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const email =
            document.getElementById("email").value.trim();

        const password =
            document.getElementById("password").value;

        if (!email || !password) {

            loginMessage.textContent =
                "Please enter your email and password.";

            loginMessage.className =
                "message error";

            return;
        }

        loginMessage.textContent =
            "Logging in...";

        loginMessage.className =
            "message";

        try {

            const response =
                await fetch("/api/login", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        email: email,
                        password: password
                    })
                });

            const data =
                await response.json();

            if (!response.ok ||
                data.status !== "success") {

                loginMessage.textContent =
                    data.message ||
                    "Login failed.";

                loginMessage.className =
                    "message error";

                return;
            }

            localStorage.setItem(
                "user",
                JSON.stringify(data.user)
            );

            loginMessage.textContent =
                "Login successful.";

            loginMessage.className =
                "message success";

            if (data.user.role === "student") {

                window.location.href =
                    "/student";

            }
            else if (data.user.role === "staff") {

                window.location.href =
                    "/staff";

            }
            else if (data.user.role === "manager") {

                window.location.href =
                    "/manager";

            }
            else {

                loginMessage.textContent =
                    "Unknown user role.";

                loginMessage.className =
                    "message error";
            }

        }
        catch (error) {

            console.error(
                "Login error:",
                error
            );

            loginMessage.textContent =
                "Unable to connect to the server.";

            loginMessage.className =
                "message error";
        }

    });

});