document.addEventListener("DOMContentLoaded", function () {

    /* ==========================================
       GET ELEMENTS
    ========================================== */

    const loginForm =
        document.getElementById("loginForm");

    const usernameInput =
        document.getElementById("username");

    const passwordInput =
        document.getElementById("password");

    const roleInput =
        document.getElementById("role");

    const studentRoleButton =
        document.getElementById("studentRoleButton");

    const adminRoleButton =
        document.getElementById("adminRoleButton");

    const passwordToggle =
        document.getElementById("passwordToggle");

    const forgotPassword =
        document.getElementById("forgotPassword");

    const loginMessage =
        document.getElementById("loginMessage");

    const loginButton =
        document.getElementById("loginButton");


    /* ==========================================
       CHECK LOGIN PAGE
    ========================================== */

    if (!loginForm) {

        console.log(
            "Login form not found. Script stopped."
        );

        return;
    }


    /* ==========================================
       DEFAULT ROLE
    ========================================== */

    let selectedRole = "student";

    if (roleInput) {

        roleInput.value = "student";

    }


    /* ==========================================
       STUDENT ROLE
    ========================================== */

    if (studentRoleButton) {

        studentRoleButton.addEventListener(
            "click",
            function () {

                selectedRole = "student";

                if (roleInput) {
                    roleInput.value = "student";
                }


                studentRoleButton.classList.add(
                    "active"
                );

                if (adminRoleButton) {

                    adminRoleButton.classList.remove(
                        "active"
                    );

                }


                clearMessage();

            }
        );

    }


    /* ==========================================
       ADMIN ROLE
    ========================================== */

    if (adminRoleButton) {

        adminRoleButton.addEventListener(
            "click",
            function () {

                selectedRole = "admin";

                if (roleInput) {
                    roleInput.value = "admin";
                }


                adminRoleButton.classList.add(
                    "active"
                );

                if (studentRoleButton) {

                    studentRoleButton.classList.remove(
                        "active"
                    );

                }


                clearMessage();

            }
        );

    }


    /* ==========================================
       SHOW / HIDE PASSWORD
    ========================================== */

    if (
        passwordToggle &&
        passwordInput
    ) {

        passwordToggle.addEventListener(
            "click",
            function () {

                if (
                    passwordInput.type ===
                    "password"
                ) {

                    passwordInput.type =
                        "text";

                    passwordToggle.textContent =
                        "Hide";

                }

                else {

                    passwordInput.type =
                        "password";

                    passwordToggle.textContent =
                        "Show";

                }

            }
        );

    }


    /* ==========================================
       FORGOT PASSWORD
    ========================================== */

    if (forgotPassword) {

        forgotPassword.addEventListener(
            "click",
            function () {

                showMessage(
                    "Please contact the administrator to reset your password.",
                    "error"
                );

            }
        );

    }


    /* ==========================================
       LOGIN FORM
    ========================================== */

    loginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            /* ==================================
               GET VALUES
            ================================== */

            const username =
                usernameInput.value.trim();

            const password =
                passwordInput.value.trim();


            /* ==================================
               VALIDATION
            ================================== */

            if (!username) {

                showMessage(
                    "Please enter your username.",
                    "error"
                );

                usernameInput.focus();

                return;
            }


            if (!password) {

                showMessage(
                    "Please enter your password.",
                    "error"
                );

                passwordInput.focus();

                return;
            }


            /* ==================================
               SELECT API
            ================================== */

            let loginURL;


            if (
                selectedRole ===
                "admin"
            ) {

                loginURL =
                    "/api/admin/login";

            }

            else {

                loginURL =
                    "/api/student/login";

            }


            /* ==================================
               BUTTON LOADING
            ================================== */

            if (loginButton) {

                loginButton.disabled = true;

                loginButton.textContent =
                    "Signing in...";

            }


            clearMessage();


            /* ==================================
               SEND REQUEST
            ================================== */

            try {

                console.log(
                    "Login request:",
                    loginURL
                );


                const response =
                    await fetch(
                        loginURL,
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({

                                    username:
                                        username,

                                    password:
                                        password

                                })
                        }
                    );


                /* ==================================
                   READ RESPONSE
                ================================== */

                const data =
                    await response.json();


                console.log(
                    "Login response:",
                    data
                );


                /* ==================================
                   LOGIN FAILED
                ================================== */

                if (!response.ok) {

                    showMessage(
                        data.message ||
                        "Invalid username or password.",
                        "error"
                    );

                    return;
                }


                /* ==================================
                   LOGIN SUCCESS
                ================================== */

                if (data.success) {

                    showMessage(
                        "Login successful. Opening dashboard...",
                        "success"
                    );


                    /* ==================================
                       ADMIN LOGIN
                    ================================== */

                    if (
                        selectedRole ===
                        "admin"
                    ) {

                        /*
                           ADMIN API RETURNS data.user
                        */

                        localStorage.setItem(
                            "adminUser",
                            JSON.stringify(
                                data.user
                            )
                        );


                        setTimeout(
                            function () {

                                window.location.href =
                                    "/admin-dashboard.html";

                            },
                            500
                        );

                    }


                    /* ==================================
                       STUDENT LOGIN
                    ================================== */

                    else {

                        /*
                           IMPORTANT FIX

                           Student API returns:

                           data.student

                           NOT:

                           data.user
                        */

                        if (
                            data.student
                        ) {

                            localStorage.setItem(
                                "studentUser",
                                JSON.stringify(
                                    data.student
                                )
                            );


                            console.log(
                                "Student data saved:",
                                data.student
                            );

                        }

                        else {

                            console.error(
                                "Student login successful but student data is missing:",
                                data
                            );

                            showMessage(
                                "Login successful, but student data was not received.",
                                "error"
                            );

                            return;
                        }


                        /* ==================================
                           OPEN STUDENT DASHBOARD
                        ================================== */

                        setTimeout(
                            function () {

                                window.location.href =
                                    "/student-dashboard.html";

                            },
                            500
                        );

                    }

                }

                else {

                    showMessage(
                        data.message ||
                        "Login failed.",
                        "error"
                    );

                }


            }

            catch (error) {

                console.error(
                    "LOGIN ERROR:",
                    error
                );


                showMessage(
                    "Unable to connect to the server. Please make sure Node.js is running.",
                    "error"
                );

            }


            finally {

                if (loginButton) {

                    loginButton.disabled =
                        false;

                    loginButton.textContent =
                        "Login";

                }

            }

        }
    );


    /* ==========================================
       SHOW MESSAGE
    ========================================== */

    function showMessage(
        message,
        type
    ) {

        if (!loginMessage) {

            return;

        }


        loginMessage.textContent =
            message;


        loginMessage.className =
            "login-message " +
            type;


        loginMessage.style.display =
            "block";

    }


    /* ==========================================
       CLEAR MESSAGE
    ========================================== */

    function clearMessage() {

        if (!loginMessage) {

            return;

        }


        loginMessage.textContent =
            "";


        loginMessage.className =
            "login-message";


        loginMessage.style.display =
            "none";

    }

});