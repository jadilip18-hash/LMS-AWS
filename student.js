document.addEventListener("DOMContentLoaded", () => {

    /* =========================================================
       STUDENT LOGIN DATA
    ========================================================= */

    let studentData = null;

    try {
        const storedStudent =
            localStorage.getItem("studentUser");

        if (
            storedStudent &&
            storedStudent !== "undefined" &&
            storedStudent !== "null"
        ) {
            studentData = JSON.parse(storedStudent);
        }
    } catch (error) {
        console.error("Invalid student login data:", error);
        studentData = null;
    }

    if (!studentData) {
        window.location.href = "index.html";
        return;
    }


    /* =========================================================
       HELPERS
    ========================================================= */

    const $ = id => document.getElementById(id);

    const esc = value => {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };


    function formatDate(value) {

        if (!value) {
            return "-";
        }

        const date = new Date(value);

        if (isNaN(date.getTime())) {
            return String(value);
        }

        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }


    function getStatusClass(status) {

        const value = String(status || "Pending")
            .trim()
            .toLowerCase();

        if (
            value === "resolved" ||
            value === "completed" ||
            value === "approved" ||
            value === "reviewed"
        ) {
            return "resolved";
        }

        if (
            value === "in progress" ||
            value === "active" ||
            value === "today" ||
            value === "submitted"
        ) {
            return "active-status";
        }

        return "pending";
    }


    async function api(url, options = {}) {

        const response = await fetch(url, {
            cache: "no-store",
            ...options
        });

        let data = {};

        try {
            data = await response.json();
        } catch (error) {
            data = {};
        }

        if (!response.ok) {
            throw new Error(
                data.message ||
                data.error ||
                `HTTP ${response.status}`
            );
        }

        return data;
    }


    function showEmpty(container, icon, title, message) {

        if (!container) {
            return;
        }

        container.innerHTML = `
            <div class="content-placeholder">

                <div class="placeholder-icon">
                    ${icon}
                </div>

                <h3>
                    ${esc(title)}
                </h3>

                <p>
                    ${esc(message)}
                </p>

            </div>
        `;
    }


    /* =========================================================
       STUDENT DISPLAY
    ========================================================= */

    function displayStudent(data) {

        const name =
            data.name ||
            data.username ||
            "Student";

        const studentId =
            data.student_id ||
            data.studentId ||
            "-";

        const email =
            data.email ||
            "-";

        const course =
            data.course ||
            "-";

        const username =
            data.username ||
            "-";

        const status =
            data.status ||
            "Active";


        /* Header */

        if ($("studentName")) {
            $("studentName").textContent = name;
        }

        if ($("welcomeStudentName")) {
            $("welcomeStudentName").textContent =
                `Hello, ${name}! 👋`;
        }


        /* Avatar */

        const firstLetter =
            name.charAt(0).toUpperCase() || "S";

        if ($("studentAvatar")) {
            $("studentAvatar").textContent =
                firstLetter;
        }

        if ($("profileStudentAvatar")) {
            $("profileStudentAvatar").textContent =
                firstLetter;
        }


        /* Profile */

        if ($("profileStudentId")) {
            $("profileStudentId").textContent =
                studentId;
        }

        if ($("profileStudentName")) {
            $("profileStudentName").textContent =
                name;
        }

        if ($("profileUsername")) {
            $("profileUsername").textContent =
                username;
        }

        if ($("profileEmail")) {
            $("profileEmail").textContent =
                email;
        }

        if ($("profileCourse")) {
            $("profileCourse").textContent =
                course;
        }

        if ($("profileStatus")) {
            $("profileStatus").textContent =
                status;
        }


        /* Alternative IDs */

        [
            "studentNameDisplay",
            "dashboardStudentName"
        ].forEach(id => {
            if ($(id)) {
                $(id).textContent = name;
            }
        });


        [
            "studentId",
            "studentIdDisplay",
            "dashboardStudentId"
        ].forEach(id => {
            if ($(id)) {
                $(id).textContent = studentId;
            }
        });


        [
            "studentEmail",
            "studentEmailDisplay"
        ].forEach(id => {
            if ($(id)) {
                $(id).textContent = email;
            }
        });


        [
            "studentCourse",
            "studentCourseDisplay"
        ].forEach(id => {
            if ($(id)) {
                $(id).textContent = course;
            }
        });
    }


    /* =========================================================
       REFRESH STUDENT FROM SERVER
    ========================================================= */

    async function refreshStudentData() {

        if (!studentData.student_id) {
            displayStudent(studentData);
            return;
        }

        try {

            const data =
                await api(
                    `/api/students/${encodeURIComponent(
                        studentData.student_id
                    )}`
                );

            if (
                data.success &&
                data.student
            ) {

                studentData = {
                    ...studentData,
                    ...data.student
                };

                localStorage.setItem(
                    "studentUser",
                    JSON.stringify(studentData)
                );

                displayStudent(studentData);
            }

        } catch (error) {

            console.error(
                "Student refresh error:",
                error
            );

            displayStudent(studentData);
        }
    }


    /* =========================================================
       NAVIGATION
    ========================================================= */

    function setupNavigation() {

        const navItems =
            document.querySelectorAll(
                ".sidebar-nav .nav-item"
            );

        const bottomItems =
            document.querySelectorAll(
                ".sidebar-bottom .bottom-item:not(.logout)"
            );


        function showSection(sectionId) {

            const sections =
                document.querySelectorAll(
                    "main .content-section"
                );

            sections.forEach(section => {
                section.style.display = "none";
            });


            const target = $(sectionId);

            if (target) {

                target.style.display = "block";

                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });
            }


            document
                .querySelectorAll(
                    ".sidebar-nav .nav-item, .sidebar-bottom .bottom-item"
                )
                .forEach(item => {
                    item.classList.remove("active");
                });


            const matchingNav =
                document.querySelector(
                    `.sidebar-nav .nav-item[href="#${sectionId}"]`
                );

            if (matchingNav) {
                matchingNav.classList.add("active");
            }


            if (sectionId === "dashboard") {
                loadEvents();
                loadTasks();
                loadMyTaskSubmissions();
                loadAssessments();
            }


            if (sectionId === "events") {
                loadEvents();
            }


            if (sectionId === "recordings") {
                loadRecordings();
            }


            if (sectionId === "tasks") {
                loadTasks();
                loadMyTaskSubmissions();
            }


            if (sectionId === "assessments") {
                loadAssessments();
            }


            if (sectionId === "placements") {
                loadPlacements();
            }


            if (sectionId === "queries") {
                loadMyQueries();
            }


            if (sectionId === "profile") {
                displayStudent(studentData);
            }
        }


        navItems.forEach(item => {

            item.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    const href =
                        item.getAttribute("href");

                    if (!href) {
                        return;
                    }

                    const sectionId =
                        href.replace("#", "");

                    showSection(sectionId);
                }
            );
        });


        bottomItems.forEach(item => {

            item.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    const href =
                        item.getAttribute("href");

                    if (!href) {
                        return;
                    }

                    const sectionId =
                        href.replace("#", "");

                    showSection(sectionId);
                }
            );
        });


        showSection("dashboard");
    }


    /* =========================================================
       EVENTS
    ========================================================= */

    function getEventStatus(dateValue) {

        if (!dateValue) {
            return "Upcoming";
        }

        const eventDate = new Date(dateValue);
        const today = new Date();

        if (isNaN(eventDate.getTime())) {
            return "Upcoming";
        }

        eventDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        if (eventDate.getTime() < today.getTime()) {
            return "Completed";
        }

        if (eventDate.getTime() === today.getTime()) {
            return "Today";
        }

        return "Upcoming";
    }


    async function loadEvents() {

        try {

            const data =
                await api("/api/events");

            const events =
                Array.isArray(data.events)
                    ? data.events
                    : [];


            const sortedEvents =
                [...events].sort((a, b) => {

                    const dateA =
                        new Date(a.date || 0).getTime();

                    const dateB =
                        new Date(b.date || 0).getTime();

                    return dateA - dateB;
                });


            const eventList =
                document.querySelector(
                    "#events .event-list"
                );

            if (!eventList) {
                return;
            }


            if (!sortedEvents.length) {

                showEmpty(
                    eventList,
                    "📅",
                    "No Upcoming Events",
                    "Events created by the admin will appear here."
                );

            } else {

                eventList.innerHTML =
                    sortedEvents.map(event => {

                        const status =
                            getEventStatus(event.date);

                        return `
                            <div class="dashboard-card event-item">

                                <div class="card-header">

                                    <div>

                                        <h3>
                                            ${esc(
                                                event.title ||
                                                "Event"
                                            )}
                                        </h3>

                                        <p>
                                            ${esc(
                                                formatDate(
                                                    event.date
                                                )
                                            )}

                                            ${
                                                event.time
                                                    ? ` • ${esc(event.time)}`
                                                    : ""
                                            }
                                        </p>

                                    </div>

                                    <span class="status ${getStatusClass(status)}">
                                        ${esc(status)}
                                    </span>

                                </div>

                                ${
                                    event.type
                                        ? `
                                            <p>
                                                <strong>Type:</strong>
                                                ${esc(event.type)}
                                            </p>
                                        `
                                        : ""
                                }

                                ${
                                    event.description
                                        ? `
                                            <p>
                                                ${esc(event.description)}
                                            </p>
                                        `
                                        : ""
                                }

                                ${
                                    event.media_path
                                        ? `
                                            <a
                                                href="${esc(event.media_path)}"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                class="primary-button"
                                            >
                                                View Media
                                            </a>
                                        `
                                        : ""
                                }

                            </div>
                        `;
                    }).join("");
            }


            const upcomingCount =
                events.filter(event => {

                    const status =
                        getEventStatus(event.date);

                    return (
                        status === "Upcoming" ||
                        status === "Today"
                    );

                }).length;


            if ($("upcomingEvents")) {
                $("upcomingEvents").textContent =
                    upcomingCount;
            }


        } catch (error) {

            console.error(
                "Events loading error:",
                error
            );
        }
    }


    /* =========================================================
       RECORDINGS
    ========================================================= */

    async function loadRecordings() {

        try {

            const data =
                await api("/api/recordings");

            const recordings =
                Array.isArray(data.recordings)
                    ? data.recordings
                    : [];


            const recordingList =
                document.querySelector(
                    "#recordings .recording-list"
                );

            if (!recordingList) {
                return;
            }


            if (!recordings.length) {

                showEmpty(
                    recordingList,
                    "▶",
                    "No Recordings",
                    "Available class recordings will appear here."
                );

                return;
            }


            recordingList.innerHTML =
                recordings.map(recording => `

                    <div class="dashboard-card recording-item">

                        <div class="card-header">

                            <div>

                                <h3>
                                    ${esc(
                                        recording.title ||
                                        "Recording"
                                    )}
                                </h3>

                                <p>
                                    ${esc(
                                        recording.course ||
                                        ""
                                    )}
                                </p>

                            </div>

                            <span>
                                ▶
                            </span>

                        </div>

                        ${
                            recording.description
                                ? `
                                    <p>
                                        ${esc(
                                            recording.description
                                        )}
                                    </p>
                                `
                                : ""
                        }

                        ${
                            recording.file_path
                                ? `
                                    <a
                                        href="${esc(recording.file_path)}"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        class="primary-button"
                                    >
                                        Open Recording
                                    </a>
                                `
                                : ""
                        }

                    </div>

                `).join("");


        } catch (error) {

            console.error(
                "Recordings loading error:",
                error
            );
        }
    }


    /* =========================================================
       TASKS
    ========================================================= */

    let availableStudentTasks = [];


    async function loadTasks() {

        try {

            const taskData =
                await api("/api/tasks");

            const tasks =
                Array.isArray(taskData.tasks)
                    ? taskData.tasks
                    : [];


            availableStudentTasks = tasks;


            const submissionData =
                await api(
                    `/api/task-submissions/student/${encodeURIComponent(
                        studentData.student_id
                    )}`
                );

            const submissions =
                Array.isArray(
                    submissionData.submissions
                )
                    ? submissionData.submissions
                    : [];


            /*
                Multiple submissions are allowed.

                Group submissions by task_id.
            */

            const submissionMap = new Map();

            submissions.forEach(submission => {

                const taskId =
                    String(
                        submission.task_id
                    );

                if (!submissionMap.has(taskId)) {
                    submissionMap.set(taskId, []);
                }

                submissionMap
                    .get(taskId)
                    .push(submission);
            });


            const updatedTasks =
                tasks.map(task => {

                    const taskSubmissions =
                        submissionMap.get(
                            String(task.id)
                        ) || [];


                    if (!taskSubmissions.length) {

                        return {
                            ...task,
                            status: "Pending"
                        };
                    }


                    /*
                        Sort by latest created/submitted record.
                    */

                    taskSubmissions.sort((a, b) => {

                        const dateA =
                            new Date(
                                a.created_at ||
                                a.submitted_at ||
                                0
                            ).getTime();

                        const dateB =
                            new Date(
                                b.created_at ||
                                b.submitted_at ||
                                0
                            ).getTime();

                        return dateA - dateB;
                    });


                    const latestSubmission =
                        taskSubmissions[
                            taskSubmissions.length - 1
                        ];


                    const status =
                        String(
                            latestSubmission.status ||
                            latestSubmission.submission_status ||
                            "Submitted"
                        )
                        .trim()
                        .toLowerCase();


                    const review =
                        String(
                            latestSubmission.review ||
                            latestSubmission.reply ||
                            ""
                        ).trim();


                    if (
                        status === "reviewed" ||
                        status === "completed" ||
                        status === "approved" ||
                        review !== ""
                    ) {

                        return {
                            ...task,
                            status: "Completed"
                        };
                    }


                    if (status === "in progress") {

                        return {
                            ...task,
                            status: "In Progress"
                        };
                    }


                    return {
                        ...task,
                        status: "Submitted"
                    };
                });


            updateTaskChart(updatedTasks);


        } catch (error) {

            console.error(
                "Tasks loading error:",
                error
            );

        }
    }


    /* =========================================================
       TASK SUBMISSION FORM
    ========================================================= */

   /* =========================================================
   TASK SUBMISSION FORM
========================================================= */

function setupTaskSubmissionForm() {

    const form =
        $("studentTaskSubmissionForm");

    if (!form) {
        console.error(
            "Task submission form not found."
        );
        return;
    }

    /*
        IMPORTANT:
        HTML form-ல் இருக்கும் old inline onsubmit
        handler-ஐ remove செய்கிறோம்.

        JavaScript addEventListener மட்டும்
        submission-ஐ handle செய்யும்.
    */
    form.removeAttribute("onsubmit");


    const statusBox =
        $("studentTaskSubmissionStatus");

    const submitButton =
        $("studentTaskSubmitButton");


    /*
        Prevent attaching the same listener
        more than once.
    */

    if (
        form.dataset.listenerAttached ===
        "true"
    ) {
        return;
    }

    form.dataset.listenerAttached = "true";


    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();
            event.stopPropagation();
            /* =====================================================
               GET FORM VALUES
            ===================================================== */

            const subject =
                $("studentTaskSubject")
                    ?.value
                    .trim() || "";


            const college =
                $("studentTaskCollege")
                    ?.value
                    .trim() || "";


            const eventName =
                $("studentTaskEventName")
                    ?.value
                    .trim() || "";


            const taskName =
                $("studentTaskName")
                    ?.value
                    .trim() || "";


            const category =
                $("studentTaskCategory")
                    ?.value
                    .trim() || "";


            const githubLink =
                $("studentGithubLink")
                    ?.value
                    .trim() || "";


            /* =====================================================
               STUDENT ID CHECK
            ===================================================== */

            if (!studentData.student_id) {

                if (statusBox) {

                    statusBox.textContent =
                        "Student ID is missing. Please login again.";

                    statusBox.style.color =
                        "#dc3545";
                }

                return;
            }


            /* =====================================================
               REQUIRED FIELD CHECK
            ===================================================== */

            if (
                !subject ||
                !college ||
                !eventName ||
                !taskName ||
                !category ||
                !githubLink
            ) {

                if (statusBox) {

                    statusBox.textContent =
                        "Please fill in all task submission fields.";

                    statusBox.style.color =
                        "#dc3545";
                }

                return;
            }


            /* =====================================================
               GITHUB URL VALIDATION
            ===================================================== */

            try {

                const githubUrl =
                    new URL(githubLink);

                const hostname =
                    githubUrl.hostname.toLowerCase();


                if (
                    hostname !== "github.com" &&
                    !hostname.endsWith(".github.com")
                ) {

                    throw new Error(
                        "Please enter a valid GitHub repository URL."
                    );
                }

            } catch (error) {

                if (statusBox) {

                    statusBox.textContent =
                        error.message ||
                        "Please enter a valid GitHub repository URL.";

                    statusBox.style.color =
                        "#dc3545";
                }

                return;
            }


            /* =====================================================
               DISABLE BUTTON WHILE SUBMITTING
            ===================================================== */

            if (submitButton) {

                submitButton.disabled = true;

                submitButton.dataset.originalText =
                    submitButton.textContent;

                submitButton.textContent =
                    "Submitting...";
            }


            /* =====================================================
               SUBMIT TASK
            ===================================================== */

            try {

                /*
                    IMPORTANT:

                    Every submit creates a NEW row.

                    No duplicate prevention is done here.

                    So:

                    Task 1 -> row 1
                    Task 2 -> row 2
                    Task 3 -> row 3
                    Task 4 -> row 4
                    ...
                */

                const response =
                    await fetch(
                        "/api/task-submissions",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            credentials: "include",

                            body:
                                JSON.stringify({

                                    /*
                                        Use selected task ID
                                        if available.

                                        Otherwise use 1.
                                    */

                                    task_id:
                                        window.selectedTaskId || 1,

                                    student_id:
                                        studentData.student_id,

                                    subject:
                                        subject,

                                    college:
                                        college,

                                    event_name:
                                        eventName,

                                    task_name:
                                        taskName,

                                    category:
                                        category,

                                    github_link:
                                        githubLink
                                })
                        }
                    );


                /* =================================================
                   READ RESPONSE
                ================================================= */

                let data = {};

                try {

                    data =
                        await response.json();

                } catch (error) {

                    data = {};
                }


                /* =================================================
                   ERROR
                ================================================= */

                if (
                    !response.ok ||
                    !data.success
                ) {

                    throw new Error(
                        data.message ||
                        "Unable to submit task."
                    );
                }


                /* =================================================
                   SUCCESS MESSAGE
                ================================================= */

                if (statusBox) {

                    statusBox.textContent =
                        "✅ Task Submitted Successfully!";

                    statusBox.style.color =
                        "#28a745";

                    statusBox.style.fontWeight =
                        "700";
                }


                /* =================================================
                   RESET FORM

                   This allows the same student to submit
                   another task immediately.
                ================================================= */

                form.reset();


                /* =================================================
                   KEEP TASK SECTION OPEN
                ================================================= */

                if ($("dashboard")) {

                    $("dashboard").style.display =
                        "none";
                }

                if ($("tasks")) {

                    $("tasks").style.display =
                        "block";
                }


                /* =================================================
                   REFRESH STUDENT SUBMISSION HISTORY

                   The new submission will appear immediately.
                ================================================= */

                await loadMyTaskSubmissions();


                /* =================================================
                   REFRESH TASK STATUS / CHART
                ================================================= */

                await loadTasks();


            } catch (error) {

                console.error(
                    "Task submission error:",
                    error
                );


                if (statusBox) {

                    statusBox.textContent =
                        error.message ||
                        "Unable to submit task.";

                    statusBox.style.color =
                        "#dc3545";

                    statusBox.style.fontWeight =
                        "400";
                }


            } finally {

                /* =================================================
                   ENABLE BUTTON AGAIN

                   VERY IMPORTANT FOR MULTIPLE SUBMISSIONS.
                ================================================= */

                if (submitButton) {

                    submitButton.disabled =
                        false;

                    submitButton.textContent =
                        submitButton.dataset.originalText ||
                        "Submit Task";
                }
            }
        }
    );
}
    /* =========================================================
       TASK SUBMISSION HISTORY
    ========================================================= */

    async function loadMyTaskSubmissions() {

        const history =
            $("studentTaskSubmissionHistory");


        if (
            !history ||
            !studentData.student_id
        ) {
            return;
        }


        try {

            const data =
                await api(
                    `/api/task-submissions/student/${encodeURIComponent(
                        studentData.student_id
                    )}`
                );


            const submissions =
                Array.isArray(
                    data.submissions
                )
                    ? data.submissions
                    : [];


            /*
                Update donut chart.
            */

            updateTaskSubmissionChart(
                submissions
            );


            /*
                Pending count.
            */

            const pendingCount =
                submissions.filter(
                    submission => {

                        const status =
                            String(
                                submission.status ||
                                submission.submission_status ||
                                ""
                            )
                            .trim()
                            .toLowerCase();

                        return (
                            status === "pending" ||
                            status === "in progress"
                        );
                    }
                ).length;


            if ($("pendingTasks")) {

                $("pendingTasks").textContent =
                    pendingCount;
            }


            /*
                No submissions.
            */

            if (!submissions.length) {

                showEmpty(
                    history,
                    "📝",
                    "No Task Submissions Yet",
                    "Your submitted tasks will appear here."
                );

                return;
            }


            /*
                Show every submission.

                IMPORTANT:
                Do NOT group by task.

                One student can have many submissions.
            */

            history.innerHTML =
                submissions.map(submission => {

                    const status =
                        submission.status ||
                        submission.submission_status ||
                        "Submitted";


                    /*
                        Admin can save review in either
                        review or reply.
                    */

                    const review =
                        String(
                            submission.review ||
                            submission.reply ||
                            submission.admin_reply ||
                            ""
                        ).trim();


                    const hasMarks =
                        submission.marks !== null &&
                        submission.marks !== undefined &&
                        String(
                            submission.marks
                        ) !== "";


                    return `

                        <div class="dashboard-card task-submission-item">

                            <div class="card-header">

                                <div>

                                    <h3>
                                        ${esc(
                                            submission.task_name ||
                                            "Task"
                                        )}
                                    </h3>

                                    <p>
                                        ${esc(
                                            submission.category ||
                                            "General"
                                        )}
                                    </p>

                                </div>


                                <span class="status ${getStatusClass(status)}">
                                    ${esc(status)}
                                </span>

                            </div>


                            <p>
                                <strong>Subject:</strong>
                                ${esc(
                                    submission.subject ||
                                    "-"
                                )}
                            </p>


                            <p>
                                <strong>College:</strong>
                                ${esc(
                                    submission.college ||
                                    "-"
                                )}
                            </p>


                            <p>
                                <strong>Event:</strong>
                                ${esc(
                                    submission.event_name ||
                                    "-"
                                )}
                            </p>


                            <p>
                                <strong>GitHub:</strong>

                                ${
                                    submission.github_link
                                        ? `
                                            <a
                                                href="${esc(
                                                    submission.github_link
                                                )}"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                Open Repository
                                            </a>
                                        `
                                        : "-"
                                }

                            </p>


                            <p>
                                <strong>Status:</strong>
                                ${esc(status)}
                            </p>


                            ${
                                hasMarks
                                    ? `
                                        <div style="
                                            margin-top:15px;
                                            padding:14px;
                                            background:#eef7ee;
                                            border-left:4px solid #28a745;
                                            border-radius:8px;
                                        ">

                                            <strong>
                                                Task Mark:
                                            </strong>

                                            ${esc(
                                                submission.marks
                                            )} / 100

                                        </div>
                                    `
                                    : ""
                            }


                            ${
                                review
                                    ? `
                                        <div style="
                                            margin-top:15px;
                                            padding:14px;
                                            background:#eef2ff;
                                            border-left:4px solid #4f46e5;
                                            border-radius:8px;
                                        ">

                                            <strong>
                                                Admin Review
                                            </strong>

                                            <p style="
                                                margin:8px 0 0;
                                                line-height:1.6;
                                            ">
                                                ${esc(review)}
                                            </p>

                                        </div>
                                    `
                                    : ""
                            }


                            ${
                                submission.reviewed_at
                                    ? `
                                        <p style="
                                            margin-top:12px;
                                            font-size:13px;
                                            opacity:0.7;
                                        ">
                                            Reviewed on:
                                            ${esc(
                                                formatDate(
                                                    submission.reviewed_at
                                                )
                                            )}
                                        </p>
                                    `
                                    : ""
                            }

                        </div>

                    `;

                }).join("");


        } catch (error) {

            console.error(
                "Task submission history error:",
                error
            );


            history.innerHTML = `

                <div class="content-placeholder">

                    <div class="placeholder-icon">
                        ⚠️
                    </div>

                    <h3>
                        Unable to Load Submissions
                    </h3>

                    <p>
                        ${esc(
                            error.message ||
                            "Unable to load task submissions."
                        )}
                    </p>

                </div>

            `;
        }
    }


    /* =========================================================
       ASSESSMENTS
    ========================================================= */

    let assessmentChartInstance = null;


    async function loadAssessments() {

        try {

            const data =
                await api(
                    `/api/assessments/student/${encodeURIComponent(
                        studentData.student_id
                    )}`
                );


            const assessments =
                Array.isArray(
                    data.assessments
                )
                    ? data.assessments
                    : [];


            if ($("assessmentCount")) {
                $("assessmentCount").textContent =
                    assessments.length;
            }


            renderAssessmentChart(
                assessments
            );


            const list =
                document.querySelector(
                    "#assessments .assessment-list"
                );


            if (!list) {
                return;
            }


            if (!assessments.length) {

                showEmpty(
                    list,
                    "▣",
                    "No Assessments",
                    "Assessments created by the admin will appear here."
                );

                return;
            }


            list.innerHTML =
                assessments.map(
                    assessment => `

                        <div class="dashboard-card">

                            <div class="card-header">

                                <div>

                                    <h3>
                                        ${esc(
                                            assessment.title ||
                                            assessment.name ||
                                            "Assessment"
                                        )}
                                    </h3>

                                    <p>
                                        ${esc(
                                            assessment.subject ||
                                            assessment.course ||
                                            "General"
                                        )}
                                    </p>

                                </div>

                                ${
                                    assessment.marks !== undefined &&
                                    assessment.marks !== null
                                        ? `
                                            <span class="status resolved">
                                                ${esc(
                                                    assessment.marks
                                                )}
                                            </span>
                                        `
                                        : ""
                                }

                            </div>


                            ${
                                assessment.description
                                    ? `
                                        <p>
                                            ${esc(
                                                assessment.description
                                            )}
                                        </p>
                                    `
                                    : ""
                            }

                        </div>

                    `
                ).join("");


        } catch (error) {

            console.error(
                "Assessments loading error:",
                error
            );

            if ($("assessmentCount")) {
                $("assessmentCount").textContent =
                    "0";
            }
        }
    }


    /* =========================================================
       ASSESSMENT CHART
    ========================================================= */

    function renderAssessmentChart(assessments) {

        const canvas =
            $("assessmentChart");

        const empty =
            $("assessmentChartEmpty");


        if (!canvas) {
            return;
        }


        if (typeof Chart === "undefined") {

            console.error(
                "Chart.js is not loaded."
            );

            return;
        }


        const valid =
            assessments.filter(
                item =>
                    item.marks !== undefined &&
                    item.marks !== null &&
                    !isNaN(
                        Number(item.marks)
                    )
            );


        if (!valid.length) {

            if (assessmentChartInstance) {
                assessmentChartInstance.destroy();
                assessmentChartInstance = null;
            }

            if (empty) {
                empty.style.display = "flex";
            }

            return;
        }


        if (empty) {
            empty.style.display = "none";
        }


        if (assessmentChartInstance) {
            assessmentChartInstance.destroy();
        }


        assessmentChartInstance =
            new Chart(
                canvas.getContext("2d"),
                {
                    type: "bar",

                    data: {

                        labels:
                            valid.map(
                                item =>
                                    item.subject ||
                                    item.course ||
                                    item.title ||
                                    "Assessment"
                            ),

                        datasets: [
                            {
                                label:
                                    "Marks",

                                data:
                                    valid.map(
                                        item =>
                                            Number(
                                                item.marks
                                            )
                                    ),

                                borderWidth:
                                    1
                            }
                        ]
                    },

                    options: {

                        responsive:
                            true,

                        maintainAspectRatio:
                            false,

                        scales: {

                            y: {

                                beginAtZero:
                                    true,

                                suggestedMax:
                                    100
                            }
                        }
                    }
                }
            );
    }


    /* =========================================================
       TASK DONUT CHART
    ========================================================= */

    let taskChartInstance = null;


    function updateTaskChart(taskList = []) {

        const canvas =
            document.getElementById(
                "taskChart"
            );

        const empty =
            document.getElementById(
                "taskChartEmpty"
            );


        if (
            !canvas ||
            typeof Chart === "undefined"
        ) {
            return;
        }


        if (
            !Array.isArray(taskList) ||
            taskList.length === 0
        ) {

            if (taskChartInstance) {

                taskChartInstance.destroy();

                taskChartInstance = null;
            }

            if (empty) {
                empty.style.display = "flex";
            }

            return;
        }


        if (empty) {
            empty.style.display = "none";
        }


        const counts = {

            Pending: 0,

            Submitted: 0,

            "In Progress": 0,

            Completed: 0
        };


        taskList.forEach(task => {

            const status =
                String(
                    task.status ||
                    "Pending"
                )
                .trim()
                .toLowerCase();


            switch (status) {

                case "completed":
                case "reviewed":
                case "approved":

                    counts.Completed++;

                    break;


                case "submitted":

                    counts.Submitted++;

                    break;


                case "in progress":

                    counts["In Progress"]++;

                    break;


                default:

                    counts.Pending++;
            }
        });


        if (taskChartInstance) {
            taskChartInstance.destroy();
        }


        taskChartInstance =
            new Chart(
                canvas.getContext("2d"),
                {

                    type: "doughnut",

                    data: {

                        labels: [
                            "Pending",
                            "Submitted",
                            "In Progress",
                            "Completed"
                        ],

                        datasets: [

                            {

                                data: [

                                    counts.Pending,

                                    counts.Submitted,

                                    counts["In Progress"],

                                    counts.Completed

                                ],

                                backgroundColor: [

                                    "#2563EB",

                                    "#EAB308",

                                    "#F97316",

                                    "#16A34A"

                                ],

                                borderColor:
                                    "#FFFFFF",

                                borderWidth:
                                    3,

                                hoverOffset:
                                    10
                            }
                        ]
                    },


                    options: {

                        responsive:
                            true,

                        maintainAspectRatio:
                            false,

                        cutout:
                            "68%",


                        plugins: {

                            legend: {

                                position:
                                    "bottom",

                                labels: {

                                    usePointStyle:
                                        true,

                                    pointStyle:
                                        "circle",

                                    padding:
                                        18,

                                    font: {

                                        size:
                                            13,

                                        weight:
                                            "600"
                                    }
                                }
                            },


                            tooltip: {

                                callbacks: {

                                    label:
                                        function(context) {

                                            return `${context.label}: ${context.raw} Tasks`;
                                        }
                                }
                            }
                        }
                    }
                }
            );
    }


    /* =========================================================
       TASK SUBMISSION -> DONUT CHART
    ========================================================= */

    function updateTaskSubmissionChart(
        submissions = []
    ) {

        if (!Array.isArray(submissions)) {

            updateTaskChart([]);

            return;
        }


        const taskStatusData =
            submissions.map(submission => {

                const review =
                    String(
                        submission.review ||
                        submission.reply ||
                        submission.admin_reply ||
                        ""
                    ).trim();


                let status =
                    String(
                        submission.status ||
                        submission.submission_status ||
                        "Pending"
                    )
                    .trim()
                    .toLowerCase();


                /*
                    Admin evaluation means completed.
                */

                if (
                    status === "reviewed" ||
                    status === "completed" ||
                    status === "approved" ||
                    review !== ""
                ) {

                    status = "completed";
                }


                return {
                    status: status
                };
            });


        updateTaskChart(
            taskStatusData
        );
    }


    /* =========================================================
       PLACEMENTS
    ========================================================= */

    async function loadPlacements() {

        const list =
            document.querySelector(
                "#placements .placement-list"
            );


        if (!list) {
            return;
        }


        try {

            const data =
                await api(
                    "/api/placements"
                );


            const placements =
                Array.isArray(
                    data.placements
                )
                    ? data.placements
                    : [];


            if (!placements.length) {

                showEmpty(
                    list,
                    "💼",
                    "Placement Support",
                    "Placement opportunities created by the admin will appear here."
                );

                return;
            }


            list.innerHTML =
                placements.map(
                    placement => `

                        <div class="dashboard-card">

                            <div class="card-header">

                                <div>

                                    <h3>
                                        ${esc(
                                            placement.title ||
                                            placement.company ||
                                            "Placement Opportunity"
                                        )}
                                    </h3>

                                    <p>
                                        ${esc(
                                            placement.company ||
                                            ""
                                        )}
                                    </p>

                                </div>

                            </div>


                            ${
                                placement.description
                                    ? `
                                        <p>
                                            ${esc(
                                                placement.description
                                            )}
                                        </p>
                                    `
                                    : ""
                            }

                        </div>

                    `
                ).join("");


        } catch (error) {

            console.error(
                "Placement loading error:",
                error
            );
        }
    }


    /* =========================================================
       QUERIES
    ========================================================= */

    function setupQueryForm() {

        const form =
            $("studentQueryForm");


        if (!form) {
            return;
        }


        if (
            form.dataset.listenerAttached ===
            "true"
        ) {
            return;
        }


        form.dataset.listenerAttached =
            "true";


        form.addEventListener(
            "submit",
            async event => {

                event.preventDefault();


                const subject =
                    $("studentQuerySubject")
                        ?.value
                        .trim() || "";


                const message =
                    $("studentQueryMessage")
                        ?.value
                        .trim() || "";


                const status =
                    $("studentQueryStatus");


                if (
                    !studentData.student_id
                ) {

                    if (status) {

                        status.textContent =
                            "Student ID is missing.";

                        status.style.color =
                            "#dc3545";
                    }

                    return;
                }


                if (
                    !subject ||
                    !message
                ) {

                    if (status) {

                        status.textContent =
                            "Please fill in all fields.";

                        status.style.color =
                            "#dc3545";
                    }

                    return;
                }


                try {

                    await api(
                        "/api/queries",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({

                                    student_id:
                                        studentData.student_id,

                                    subject:
                                        subject,

                                    message:
                                        message
                                })
                        }
                    );


                    if (status) {

                        status.textContent =
                            "Query submitted successfully!";

                        status.style.color =
                            "#28a745";
                    }


                    form.reset();


                    await loadMyQueries();


                } catch (error) {

                    console.error(
                        "Query submission error:",
                        error
                    );


                    if (status) {

                        status.textContent =
                            error.message ||
                            "Unable to submit query.";

                        status.style.color =
                            "#dc3545";
                    }
                }
            }
        );
    }


    async function loadMyQueries() {

        const history =
            $("studentQueryHistory");


        if (
            !history ||
            !studentData.student_id
        ) {
            return;
        }


        try {

            const data =
                await api(
                    `/api/queries/student/${encodeURIComponent(
                        studentData.student_id
                    )}`
                );


            const queries =
                Array.isArray(
                    data.queries
                )
                    ? data.queries
                    : [];


            if (!queries.length) {

                showEmpty(
                    history,
                    "💬",
                    "No Queries Yet",
                    "Your previous queries will appear here."
                );

                return;
            }


            history.innerHTML =
                queries.map(
                    query => `

                        <div class="dashboard-card">

                            <div class="card-header">

                                <div>

                                    <h3>
                                        ${esc(
                                            query.subject ||
                                            "Query"
                                        )}
                                    </h3>

                                    <p>
                                        ${esc(
                                            formatDate(
                                                query.created_at
                                            )
                                        )}
                                    </p>

                                </div>


                                <span class="status ${getStatusClass(
                                    query.status
                                )}">

                                    ${esc(
                                        query.status ||
                                        "Pending"
                                    )}

                                </span>

                            </div>


                            <p>
                                ${esc(
                                    query.message ||
                                    ""
                                )}
                            </p>


                            ${
                                query.admin_reply ||
                                query.reply
                                    ? `
                                        <div style="
                                            margin-top:15px;
                                            padding:15px;
                                            border-radius:10px;
                                            background:#eef7ee;
                                            border-left:4px solid #28a745;
                                        ">

                                            <strong>
                                                Admin Reply
                                            </strong>

                                            <p style="
                                                margin:8px 0 0;
                                                line-height:1.6;
                                            ">
                                                ${esc(
                                                    query.admin_reply ||
                                                    query.reply
                                                )}
                                            </p>

                                        </div>
                                    `
                                    : ""
                            }

                        </div>

                    `
                ).join("");


        } catch (error) {

            console.error(
                "Query history error:",
                error
            );
        }
    }


    /* =========================================================
       LOGOUT
    ========================================================= */

    function setupLogout() {

        const logoutButtons =
            document.querySelectorAll(
                "#logoutBtn, .logout, .logout-btn, [data-action='logout']"
            );


        logoutButtons.forEach(button => {

            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();


                    localStorage.removeItem(
                        "studentUser"
                    );

                    localStorage.removeItem(
                        "student"
                    );

                    localStorage.removeItem(
                        "studentData"
                    );


                    window.location.href =
                        "index.html";
                }
            );
        });
    }


    /* =========================================================
       NOTIFICATION BUTTON
    ========================================================= */

    function setupNotifications() {

        const button =
            document.querySelector(
                ".notification-button"
            );


        if (!button) {
            return;
        }


        button.addEventListener(
            "click",
            () => {

                alert(
                    "No new notifications."
                );
            }
        );
    }


    /* =========================================================
       INITIALIZATION
    ========================================================= */

    displayStudent(
        studentData
    );


    setupNavigation();
    setupTaskSubmissionForm();
    setupQueryForm();
    setupLogout();
    setupNotifications();
    refreshStudentData();
    /* Initial dashboard data */
    loadEvents();
    loadTasks();
    loadMyTaskSubmissions();
    loadAssessments();
});


