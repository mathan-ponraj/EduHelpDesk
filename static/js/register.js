document.addEventListener("DOMContentLoaded", () => {

    const registerForm =
        document.getElementById("registerForm");

    const registerMessage =
        document.getElementById("registerMessage");

    const registerButton =
        document.getElementById("registerButton");

    if (!registerForm) {
        return;
    }

    registerForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const name =
            document.getElementById("name").value.trim();

        const email =
            document.getElementById("email").value.trim();

        const password =
            document.getElementById("password").value;

        const confirmPassword =
            document
                .getElementById("confirmPassword")
                .value;

        registerMessage.textContent = "";
        registerMessage.className = "message";

        if (
            !name ||
            !email ||
            !password ||
            !confirmPassword
        ) {

            registerMessage.textContent =
                "Please fill in all fields.";

            registerMessage.classList.add("error");

            return;
        }

        if (password.length < 6) {

            registerMessage.textContent =
                "Password must be at least 6 characters.";

            registerMessage.classList.add("error");

            return;
        }

        if (password !== confirmPassword) {

            registerMessage.textContent =
                "Passwords do not match.";

            registerMessage.classList.add("error");

            return;
        }

        registerButton.disabled = true;
        registerButton.textContent =
            "Creating Account...";

        registerMessage.textContent =
            "Creating your account...";

        try {

            const response =
                await fetch("/api/register", {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        name: name,
                        email: email,
                        password: password,
                        confirm_password:
                            confirmPassword
                    })
                });

            const data =
                await response.json();

            if (!response.ok ||
                data.status !== "success") {

                registerMessage.textContent =
                    data.message ||
                    "Registration failed.";

                registerMessage.classList.add(
                    "error"
                );

                return;
            }

            registerMessage.textContent =
                "Account created successfully. Redirecting to login...";

            registerMessage.classList.add(
                "success"
            );

            setTimeout(() => {

                window.location.href = "/";

            }, 1200);

        }
        catch (error) {

            console.error(
                "Registration error:",
                error
            );

            registerMessage.textContent =
                "Unable to connect to the server.";

            registerMessage.classList.add(
                "error"
            );

        }
        finally {

            registerButton.disabled = false;

            registerButton.textContent =
                "Create Account";
        }

    });

});