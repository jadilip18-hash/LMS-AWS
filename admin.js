document.addEventListener("DOMContentLoaded", () => {

    /* =========================================================
       HELPERS
    ========================================================= */

    const $ = (id) => document.getElementById(id);

    const $$ = (selector) =>
        Array.from(document.querySelectorAll(selector));

    const escapeHtml = (value) =>
        String(value ?? "").replace(/[&<>'"]/g, (char) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "'": "&#39;",
            '"': "&quot;"
        }[char]));

    function emptyMessage(message) {
        return `
            <div class="content-placeholder">
                <p>${escapeHtml(message)}</p>
            </div>
        `;
    }

    async function api(url, options = {}) {

        try {

            const response = await fetch(url, options);

            const contentType =
                response.headers.get("content-type") || "";

            let data = {};

            if (contentType.includes("application/json")) {
                data = await response.json();
            } else {
                const text = await response.text();

                data = {
                    success: response.ok,
                    message: text
                };
            }

            if (!response.ok || data.success === false) {

                throw new Error(
                    data.message ||
                    `Request failed (${response.status})`
                );
            }

            return data;

        } catch (error) {

            console.error(`API Error: ${url}`, error);

            throw error;
        }
    }
/* =========================================================
   ADMIN DATA
========================================================= */

let adminData = null;

try {
    const adminUserData = localStorage.getItem("adminUser");

    if (
        adminUserData &&
        adminUserData !== "undefined" &&
        adminUserData !== "null"
    ) {
        adminData = JSON.parse(adminUserData);
    } else {
        adminData = null;
    }

} catch (error) {
    console.error("Admin data error:", error);
    adminData = null;
}


      
    

    const adminDisplayName =
        adminData?.name ||
        adminData?.username ||
        "Administrator";

    if ($("adminName")) {
        $("adminName").textContent =
            adminDisplayName;
    }

    if ($("dashboardAdminName")) {
        $("dashboardAdminName").textContent =
            `${adminDisplayName} 👋`;
    }

    if ($("profileAdminName")) {
        $("profileAdminName").textContent =
            adminDisplayName;
    }

    if ($("profileAdminEmail")) {
        $("profileAdminEmail").textContent =
            adminData?.email ||
            "admin@example.com";
    }


    /* =========================================================
       ELEMENTS
    ========================================================= */

    const navItems =
        $$(".nav-item");

    const sections =
        $$(".content-section");

    const studentTableBody =
        $("studentTableBody");

    const studentSearch =
        $("studentSearch");


    /* =========================================================
       NAVIGATION
    ========================================================= */

    window.showSection =
        async function (targetId) {

            navItems.forEach((item) => {
                item.classList.remove("active");
            });

            const activeNav =
                navItems.find((item) => {
                    return item.getAttribute("href") ===
                        `#${targetId}`;
                });

            if (activeNav) {
                activeNav.classList.add("active");
            }

            sections.forEach((section) => {
                section.style.display = "none";
            });

            const targetSection =
                $(targetId);

            if (targetSection) {
                targetSection.style.display = "block";
            }

            try {

                switch (targetId) {

                    case "dashboard":
                        await loadDashboard();
                        break;

                    case "students":
                        await loadStudents();
                        break;

                    case "events":
                        await loadEvents();
                        break;

                    case "recordings":
                        await loadRecordings();
                        break;

                    case "tasks":
                        await loadTasks();
                        break;

                    case "assessments":
                        await loadAssessments();
                        await loadMcqAssessments();
                        await loadMcqResults();
                        break;

                    case "placements":
                        await loadPlacements();
                        break;

                    case "queries":
                        await loadQueries();
                        break;
                }

            } catch (error) {

                console.error(
                    `Section loading error: ${targetId}`,
                    error
                );
            }
        };


    navItems.forEach((item) => {

        item.addEventListener(
            "click",
            (event) => {

                event.preventDefault();

                const href =
                    item.getAttribute("href") || "";

                const targetId =
                    href.startsWith("#")
                        ? href.substring(1)
                        : href;

                if (targetId) {
                    window.showSection(targetId);
                }
            }
        );
    });


    /* =========================================================
       DASHBOARD
    ========================================================= */

    async function loadDashboard() {

        try {

            const [
                studentsData,
                eventsData,
                tasksData,
                queriesData
            ] = await Promise.all([
                api("/api/students"),
                api("/api/events"),
                api("/api/tasks"),
                api("/api/queries")
            ]);

            const students =
                Array.isArray(studentsData.students)
                    ? studentsData.students
                    : [];

            const events =
                Array.isArray(eventsData.events)
                    ? eventsData.events
                    : [];

            const tasks =
                Array.isArray(tasksData.tasks)
                    ? tasksData.tasks
                    : [];

            const queries =
                Array.isArray(queriesData.queries)
                    ? queriesData.queries
                    : [];

            const pendingTasks =
                tasks.filter((task) =>
                    String(task.status || "")
                        .toLowerCase() === "pending"
                ).length;

            const pendingQueries =
                queries.filter((query) =>
                    String(query.status || "Pending")
                        .toLowerCase() === "pending"
                ).length;

            if ($("totalStudents")) {
                $("totalStudents").textContent =
                    students.length;
            }

            if ($("totalEvents")) {
                $("totalEvents").textContent =
                    events.length;
            }

            if ($("pendingTasks")) {
                $("pendingTasks").textContent =
                    pendingTasks;
            }

            if ($("newQueries")) {
                $("newQueries").textContent =
                    pendingQueries;
            }

            if ($("queryNotificationCount")) {
                $("queryNotificationCount").textContent =
                    pendingQueries;
            }

            renderDashboardQueries(
                queries.slice(0, 5)
            );

        } catch (error) {

            console.error(
                "Dashboard loading error:",
                error
            );
        }
    }


    function renderDashboardQueries(queries) {

        const container =
            $("adminQueryList");

        if (!container) {
            return;
        }

        if (!queries.length) {

            container.innerHTML =
                emptyMessage(
                    "No recent queries."
                );

            return;
        }

        container.innerHTML =
            queries.map((query) => {

                const status =
                    query.status || "Pending";

                const statusClass =
                    status.toLowerCase() === "resolved"
                        ? "resolved"
                        : "pending";

                return `
                    <div class="query-item">

                        <div class="query-details">

                            <strong>
                                ${escapeHtml(
                                    query.student_name ||
                                    query.student_id ||
                                    "Student"
                                )}
                            </strong>

                            <p>
                                ${escapeHtml(
                                    query.message || ""
                                )}
                            </p>

                        </div>

                        <span class="status ${statusClass}">
                            ${escapeHtml(status)}
                        </span>

                    </div>
                `;

            }).join("");
    }


    /* =========================================================
       STUDENTS
    ========================================================= */

    let studentsCache = [];


    async function loadStudents() {

        if (!studentTableBody) {
            return;
        }

        studentTableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center;">
                    Loading students...
                </td>
            </tr>
        `;

        try {

            const data =
                await api("/api/students");

            studentsCache =
                Array.isArray(data.students)
                    ? data.students
                    : [];

            renderStudents(
                studentsCache
            );

        } catch (error) {

            console.error(
                "Student loading error:",
                error
            );

            studentTableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align:center;">
                        ${escapeHtml(
                            error.message ||
                            "Unable to load students."
                        )}
                    </td>
                </tr>
            `;

            updateStudentCount(0);
        }
    }


    function renderStudents(students) {

        if (!studentTableBody) {
            return;
        }

        if (!students.length) {

            studentTableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align:center;">
                        No students found.
                    </td>
                </tr>
            `;

            updateStudentCount(0);

            return;
        }

        studentTableBody.innerHTML =
            students.map((student) => {

                const status =
                    student.status || "Active";

                const statusClass =
                    String(status).toLowerCase() === "active"
                        ? "resolved"
                        : "pending";

                return `
                    <tr
                        data-student-id="${escapeHtml(
                            student.student_id || ""
                        )}">

                        <td>
                            ${escapeHtml(
                                student.student_id || "-"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                student.name || "-"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                student.username || "-"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                student.email || "-"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                student.course || "-"
                            )}
                        </td>

                        <td>
                            <span class="status ${statusClass}">
                                ${escapeHtml(status)}
                            </span>
                        </td>

                        <td>

                            <div class="student-actions">

                                <button
                                    type="button"
                                    class="edit-button"
                                    data-student-id="${escapeHtml(
                                        student.student_id || ""
                                    )}">
                                    Edit
                                </button>

                                <button
                                    type="button"
                                    class="delete-button"
                                    data-student-id="${escapeHtml(
                                        student.student_id || ""
                                    )}"
                                    data-student-name="${escapeHtml(
                                        student.name || ""
                                    )}">
                                    Delete
                                </button>

                            </div>

                        </td>

                    </tr>
                `;

            }).join("");

        updateStudentCount(
            students.length
        );

        bindStudentActions();
    }


    function updateStudentCount(count) {

        if ($("totalStudents")) {
            $("totalStudents").textContent =
                count;
        }

        if ($("studentCount")) {
            $("studentCount").textContent =
                count;
        }
    }


    function bindStudentActions() {

        $$(".edit-button").forEach((button) => {

            button.onclick = () => {

                const row =
                    button.closest("tr");

                startInlineEdit(row);
            };
        });


        $$(".delete-button").forEach((button) => {

            button.onclick = () => {

                deleteStudent(
                    button.dataset.student_id,
                    button.dataset.studentName
                );
            };
        });
    }


    function startInlineEdit(row) {

        if (
            !row ||
            row.classList.contains("editing")
        ) {
            return;
        }

        const cells =
            row.children;

        if (cells.length < 7) {
            return;
        }

        const values =
            Array
                .from(cells)
                .slice(0, 6)
                .map((cell) =>
                    cell.textContent.trim()
                );

        row.dataset.oldStudentId =
            values[0];

        row.classList.add("editing");

        cells[0].innerHTML = `
            <input
                type="text"
                class="inline-student-input"
                value="${escapeHtml(values[0])}">
        `;

        cells[1].innerHTML = `
            <input
                type="text"
                class="inline-student-input"
                value="${escapeHtml(values[1])}">
        `;

        cells[2].innerHTML = `
            <input
                type="text"
                class="inline-student-input"
                value="${escapeHtml(values[2])}">
        `;

        cells[3].innerHTML = `
            <input
                type="email"
                class="inline-student-input"
                value="${escapeHtml(values[3])}">
        `;

        cells[4].innerHTML = `
            <input
                type="text"
                class="inline-student-input"
                value="${escapeHtml(values[4])}">
        `;

        cells[5].innerHTML = `
            <select class="inline-student-input">

                <option value="Active"
                    ${values[5] === "Active"
                        ? "selected"
                        : ""}>
                    Active
                </option>

                <option value="Inactive"
                    ${values[5] === "Inactive"
                        ? "selected"
                        : ""}>
                    Inactive
                </option>

            </select>
        `;

        cells[6].innerHTML = `
            <div class="student-actions">

                <button
                    type="button"
                    class="save-inline-button">
                    Save
                </button>

                <button
                    type="button"
                    class="cancel-inline-button">
                    Cancel
                </button>

            </div>
        `;

        cells[6]
            .querySelector(".save-inline-button")
            ?.addEventListener(
                "click",
                () => saveInlineEdit(row)
            );

        cells[6]
            .querySelector(".cancel-inline-button")
            ?.addEventListener(
                "click",
                () => loadStudents()
            );
    }


    async function saveInlineEdit(row) {

        const inputs =
            row.querySelectorAll(
                ".inline-student-input"
            );

        if (inputs.length < 6) {
            return;
        }

        const values =
            Array
                .from(inputs)
                .map((input) =>
                    input.value.trim()
                );

        if (values.some((value) => !value)) {

            alert(
                "Please fill all student details."
            );

            return;
        }

        const [
            student_id,
            name,
            username,
            email,
            course,
            status
        ] = values;

        const oldStudentId =
            row.dataset.oldStudentId;

        try {

            const data =
                await api(
                    `/api/students/${encodeURIComponent(
                        oldStudentId
                    )}`,
                    {
                        method: "PUT",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            student_id,
                            name,
                            username,
                            email,
                            course,
                            status
                        })
                    }
                );

            alert(
                data.message ||
                "Student details updated successfully."
            );

            await loadStudents();

        } catch (error) {

            alert(
                error.message ||
                "Unable to update student."
            );
        }
    }


    async function deleteStudent(
        studentId,
        studentName
    ) {

        if (!studentId) {
            return;
        }

        const confirmed =
            confirm(
                `Delete ${
                    studentName || studentId
                }?`
            );

        if (!confirmed) {
            return;
        }

        try {

            const data =
                await api(
                    `/api/students/${encodeURIComponent(
                        studentId
                    )}`,
                    {
                        method: "DELETE"
                    }
                );

            alert(
                data.message ||
                "Student deleted successfully."
            );

            await loadStudents();

        } catch (error) {

            alert(
                error.message ||
                "Unable to delete student."
            );
        }
    }


    if (studentSearch) {

        studentSearch.addEventListener(
            "input",
            () => {

                const search =
                    studentSearch.value
                        .trim()
                        .toLowerCase();

                const filtered =
                    studentsCache.filter(
                        (student) => {

                            return [
                                student.student_id,
                                student.name,
                                student.username,
                                student.email,
                                student.course,
                                student.status
                            ].some((value) =>
                                String(value || "")
                                    .toLowerCase()
                                    .includes(search)
                            );
                        }
                    );

                renderStudents(filtered);
            }
        );
    }
async function saveEvaluation(submissionId, mark, review) {
    try {
        const response = await fetch(`/api/task-submissions/${submissionId}/evaluate`, {
            method: 'POST', // or 'PUT'
            headers: {
                'Content-Type': 'application/json',
                // Include authorization token if needed:
                // 'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ taskMark: Number(mark), review: review })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Server error: ${response.status}`);
        }

        const data = await response.json();
        alert("Evaluation saved successfully!");
    } catch (error) {
        console.error("Task evaluation save error:", error);
        alert("Unable to save evaluation.");
    }
}
async function reviewSubmission(id){

    const marks = prompt("Enter Marks");
    const reply = prompt("Enter Reply");

    if(reply === null) return;

    await fetch(`/api/task-submissions/${id}/review`,{
        method:"PUT",
        headers:{
            "Content-Type":"application/json"
        },
        body:JSON.stringify({
            review: reply,
            reply: reply,
            marks: marks,
            status:"Approved"
        })
    });

    alert("Task Reviewed Successfully");

    loadSubmittedTasks();
}

    /* =========================================================
       ADD 50 STUDENTS
    ========================================================= */

    $("addStudentButton")
        ?.addEventListener(
            "click",
            openAddStudentModal
        );


    function openAddStudentModal() {

        $("addStudentModal")?.remove();

        const modal =
            document.createElement("div");

        modal.id =
            "addStudentModal";

        modal.className =
            "edit-student-modal";

        const rows =
            Array.from(
                { length: 50 },
                (_, index) => {

                    const number =
                        index + 1;

                    return `
                        <tr>

                            <td
                                style="
                                    text-align:center;
                                    font-weight:600;
                                ">
                                ${number}
                            </td>

                            <td>
                                <input
                                    type="text"
                                    class="bulk-student-input"
                                    data-field="student_id"
                                    data-row="${index}"
                                    placeholder="Student ID">
                            </td>

                            <td>
                                <input
                                    type="text"
                                    class="bulk-student-input"
                                    data-field="name"
                                    data-row="${index}"
                                    placeholder="Name">
                            </td>

                            <td>
                                <input
                                    type="text"
                                    class="bulk-student-input"
                                    data-field="username"
                                    data-row="${index}"
                                    placeholder="Username">
                            </td>

                            <td>
                                <input
                                    type="password"
                                    class="bulk-student-input"
                                    data-field="password"
                                    data-row="${index}"
                                    placeholder="Password">
                            </td>

                            <td>
                                <input
                                    type="email"
                                    class="bulk-student-input"
                                    data-field="email"
                                    data-row="${index}"
                                    placeholder="Email">
                            </td>

                            <td>
                                <input
                                    type="text"
                                    class="bulk-student-input"
                                    data-field="course"
                                    data-row="${index}"
                                    placeholder="Course">
                            </td>

                            <td>
                                <select
                                    class="bulk-student-input"
                                    data-field="status"
                                    data-row="${index}">

                                    <option value="Active">
                                        Active
                                    </option>

                                    <option value="Inactive">
                                        Inactive
                                    </option>

                                </select>
                            </td>

                        </tr>
                    `;
                }
            ).join("");


        modal.innerHTML = `

            <div
                class="edit-student-modal-content"
                style="
                    width:96%;
                    max-width:1500px;
                    max-height:92vh;
                    overflow:hidden;
                ">

                <div
                    class="edit-student-modal-header">

                    <div>

                        <h2>
                            Add 50 Students
                        </h2>

                        <p>
                            Enter student details below.
                            You can add all 50 students at once.
                        </p>

                    </div>

                    <button
                        type="button"
                        id="closeAddStudentModal">
                        ×
                    </button>

                </div>


                <form id="addStudentForm">

                    <div
                        style="
                            overflow:auto;
                            max-height:65vh;
                            border:1px solid #e5e7eb;
                            border-radius:10px;
                        ">

                        <table
                            style="
                                width:100%;
                                min-width:1250px;
                                border-collapse:collapse;
                            ">

                            <thead>

                                <tr
                                    style="
                                        position:sticky;
                                        top:0;
                                        background:#f8fafc;
                                        z-index:2;
                                    ">

                                    <th
                                        style="
                                            padding:10px;
                                            border-bottom:1px solid #ddd;
                                        ">
                                        S.No
                                    </th>

                                    <th
                                        style="
                                            padding:10px;
                                            border-bottom:1px solid #ddd;
                                        ">
                                        Student ID
                                    </th>

                                    <th
                                        style="
                                            padding:10px;
                                            border-bottom:1px solid #ddd;
                                        ">
                                        Name
                                    </th>

                                    <th
                                        style="
                                            padding:10px;
                                            border-bottom:1px solid #ddd;
                                        ">
                                        Username
                                    </th>

                                    <th
                                        style="
                                            padding:10px;
                                            border-bottom:1px solid #ddd;
                                        ">
                                        Password
                                    </th>

                                    <th
                                        style="
                                            padding:10px;
                                            border-bottom:1px solid #ddd;
                                        ">
                                        Email
                                    </th>

                                    <th
                                        style="
                                            padding:10px;
                                            border-bottom:1px solid #ddd;
                                        ">
                                        Course
                                    </th>

                                    <th
                                        style="
                                            padding:10px;
                                            border-bottom:1px solid #ddd;
                                        ">
                                        Status
                                    </th>

                                </tr>

                            </thead>

                            <tbody>

                                ${rows}

                            </tbody>

                        </table>

                    </div>


                    <div
                        id="bulkStudentStatus"
                        style="
                            margin-top:12px;
                            font-weight:600;
                        ">
                    </div>


                    <div
                        class="edit-form-actions"
                        style="
                            display:flex;
                            justify-content:flex-end;
                            gap:10px;
                            margin-top:15px;
                        ">

                        <button
                            type="button"
                            class="cancel-edit-button"
                            id="cancelAddStudent">
                            Cancel
                        </button>

                        <button
                            type="submit"
                            class="save-edit-button"
                            id="addAllStudentsButton">
                            Add All 50 Students
                        </button>

                    </div>

                </form>

            </div>
        `;

        document.body.appendChild(modal);


        $("closeAddStudentModal")
            ?.addEventListener(
                "click",
                () => modal.remove()
            );


        $("cancelAddStudent")
            ?.addEventListener(
                "click",
                () => modal.remove()
            );


        $("addStudentForm")
            ?.addEventListener(
                "submit",
                addAllStudents
            );
    }


    async function addAllStudents(event) {

        event.preventDefault();

        const button =
            $("addAllStudentsButton");

        const statusBox =
            $("bulkStudentStatus");

        const rows = [];

        for (let i = 0; i < 50; i++) {

            const row = {

                student_id:
                    document.querySelector(
                        `.bulk-student-input[data-row="${i}"][data-field="student_id"]`
                    )?.value.trim() || "",

                name:
                    document.querySelector(
                        `.bulk-student-input[data-row="${i}"][data-field="name"]`
                    )?.value.trim() || "",

                username:
                    document.querySelector(
                        `.bulk-student-input[data-row="${i}"][data-field="username"]`
                    )?.value.trim() || "",

                password:
                    document.querySelector(
                        `.bulk-student-input[data-row="${i}"][data-field="password"]`
                    )?.value.trim() || "",

                email:
                    document.querySelector(
                        `.bulk-student-input[data-row="${i}"][data-field="email"]`
                    )?.value.trim() || "",

                course:
                    document.querySelector(
                        `.bulk-student-input[data-row="${i}"][data-field="course"]`
                    )?.value.trim() || "",

                status:
                    document.querySelector(
                        `.bulk-student-input[data-row="${i}"][data-field="status"]`
                    )?.value || "Active"
            };

            const hasAnyData =
                Object.entries(row)
                    .some(([key, value]) =>
                        key !== "status" &&
                        value !== ""
                    );

            if (hasAnyData) {
                rows.push({
                    ...row,
                    rowNumber: i + 1
                });
            }
        }


        if (!rows.length) {

            alert(
                "Please enter at least one student."
            );

            return;
        }


        const incompleteRows =
            rows.filter((row) => {

                return (
                    !row.student_id ||
                    !row.name ||
                    !row.username ||
                    !row.password ||
                    !row.email ||
                    !row.course
                );
            });


        if (incompleteRows.length) {

            alert(
                "Please complete all fields for every student row you started.\n\n" +
                "Incomplete row(s): " +
                incompleteRows
                    .map((row) => row.rowNumber)
                    .join(", ")
            );

            return;
        }


        const confirmed =
            confirm(
                `You are about to add ${rows.length} student(s).\n\nContinue?`
            );

        if (!confirmed) {
            return;
        }


        if (button) {
            button.disabled = true;
            button.textContent =
                "Adding Students...";
        }


        let successCount = 0;
        let failedCount = 0;
        const errors = [];


        for (const student of rows) {

            try {

                await api(
                    "/api/students",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            student_id:
                                student.student_id,

                            name:
                                student.name,

                            username:
                                student.username,

                            password:
                                student.password,

                            email:
                                student.email,

                            course:
                                student.course,

                            status:
                                student.status
                        })
                    }
                );

                successCount++;

                if (statusBox) {

                    statusBox.textContent =
                        `Added ${successCount} of ${rows.length} students...`;
                }

            } catch (error) {

                failedCount++;

                errors.push(
                    `Row ${student.rowNumber}: ${
                        error.message ||
                        "Unable to add student"
                    }`
                );
            }
        }


        if (statusBox) {

            statusBox.innerHTML = `
                <span>
                    Successfully added:
                    ${successCount}
                </span>
                <br>
                <span>
                    Failed:
                    ${failedCount}
                </span>
            `;
        }


        if (failedCount > 0) {

            alert(
                `Bulk student creation completed.\n\n` +
                `Successfully added: ${successCount}\n` +
                `Failed: ${failedCount}\n\n` +
                errors.join("\n")
            );

        } else {

            alert(
                `Successfully added all ${successCount} student(s)!`
            );

            $("addStudentModal")?.remove();
        }


        if (button) {

            button.disabled = false;

            button.textContent =
                "Add All 50 Students";
        }


        await loadStudents();

        await loadDashboard();
    }


    /* =========================================================
       EVENT MEDIA
    ========================================================= */

    function setupEventMediaUpload() {

        const form =
            $("eventForm");

        if (!form || $("eventMedia")) {
            return;
        }

        const mediaGroup =
            document.createElement("div");

        mediaGroup.className =
            "form-group";

        mediaGroup.innerHTML = `
            <label for="eventMedia">
                Event Photo / Video
            </label>

            <input
                type="file"
                id="eventMedia"
                name="media"
                accept="image/*,video/*">

            <small>
                Upload one photo or one video.
            </small>
        `;

        const description =
            $("eventDescription");

        if (
            description &&
            description.closest(".form-group")
        ) {

            description
                .closest(".form-group")
                .insertAdjacentElement(
                    "afterend",
                    mediaGroup
                );

        } else {

            form.appendChild(
                mediaGroup
            );
        }
    }


    async function loadEvents() {

        const container =
            $("eventList");

        if (!container) {
            return;
        }

        try {

            const data =
                await api("/api/events");

            const events =
                Array.isArray(data.events)
                    ? data.events
                    : [];

            if (!events.length) {

                container.innerHTML =
                    emptyMessage(
                        "No events found."
                    );

                return;
            }

            container.innerHTML =
                events.map((event) => {

                    const mediaPath =
                        event.media_path ||
                        event.file_path ||
                        event.media_url ||
                        "";

                    const mediaType =
                        String(
                            event.media_type || ""
                        ).toLowerCase();

                    let mediaHtml = "";

                    if (mediaPath) {

                        const safePath =
                            escapeHtml(mediaPath);

                        const isVideo =
                            mediaType === "video" ||
                            /\.(mp4|webm|ogg|mov|m4v)$/i
                                .test(mediaPath);

                        if (isVideo) {

                            mediaHtml = `
                                <div style="margin-top:12px;">

                                    <video
                                        src="${safePath}"
                                        controls
                                        style="
                                            width:100%;
                                            max-width:500px;
                                            border-radius:10px;
                                        ">
                                    </video>

                                </div>
                            `;

                        } else {

                            mediaHtml = `
                                <div style="margin-top:12px;">

                                    <img
                                        src="${safePath}"
                                        alt="Event media"
                                        style="
                                            width:100%;
                                            max-width:500px;
                                            max-height:300px;
                                            object-fit:cover;
                                            border-radius:10px;
                                        ">

                                </div>
                            `;
                        }
                    }

                    return `
                        <div class="management-list-item">

                            <strong>
                                ${escapeHtml(
                                    event.title || ""
                                )}
                            </strong>

                            <p>
                                ${escapeHtml(
                                    event.date || ""
                                )}

                                ${
                                    event.date &&
                                    event.time
                                        ? " · "
                                        : ""
                                }

                                ${escapeHtml(
                                    event.time || ""
                                )}
                            </p>

                            ${
                                event.type
                                    ? `
                                        <p>
                                            <span class="status">
                                                ${escapeHtml(
                                                    event.type
                                                )}
                                            </span>
                                        </p>
                                    `
                                    : ""
                            }

                            <small>
                                ${escapeHtml(
                                    event.description || ""
                                )}
                            </small>

                            ${mediaHtml}

                        </div>
                    `;

                }).join("");

        } catch (error) {

            container.innerHTML =
                emptyMessage(
                    error.message ||
                    "Unable to load events."
                );
        }
    }


    setupEventMediaUpload();


    /* =========================================================
       RECORDINGS
    ========================================================= */

    async function loadRecordings() {

        const container =
            $("recordingList");

        if (!container) {
            return;
        }

        try {

            const data =
                await api("/api/recordings");

            const recordings =
                Array.isArray(data.recordings)
                    ? data.recordings
                    : [];

            if (!recordings.length) {

                container.innerHTML =
                    emptyMessage(
                        "No recordings found."
                    );

                return;
            }

            container.innerHTML =
                recordings.map((recording) => {

                    const filePath =
                        recording.file_path ||
                        recording.video_path ||
                        "";

                    return `
                        <div class="management-list-item">

                            <strong>
                                ${escapeHtml(
                                    recording.title || ""
                                )}
                            </strong>

                            <p>
                                ${escapeHtml(
                                    recording.course || ""
                                )}
                            </p>

                            <small>
                                ${escapeHtml(
                                    recording.description || ""
                                )}
                            </small>

                            ${
                                filePath
                                    ? `
                                        <p>
                                            <a
                                                href="${escapeHtml(
                                                    filePath
                                                )}"
                                                target="_blank"
                                                rel="noopener">
                                                Open Recording
                                            </a>
                                        </p>
                                    `
                                    : ""
                            }

                        </div>
                    `;

                }).join("");

        } catch (error) {

            container.innerHTML =
                emptyMessage(
                    error.message ||
                    "Unable to load recordings."
                );
        }
    }

/* =========================================================
   TASKS
   GROUPED BY MODE
========================================================= */

function normalizeTaskCategory(task) {

    const value =
        String(
            task.category ||
            task.mode ||
            task.type ||
            "College"
        )
            .trim()
            .toLowerCase();

    if (value === "bootcamp") {
        return "Bootcamp";
    }

    if (value === "webinar") {
        return "Webinar";
    }

    return "College";
}


function setupTaskCategoryField() {

    const form =
        $("taskForm");

    if (!form || $("taskCategory")) {
        return;
    }

    const group =
        document.createElement("div");

    group.className =
        "form-group";

    group.innerHTML = `
        <label for="taskCategory">
            Mode
        </label>

        <select
            id="taskCategory"
            name="category">

            <option value="Bootcamp">
                Bootcamp
            </option>

            <option value="College" selected>
                College
            </option>

            <option value="Webinar">
                Webinar
            </option>

        </select>

        <small>
            Select the mode. The task will automatically appear
            under this category.
        </small>
    `;

    const course =
        $("taskCourse");

    if (
        course &&
        course.closest(".form-group")
    ) {

        course
            .closest(".form-group")
            .insertAdjacentElement(
                "afterend",
                group
            );

    } else {

        form.appendChild(group);
    }
}


/* =========================================================
   LOAD ADMIN TASKS + STUDENT SUBMISSIONS
========================================================= */

async function loadTasks() {

    const container = $("taskList");
    if (!container) return;

    try {

        const [taskData, submissionData] = await Promise.all([
            api("/api/tasks"),
            api("/api/task-submissions")
        ]);

        const tasks = Array.isArray(taskData.tasks)
            ? taskData.tasks
            : [];

        // Support both API formats
        const submissions = Array.isArray(submissionData.submissions)
            ? submissionData.submissions
            : Array.isArray(submissionData.tasks)
            ? submissionData.tasks
            : [];

        const categories = ["College", "Bootcamp", "Webinar"];

        container.innerHTML = categories.map((category) => {

            const categorySubmissions = submissions.filter((sub) =>
                String(sub.category || "College").trim().toLowerCase() ===
                category.toLowerCase()
            );

            return `
                <div class="task-category-section" style="margin-bottom:25px;">

                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:15px;">
                        <h3>${category} Submissions</h3>
                        <span class="status">${categorySubmissions.length}</span>
                    </div>

                    ${
                        categorySubmissions.length
                            ? `
                                <table style="width:100%;border-collapse:collapse;">
                                    <thead>
                                        <tr>
                                            <th>Student ID</th>
                                            <th>Name</th>
                                            <th>Subject</th>
                                            <th>College/Event</th>
                                            <th>GitHub</th>
                                            <th>Status</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>

                                    ${categorySubmissions.map((sub) => `
                                        <tr>
                                            <td>${sub.student_id || "-"}</td>
                                            <td>${sub.name || sub.student_name || "-"}</td>
                                            <td>${sub.subject || "-"}</td>
                                            <td>${sub.college || sub.event_name || "-"}</td>

                                            <td>
                                                ${
                                                    sub.github_link
                                                        ? `<a href="${sub.github_link}" target="_blank">Open GitHub</a>`
                                                        : "-"
                                                }
                                            </td>

                                            <td>
                                                <span class="status">
                                                    ${sub.status || "Submitted"}
                                                </span>
                                            </td>

                                            <td>
                                                <button onclick="openTaskEvaluation(${sub.id})">
                                                    Review
                                                </button>
                                            </td>
                                        </tr>
                                    `).join("")}

                                    </tbody>
                                </table>
                              `
                            : `
                                <div class="content-placeholder">
                                    <p>No submissions under ${category}.</p>
                                </div>
                              `
                    }

                </div>
            `;
        }).join("");

    } catch (error) {
        console.error("Task loading error:", error);

        container.innerHTML = `
            <div class="content-placeholder">
                <p>${error.message || "Unable to load task submissions."}</p>
            </div>
        `;
    }
}
/* =========================================================
   OPEN EXISTING EVALUATION UI
========================================================= */

window.openTaskEvaluation = function (submissionId) {

    const oldModal =
        document.getElementById("taskEvaluationModal");

    if (oldModal) {
        oldModal.remove();
    }

    const modal =
        document.createElement("div");

    modal.id =
        "taskEvaluationModal";

    modal.style.cssText = `
        position:fixed;
        inset:0;
        background:rgba(0,0,0,0.5);
        display:flex;
        align-items:center;
        justify-content:center;
        z-index:9999;
    `;

    modal.innerHTML = `
        <div style="
            width:420px;
            max-width:90%;
            background:#fff;
            padding:25px;
            border-radius:12px;
            box-shadow:0 10px 30px rgba(0,0,0,0.2);
        ">

            <h3 style="margin-top:0;">
                Evaluate Task
            </h3>

            <label style="display:block;margin-bottom:6px;font-weight:600;">
                Task Mark
            </label>

            <input
                id="evaluationMarks"
                type="number"
                min="0"
                max="100"
                placeholder="Enter marks"
                style="
                    width:100%;
                    padding:10px;
                    margin-bottom:15px;
                    border:1px solid #ccc;
                    border-radius:6px;
                    box-sizing:border-box;
                "
            >

            <label style="display:block;margin-bottom:6px;font-weight:600;">
                Review
            </label>

            <textarea
                id="evaluationReview"
                rows="5"
                placeholder="Enter your review"
                style="
                    width:100%;
                    padding:10px;
                    margin-bottom:20px;
                    border:1px solid #ccc;
                    border-radius:6px;
                    resize:vertical;
                    box-sizing:border-box;
                "
            ></textarea>

            <div style="
                display:flex;
                justify-content:flex-end;
                gap:10px;
            ">

                <button
                    type="button"
                    onclick="document.getElementById('taskEvaluationModal').remove()"
                    style="
                        padding:9px 15px;
                        border:1px solid #ccc;
                        border-radius:6px;
                        background:#fff;
                        cursor:pointer;
                    "
                >
                    Cancel
                </button>

                <button
                    type="button"
                    onclick="saveTaskEvaluation(${Number(submissionId)})"
                    style="
                        padding:9px 15px;
                        border:none;
                        border-radius:6px;
                        background:#2563eb;
                        color:#fff;
                        cursor:pointer;
                    "
                >
                    Save Evaluation
                </button>

            </div>

        </div>
    `;

    document.body.appendChild(modal);
};


/* =========================================================
   SAVE MARKS + REVIEW
========================================================= */

window.saveTaskEvaluation = async function (submissionId) {

    const marksInput =
        document.getElementById("evaluationMarks");

    const reviewInput =
        document.getElementById("evaluationReview");

    if (!marksInput || !reviewInput) {
        alert("Evaluation fields not found.");
        return;
    }

    const marksValue =
        marksInput.value.trim();

    const review =
        reviewInput.value.trim();

    if (marksValue === "") {
        alert("Please enter marks.");
        marksInput.focus();
        return;
    }

    const numericMarks =
        Number(marksValue);

    if (
        isNaN(numericMarks) ||
        numericMarks < 0 ||
        numericMarks > 100
    ) {
        alert("Marks must be between 0 and 100.");
        marksInput.focus();
        return;
    }

    try {

        const response =
            await fetch(
                "/api/task-submissions/" +
                encodeURIComponent(submissionId) +
                "/evaluate",
                {
                    method: "PUT",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    credentials: "include",

                    body: JSON.stringify({
                        marks: numericMarks,
                        review: review,
                        admin_reply: review,
                        status: "Reviewed"
                    })
                }
            );

        const data =
            await response.json();

        if (!response.ok || !data.success) {

            throw new Error(
                data.message ||
                "Unable to save evaluation."
            );
        }

        const modal =
            document.getElementById(
                "taskEvaluationModal"
            );

        if (modal) {
            modal.remove();
        }

        alert("Evaluation saved successfully.");

        /* Reload the SAME existing table */
        await loadTasks();

    } catch (error) {

        console.error(
            "Task evaluation save error:",
            error
        );

        alert(
            error.message ||
            "Unable to save evaluation."
        );
    }
};


/* =========================================================
   INITIAL TASK SETUP
========================================================= */

setupTaskCategoryField();


/* =========================================================
   STUDENT SUBMISSIONS
========================================================= */

async function loadMySubmissions() {

    try {

        const response =
            await fetch(
                `/api/task-submissions/student/${currentStudent.student_id}`,
                {
                    credentials: "include"
                }
            );

        const data =
            await response.json();

        const tbody =
            document.getElementById(
                "submissionTableBody"
            );

        if (!tbody) {
            return;
        }

        tbody.innerHTML = "";

        if (
            !data.success ||
            !Array.isArray(data.submissions) ||
            data.submissions.length === 0
        ) {

            tbody.innerHTML =
                `<tr><td colspan="6">No submissions found.</td></tr>`;

            return;
        }

        data.submissions.forEach(item => {

            const review =
                item.review ||
                item.admin_reply ||
                item.reply ||
                "-";

            tbody.innerHTML += `
                <tr>

                    <td>
                        ${escapeHtml(item.category || "-")}
                    </td>

                    <td>
                        ${escapeHtml(item.task_name || "-")}
                    </td>

                    <td>
                        ${
                            item.github_link
                                ? `
                                    <a
                                        href="${escapeHtml(item.github_link)}"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Open GitHub
                                    </a>
                                `
                                : "-"
                        }
                    </td>

                    <td>
                        ${escapeHtml(item.status || "Submitted")}
                    </td>

                    <td>
                        ${
                            item.marks !== null &&
                            item.marks !== undefined &&
                            item.marks !== ""
                                ? escapeHtml(String(item.marks))
                                : "-"
                        }
                    </td>

                    <td>
                        ${escapeHtml(review)}
                    </td>

                </tr>
            `;

        });

    } catch (error) {

        console.error(
            "Student task submission loading error:",
            error
        );

    }
}

    /* =========================================================
       MANUAL ASSESSMENTS
    ========================================================= */

    async function loadAssessments() {

        const container =
            $("assessmentList");

        if (!container) {
            return;
        }

        try {

            const data =
                await api("/api/assessments");

            const assessments =
                Array.isArray(data.assessments)
                    ? data.assessments
                    : [];

            if (!assessments.length) {

                container.innerHTML =
                    emptyMessage(
                        "No manual assessments found."
                    );

                return;
            }

            container.innerHTML = `
                <div
                    style="
                        width:100%;
                        overflow-x:auto;
                    ">

                    <table
                        style="
                            width:100%;
                            border-collapse:collapse;
                            min-width:750px;
                        ">

                        <thead>

                            <tr>

                                <th style="padding:12px;text-align:left;border-bottom:1px solid #ddd;">
                                    Student ID
                                </th>

                                <th style="padding:12px;text-align:left;border-bottom:1px solid #ddd;">
                                    Student
                                </th>

                                <th style="padding:12px;text-align:left;border-bottom:1px solid #ddd;">
                                    Assessment
                                </th>

                                <th style="padding:12px;text-align:center;border-bottom:1px solid #ddd;">
                                    Marks
                                </th>

                                <th style="padding:12px;text-align:center;border-bottom:1px solid #ddd;">
                                    Percentage
                                </th>

                                <th style="padding:12px;text-align:left;border-bottom:1px solid #ddd;">
                                    Remarks
                                </th>

                            </tr>

                        </thead>

                        <tbody>

                            ${assessments.map(
                                (assessment) => {

                                    const marks =
                                        Number(
                                            assessment.marks ?? 0
                                        );

                                    const maxMarks =
                                        Number(
                                            assessment.max_marks ?? 0
                                        );

                                    const percentage =
                                        maxMarks > 0
                                            ? (marks / maxMarks) * 100
                                            : 0;

                                    return `
                                        <tr>

                                            <td style="padding:12px;border-bottom:1px solid #eee;">
                                                ${escapeHtml(
                                                    assessment.student_id ||
                                                    "-"
                                                )}
                                            </td>

                                            <td style="padding:12px;border-bottom:1px solid #eee;">
                                                <strong>
                                                    ${escapeHtml(
                                                        assessment.student_name ||
                                                        assessment.name ||
                                                        "Student"
                                                    )}
                                                </strong>
                                            </td>

                                            <td style="padding:12px;border-bottom:1px solid #eee;">
                                                ${escapeHtml(
                                                    assessment.title ||
                                                    "-"
                                                )}
                                            </td>

                                            <td style="padding:12px;text-align:center;border-bottom:1px solid #eee;">
                                                <strong>
                                                    ${escapeHtml(
                                                        marks
                                                    )}
                                                </strong>
                                                /
                                                ${escapeHtml(
                                                    maxMarks
                                                )}
                                            </td>

                                            <td style="padding:12px;text-align:center;border-bottom:1px solid #eee;">
                                                ${percentage.toFixed(2)}%
                                            </td>

                                            <td style="padding:12px;border-bottom:1px solid #eee;">
                                                ${escapeHtml(
                                                    assessment.remarks ||
                                                    "-"
                                                )}
                                            </td>

                                        </tr>
                                    `;
                                }
                            ).join("")}

                        </tbody>

                    </table>

                </div>
            `;

        } catch (error) {

            container.innerHTML =
                emptyMessage(
                    error.message ||
                    "Unable to load assessments."
                );
        }

        updateAssessmentPreview();
    }


    function updateAssessmentPreview() {

        const marks =
            Number(
                $("assessmentMarks")?.value || 0
            );

        const maxMarks =
            Number(
                $("assessmentMaxMarks")?.value || 0
            );

        if ($("scorePreview")) {

            $("scorePreview").textContent =
                maxMarks > 0
                    ? `${marks}/${maxMarks}`
                    : "-";
        }
    }


    $("assessmentMarks")
        ?.addEventListener(
            "input",
            updateAssessmentPreview
        );

    $("assessmentMaxMarks")
        ?.addEventListener(
            "input",
            updateAssessmentPreview
        );


    /* =========================================================
       MCQ ASSESSMENT
    ========================================================= */

    let mcqQuestions = [];


    function renderMcqQuestions() {

        const container =
            $("mcqQuestionList");

        if (!container) {
            return;
        }

        if (!mcqQuestions.length) {

            container.innerHTML = `
                <div class="content-placeholder">
                    <p>
                        No questions added yet.
                    </p>
                </div>
            `;

            return;
        }

        container.innerHTML =
            mcqQuestions.map(
                (question, index) => {

                    return `
                        <div
                            class="management-list-item"
                            data-question-index="${index}">

                            <strong>
                                Q${index + 1}.
                                ${escapeHtml(
                                    question.question_text
                                )}
                            </strong>

                            <p>
                                A.
                                ${escapeHtml(
                                    question.option_a
                                )}
                            </p>

                            <p>
                                B.
                                ${escapeHtml(
                                    question.option_b
                                )}
                            </p>

                            <p>
                                C.
                                ${escapeHtml(
                                    question.option_c
                                )}
                            </p>

                            <p>
                                D.
                                ${escapeHtml(
                                    question.option_d
                                )}
                            </p>

                            <small>
                                Correct:
                                ${escapeHtml(
                                    question.correct_option
                                )}

                                · Marks:
                                ${escapeHtml(
                                    question.marks
                                )}
                            </small>

                            <br>

                            <button
                                type="button"
                                class="delete-mcq-question"
                                data-index="${index}">
                                Remove
                            </button>

                        </div>
                    `;
                }
            ).join("");


        $$(".delete-mcq-question")
            .forEach((button) => {

                button.addEventListener(
                    "click",
                    () => {

                        const index =
                            Number(
                                button.dataset.index
                            );

                        mcqQuestions.splice(
                            index,
                            1
                        );

                        renderMcqQuestions();
                    }
                );
            });
    }


    $("addMcqQuestionButton")
        ?.addEventListener(
            "click",
            () => {

                const questionText =
                    $("mcqQuestionText")
                        ?.value
                        .trim();

                const optionA =
                    $("mcqOptionA")
                        ?.value
                        .trim();

                const optionB =
                    $("mcqOptionB")
                        ?.value
                        .trim();

                const optionC =
                    $("mcqOptionC")
                        ?.value
                        .trim();

                const optionD =
                    $("mcqOptionD")
                        ?.value
                        .trim();

                const correctOption =
                    $("mcqCorrectOption")
                        ?.value;

                const marks =
                    Number(
                        $("mcqQuestionMarks")
                            ?.value || 1
                    );

                if (
                    !questionText ||
                    !optionA ||
                    !optionB ||
                    !optionC ||
                    !optionD
                ) {

                    alert(
                        "Please fill the question and all four options."
                    );

                    return;
                }

                if (
                    !["A", "B", "C", "D"]
                        .includes(correctOption)
                ) {

                    alert(
                        "Please select the correct option."
                    );

                    return;
                }

                if (
                    !Number.isFinite(marks) ||
                    marks <= 0
                ) {

                    alert(
                        "Question marks must be greater than 0."
                    );

                    return;
                }

                mcqQuestions.push({
                    question_text:
                        questionText,

                    option_a:
                        optionA,

                    option_b:
                        optionB,

                    option_c:
                        optionC,

                    option_d:
                        optionD,

                    correct_option:
                        correctOption,

                    marks
                });

                if ($("mcqQuestionText")) {
                    $("mcqQuestionText").value = "";
                }

                if ($("mcqOptionA")) {
                    $("mcqOptionA").value = "";
                }

                if ($("mcqOptionB")) {
                    $("mcqOptionB").value = "";
                }

                if ($("mcqOptionC")) {
                    $("mcqOptionC").value = "";
                }

                if ($("mcqOptionD")) {
                    $("mcqOptionD").value = "";
                }

                if ($("mcqQuestionMarks")) {
                    $("mcqQuestionMarks").value = "1";
                }

                if ($("mcqFormStatus")) {

                    $("mcqFormStatus").textContent =
                        `${mcqQuestions.length} question(s) added.`;
                }

                renderMcqQuestions();
            }
        );


    $("mcqAssessmentForm")
        ?.addEventListener(
            "submit",
            async (event) => {

                event.preventDefault();

                const title =
                    $("mcqTitle")
                        ?.value
                        .trim();

                const startTime =
                    $("mcqStartTime")
                        ?.value;

                const endTime =
                    $("mcqEndTime")
                        ?.value;

                const description =
                    $("mcqDescription")
                        ?.value
                        .trim();

                if (!title) {

                    alert(
                        "Please enter assessment title."
                    );

                    return;
                }

                if (!startTime || !endTime) {

                    alert(
                        "Please select start and end time."
                    );

                    return;
                }

                if (
                    new Date(startTime) >=
                    new Date(endTime)
                ) {

                    alert(
                        "End time must be after start time."
                    );

                    return;
                }

                if (!mcqQuestions.length) {

                    alert(
                        "Please add at least one MCQ question."
                    );

                    return;
                }

                try {

                    const data =
                        await api(
                            "/api/mcq-assessments",
                            {
                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body:
                                    JSON.stringify({
                                        title,
                                        start_time:
                                            startTime,
                                        end_time:
                                            endTime,
                                        description,
                                        questions:
                                            mcqQuestions
                                    })
                            }
                        );

                    alert(
                        data.message ||
                        "MCQ assessment created successfully."
                    );

                    event.target.reset();

                    mcqQuestions = [];

                    renderMcqQuestions();

                    if ($("mcqFormStatus")) {
                        $("mcqFormStatus").textContent =
                            "";
                    }

                    await loadMcqAssessments();

                } catch (error) {

                    alert(
                        error.message ||
                        "Unable to create MCQ assessment."
                    );
                }
            }
        );


    async function loadMcqAssessments() {

        const container =
            $("mcqAssessmentList");

        if (!container) {
            return;
        }

        try {

            const data =
                await api(
                    "/api/mcq-assessments"
                );

            const assessments =
                Array.isArray(
                    data.assessments
                )
                    ? data.assessments
                    : [];

            if (!assessments.length) {

                container.innerHTML =
                    emptyMessage(
                        "No MCQ assessments found."
                    );

                return;
            }

            container.innerHTML =
                assessments.map(
                    (assessment) => {

                        const questionCount =
                            assessment.question_count ??
                            assessment.questions_count ??
                            assessment.questions?.length ??
                            0;

                        return `
                            <div class="management-list-item">

                                <strong>
                                    ${escapeHtml(
                                        assessment.title || ""
                                    )}
                                </strong>

                                <p>
                                    Start:
                                    ${escapeHtml(
                                        assessment.start_time || ""
                                    )}
                                </p>

                                <p>
                                    End:
                                    ${escapeHtml(
                                        assessment.end_time || ""
                                    )}
                                </p>

                                <p>
                                    Questions:
                                    ${escapeHtml(
                                        questionCount
                                    )}
                                </p>

                                <small>
                                    ${escapeHtml(
                                        assessment.description || ""
                                    )}
                                </small>

                            </div>
                        `;
                    }
                ).join("");

        } catch (error) {

            container.innerHTML =
                emptyMessage(
                    error.message ||
                    "Unable to load MCQ assessments."
                );
        }
    }


    /* =========================================================
       MCQ RESULTS
    ========================================================= */

    function getGradeClass(grade) {

        const value =
            String(grade || "")
                .trim()
                .toUpperCase();

        if (
            value === "A" ||
            value === "A+"
        ) {
            return "grade-a";
        }

        if (
            value === "B" ||
            value === "B+"
        ) {
            return "grade-b";
        }

        if (
            value === "C" ||
            value === "C+"
        ) {
            return "grade-c";
        }

        if (
            value === "D" ||
            value === "D+"
        ) {
            return "grade-d";
        }

        return "grade-f";
    }


    async function loadMcqResults() {

        const container =
            $("mcqResultsList");

        if (!container) {
            return;
        }

        try {

            const data =
                await api(
                    "/api/mcq-results"
                );

            const results =
                Array.isArray(data.results)
                    ? data.results
                    : [];

            if (!results.length) {

                container.innerHTML =
                    emptyMessage(
                        "No MCQ results found."
                    );

                return;
            }

            container.innerHTML = `
                <div style="overflow-x:auto;">

                    <table
                        style="
                            width:100%;
                            border-collapse:collapse;
                        ">

                        <thead>

                            <tr>

                                <th>Student ID</th>
                                <th>Student</th>
                                <th>Email</th>
                                <th>Course</th>
                                <th>Assessment</th>
                                <th>Marks</th>
                                <th>Percentage</th>
                                <th>Grade</th>

                            </tr>

                        </thead>

                        <tbody>

                            ${results.map(
                                (result) => {

                                    const grade =
                                        result.grade ||
                                        "F";

                                    return `
                                        <tr
                                            class="${getGradeClass(
                                                grade
                                            )}">

                                            <td>
                                                ${escapeHtml(
                                                    result.student_id ||
                                                    "-"
                                                )}
                                            </td>

                                            <td>
                                                ${escapeHtml(
                                                    result.student_name ||
                                                    result.name ||
                                                    "-"
                                                )}
                                            </td>

                                            <td>
                                                ${escapeHtml(
                                                    result.email ||
                                                    "-"
                                                )}
                                            </td>

                                            <td>
                                                ${escapeHtml(
                                                    result.course ||
                                                    "-"
                                                )}
                                            </td>

                                            <td>
                                                ${escapeHtml(
                                                    result.assessment_title ||
                                                    result.title ||
                                                    "-"
                                                )}
                                            </td>

                                            <td>
                                                ${escapeHtml(
                                                    result.marks ??
                                                    0
                                                )}
                                                /
                                                ${escapeHtml(
                                                    result.max_marks ??
                                                    0
                                                )}
                                            </td>

                                            <td>
                                                ${escapeHtml(
                                                    result.percentage ??
                                                    0
                                                )}%
                                            </td>

                                            <td>
                                                <strong>
                                                    ${escapeHtml(
                                                        grade
                                                    )}
                                                </strong>
                                            </td>

                                        </tr>
                                    `;
                                }
                            ).join("")}

                        </tbody>

                    </table>

                </div>
            `;

        } catch (error) {

            container.innerHTML =
                emptyMessage(
                    error.message ||
                    "Unable to load MCQ results."
                );
        }
    }


    /* =========================================================
       PLACEMENTS
    ========================================================= */

    function setupPlacementMediaUpload() {

        const form =
            $("placementForm");

        if (
            !form ||
            $("placementMedia")
        ) {
            return;
        }

        const group =
            document.createElement("div");

        group.className =
            "form-group";

        group.innerHTML = `
            <label for="placementMedia">
                Placement Photo / Video
            </label>

            <input
                type="file"
                id="placementMedia"
                name="media"
                accept="image/*,video/*">

            <small>
                Upload one placement photo or video.
            </small>
        `;

        const description =
            $("placementDescription");

        if (
            description &&
            description.closest(".form-group")
        ) {

            description
                .closest(".form-group")
                .insertAdjacentElement(
                    "afterend",
                    group
                );

        } else {

            form.appendChild(group);
        }
    }


    async function loadPlacements() {

        const container =
            $("placementList");

        if (!container) {
            return;
        }

        try {

            const data =
                await api("/api/placements");

            const placements =
                Array.isArray(data.placements)
                    ? data.placements
                    : [];

            if (!placements.length) {

                container.innerHTML =
                    emptyMessage(
                        "No placement activities found."
                    );

                return;
            }

            container.innerHTML =
                placements.map(
                    (placement) => {

                        const mediaPath =
                            placement.media_path ||
                            placement.file_path ||
                            placement.media_url ||
                            "";

                        const mediaType =
                            String(
                                placement.media_type || ""
                            ).toLowerCase();

                        let mediaHtml = "";

                        if (mediaPath) {

                            const safePath =
                                escapeHtml(mediaPath);

                            const isVideo =
                                mediaType === "video" ||
                                /\.(mp4|webm|ogg|mov|m4v)$/i
                                    .test(mediaPath);

                            mediaHtml =
                                isVideo
                                    ? `
                                        <video
                                            src="${safePath}"
                                            controls
                                            style="
                                                width:100%;
                                                max-width:500px;
                                                border-radius:10px;
                                                margin-top:12px;
                                            ">
                                        </video>
                                    `
                                    : `
                                        <img
                                            src="${safePath}"
                                            alt="Placement media"
                                            style="
                                                width:100%;
                                                max-width:500px;
                                                max-height:300px;
                                                object-fit:cover;
                                                border-radius:10px;
                                                margin-top:12px;
                                            ">
                                    `;
                        }

                        return `
                            <div
                                class="management-list-item">

                                <strong>
                                    ${escapeHtml(
                                        placement.title || ""
                                    )}
                                </strong>

                                <p>
                                    ${escapeHtml(
                                        placement.date || ""
                                    )}
                                </p>

                                <small>
                                    ${escapeHtml(
                                        placement.description || ""
                                    )}
                                </small>

                                ${mediaHtml}

                            </div>
                        `;
                    }
                ).join("");

        } catch (error) {

            container.innerHTML =
                emptyMessage(
                    error.message ||
                    "Unable to load placements."
                );
        }
    }


    setupPlacementMediaUpload();


    /* =========================================================
       QUERIES
    ========================================================= */

    async function updateQuery(
        queryId,
        status,
        reply
    ) {

        if (!queryId) {
            throw new Error(
                "Invalid query ID."
            );
        }

        const body = {};

        if (status) {
            body.status = status;
        }

        if (reply !== undefined) {
            body.reply = reply;
        }

        return api(
            `/api/queries/${encodeURIComponent(
                queryId
            )}`,
            {
                method: "PUT",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify(body)
            }
        );
    }


    async function loadQueries() {

        const container =
            $("queryManagementList");

        if (!container) {
            return;
        }

        try {

            const data =
                await api("/api/queries");

            const queries =
                Array.isArray(data.queries)
                    ? data.queries
                    : [];

            const pendingCount =
                queries.filter((query) =>
                    String(
                        query.status ||
                        "Pending"
                    )
                        .toLowerCase() ===
                    "pending"
                ).length;

            if ($("queryCountBadge")) {

                $("queryCountBadge").textContent =
                    `${pendingCount} Pending`;
            }

            if ($("queryNotificationCount")) {

                $("queryNotificationCount")
                    .textContent =
                    pendingCount;
            }

            if (!queries.length) {

                container.innerHTML =
                    emptyMessage(
                        "No queries found."
                    );

                return;
            }

            container.innerHTML =
                queries.map((query) => {

                    const status =
                        query.status ||
                        "Pending";

                    const statusClass =
                        status.toLowerCase() ===
                        "resolved"
                            ? "resolved"
                            : "pending";

                    return `
                        <div
                            class="query-management-item">

                            <div
                                class="query-management-content">

                                <div
                                    class="query-top">

                                    <div>

                                        <h3>
                                            ${escapeHtml(
                                                query.subject ||
                                                "Student Query"
                                            )}
                                        </h3>

                                        <span>
                                            Student:
                                            ${escapeHtml(
                                                query.student_name ||
                                                query.student_id ||
                                                "Unknown"
                                            )}
                                        </span>

                                        ${
                                            query.email
                                                ? `
                                                    <br>
                                                    <small>
                                                        ${escapeHtml(
                                                            query.email
                                                        )}
                                                    </small>
                                                `
                                                : ""
                                        }

                                    </div>

                                    <span
                                        class="status ${statusClass}">
                                        ${escapeHtml(
                                            status
                                        )}
                                    </span>

                                </div>

                                <p>
                                    ${escapeHtml(
                                        query.message || ""
                                    )}
                                </p>

                                <div
                                    style="
                                        margin-top:12px;
                                    ">

                                    <label>
                                        Admin Reply
                                    </label>

                                    <textarea
                                        class="query-reply-input"
                                        data-id="${escapeHtml(
                                            query.id
                                        )}"
                                        rows="3"
                                        placeholder="Type reply to this student...">${escapeHtml(
                                            query.reply || ""
                                        )}</textarea>

                                </div>

                                <div
                                    class="query-actions"
                                    style="
                                        margin-top:10px;
                                    ">

                                    <button
                                        type="button"
                                        class="query-reply-button"
                                        data-id="${escapeHtml(
                                            query.id
                                        )}">
                                        Send Reply
                                    </button>

                                    ${
                                        status !==
                                        "In Progress"
                                            ? `
                                                <button
                                                    type="button"
                                                    class="query-status-button"
                                                    data-id="${escapeHtml(
                                                        query.id
                                                    )}"
                                                    data-status="In Progress">
                                                    Mark In Progress
                                                </button>
                                            `
                                            : ""
                                    }

                                    ${
                                        status !==
                                        "Resolved"
                                            ? `
                                                <button
                                                    type="button"
                                                    class="query-status-button"
                                                    data-id="${escapeHtml(
                                                        query.id
                                                    )}"
                                                    data-status="Resolved">
                                                    Resolve
                                                </button>
                                            `
                                            : ""
                                    }

                                </div>

                            </div>

                        </div>
                    `;

                }).join("");


            $$(".query-reply-button")
                .forEach((button) => {

                    button.addEventListener(
                        "click",
                        async () => {

                            const queryId =
                                button.dataset.id;

                            const textarea =
                                document.querySelector(
                                    `.query-reply-input[data-id="${CSS.escape(
                                        queryId
                                    )}"]`
                                );

                            const reply =
                                textarea
                                    ? textarea.value.trim()
                                    : "";

                            if (!reply) {

                                alert(
                                    "Please enter a reply."
                                );

                                return;
                            }

                            button.disabled =
                                true;

                            try {

                                await updateQuery(
                                    queryId,
                                    "Resolved",
                                    reply
                                );

                                alert(
                                    "Reply sent successfully."
                                );

                                await loadQueries();

                            } catch (error) {

                                alert(
                                    error.message ||
                                    "Unable to send reply."
                                );

                            } finally {

                                button.disabled =
                                    false;
                            }
                        }
                    );
                });


            $$(".query-status-button")
                .forEach((button) => {

                    button.addEventListener(
                        "click",
                        async () => {

                            try {

                                await updateQuery(
                                    button.dataset.id,
                                    button.dataset.status
                                );

                                await loadQueries();

                            } catch (error) {

                                alert(
                                    error.message ||
                                    "Unable to update query."
                                );
                            }
                        }
                    );
                });

        } catch (error) {

            container.innerHTML =
                emptyMessage(
                    error.message ||
                    "Unable to load queries."
                );
        }
    }


    /* =========================================================
       EVENT FORM
    ========================================================= */

    $("eventForm")
        ?.addEventListener(
            "submit",
            async (event) => {

                event.preventDefault();

                try {

                    const formData =
                        new FormData();

                    formData.append(
                        "title",
                        $("eventTitle")
                            ?.value
                            .trim() || ""
                    );

                    formData.append(
                        "date",
                        $("eventDate")
                            ?.value || ""
                    );

                    formData.append(
                        "time",
                        $("eventTime")
                            ?.value || ""
                    );

                    formData.append(
                        "type",
                        $("eventType")
                            ?.value || ""
                    );

                    formData.append(
                        "description",
                        $("eventDescription")
                            ?.value
                            .trim() || ""
                    );

                    const media =
                        $("eventMedia")
                            ?.files?.[0];

                    if (media) {

                        formData.append(
                            "media",
                            media
                        );
                    }

                    const data =
                        await api(
                            "/api/events",
                            {
                                method: "POST",
                                body: formData
                            }
                        );

                    alert(
                        data.message ||
                        "Event added successfully."
                    );

                    event.target.reset();

                    await loadEvents();

                    await loadDashboard();

                } catch (error) {

                    alert(
                        error.message ||
                        "Unable to save event."
                    );
                }
            }
        );


    /* =========================================================
       RECORDING FORM
    ========================================================= */

    $("recordingForm")
        ?.addEventListener(
            "submit",
            async (event) => {

                event.preventDefault();

                try {

                    const formData =
                        new FormData();

                    formData.append(
                        "title",
                        $("recordingTitle")
                            ?.value
                            .trim() || ""
                    );

                    formData.append(
                        "course",
                        $("recordingCourse")
                            ?.value
                            .trim() || ""
                    );

                    formData.append(
                        "description",
                        $("recordingDescription")
                            ?.value
                            .trim() || ""
                    );

                    const file =
                        $("recordingFile")
                            ?.files?.[0];

                    if (file) {

                        formData.append(
                            "video",
                            file
                        );
                    }

                    const data =
                        await api(
                            "/api/recordings",
                            {
                                method: "POST",
                                body: formData
                            }
                        );

                    alert(
                        data.message ||
                        "Recording uploaded successfully."
                    );

                    event.target.reset();

                    await loadRecordings();

                    await loadDashboard();

                } catch (error) {

                    alert(
                        error.message ||
                        "Unable to upload recording."
                    );
                }
            }
        );


    /* =========================================================
       TASK FORM
    ========================================================= */

    $("taskForm")
        ?.addEventListener(
            "submit",
            async (event) => {

                event.preventDefault();

                try {

                    const category =
                        $("taskCategory")
                            ?.value ||
                        "College";

                    const data =
                        await api(
                            "/api/tasks",
                            {
                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body:
                                    JSON.stringify({

                                        title:
                                            $("taskTitle")
                                                ?.value
                                                .trim() || "",

                                        course:
                                            $("taskCourse")
                                                ?.value
                                                .trim() || "",

                                        category:
                                            category,

                                        mode:
                                            category,

                                        due_date:
                                            $("taskDueDate")
                                                ?.value || "",

                                        status:
                                            $("taskStatus")
                                                ?.value ||
                                            "Pending",

                                        description:
                                            $("taskDescription")
                                                ?.value
                                                .trim() || ""
                                    })
                            }
                        );

                    alert(
                        data.message ||
                        "Task created successfully."
                    );

                    event.target.reset();

                    if ($("taskCategory")) {
                        $("taskCategory").value =
                            "College";
                    }

                    await loadTasks();

                    await loadDashboard();

                } catch (error) {

                    alert(
                        error.message ||
                        "Unable to create task."
                    );
                }
            }
        );


    /* =========================================================
       MANUAL ASSESSMENT FORM
    ========================================================= */

    $("assessmentForm")
        ?.addEventListener(
            "submit",
            async (event) => {

                event.preventDefault();

                const marks =
                    Number(
                        $("assessmentMarks")
                            ?.value || 0
                    );

                const maxMarks =
                    Number(
                        $("assessmentMaxMarks")
                            ?.value || 0
                    );

                if (marks < 0) {

                    alert(
                        "Marks cannot be negative."
                    );

                    return;
                }

                if (maxMarks <= 0) {

                    alert(
                        "Maximum marks must be greater than 0."
                    );

                    return;
                }

                if (marks > maxMarks) {

                    alert(
                        "Marks cannot be greater than maximum marks."
                    );

                    return;
                }

                try {

                    const data =
                        await api(
                            "/api/assessments",
                            {
                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body:
                                    JSON.stringify({

                                        student_id:
                                            $("assessmentStudentId")
                                                ?.value
                                                .trim() || "",

                                        title:
                                            $("assessmentTitle")
                                                ?.value
                                                .trim() || "",

                                        marks,

                                        max_marks:
                                            maxMarks,

                                        remarks:
                                            $("assessmentRemarks")
                                                ?.value
                                                .trim() || ""
                                    })
                            }
                        );

                    alert(
                        data.message ||
                        "Assessment saved successfully."
                    );

                    event.target.reset();

                    updateAssessmentPreview();

                    await loadAssessments();

                } catch (error) {

                    alert(
                        error.message ||
                        "Unable to save assessment."
                    );
                }
            }
        );


    /* =========================================================
       PLACEMENT FORM
    ========================================================= */

    $("placementForm")
        ?.addEventListener(
            "submit",
            async (event) => {

                event.preventDefault();

                try {

                    const formData =
                        new FormData();

                    formData.append(
                        "title",
                        $("placementTitle")
                            ?.value
                            .trim() || ""
                    );

                    formData.append(
                        "date",
                        $("placementDate")
                            ?.value || ""
                    );

                    formData.append(
                        "description",
                        $("placementDescription")
                            ?.value
                            .trim() || ""
                    );

                    const media =
                        $("placementMedia")
                            ?.files?.[0];

                    if (media) {

                        formData.append(
                            "media",
                            media
                        );
                    }

                    const data =
                        await api(
                            "/api/placements",
                            {
                                method: "POST",
                                body: formData
                            }
                        );

                    alert(
                        data.message ||
                        "Placement added successfully."
                    );

                    event.target.reset();

                    await loadPlacements();

                    await loadDashboard();

                } catch (error) {

                    alert(
                        error.message ||
                        "Unable to save placement."
                    );
                }
            }
        );


    /* =========================================================
       QUICK ACTIONS
    ========================================================= */

    $("addEventButton")
        ?.addEventListener(
            "click",
            () => showSection("events")
        );

    $("addRecordingButton")
        ?.addEventListener(
            "click",
            () => showSection("recordings")
        );

    $("addTaskButton")
        ?.addEventListener(
            "click",
            () => showSection("tasks")
        );

    $("addAssessmentButton")
        ?.addEventListener(
            "click",
            () => showSection("assessments")
        );

    $("addPlacementButton")
        ?.addEventListener(
            "click",
            () => showSection("placements")
        );


    /* =========================================================
       ASSESSMENT TABS
    ========================================================= */

    $("manualAssessmentTab")
        ?.addEventListener(
            "click",
            () => {

                if ($("manualAssessmentPanel")) {

                    $("manualAssessmentPanel")
                        .style.display =
                        "block";
                }

                if ($("mcqAssessmentPanel")) {

                    $("mcqAssessmentPanel")
                        .style.display =
                        "none";
                }
            }
        );


    $("mcqAssessmentTab")
        ?.addEventListener(
            "click",
            async () => {

                if ($("manualAssessmentPanel")) {

                    $("manualAssessmentPanel")
                        .style.display =
                        "none";
                }

                if ($("mcqAssessmentPanel")) {

                    $("mcqAssessmentPanel")
                        .style.display =
                        "block";
                }

                await loadMcqAssessments();

                await loadMcqResults();
            }
        );


    /* =========================================================
       LOGOUT
    ========================================================= */

    const logoutLinks =
        Array.from(
            document.querySelectorAll(
                'a[href="index.html"]'
            )
        ).filter((link) =>
            link.textContent
                .toLowerCase()
                .includes("logout")
        );


    logoutLinks.forEach((link) => {

        link.addEventListener(
            "click",
            async (event) => {

                event.preventDefault();

                try {

                    await api(
                        "/api/admin/logout",
                        {
                            method: "POST"
                        }
                    );

                } catch (error) {

                    console.error(
                        "Logout error:",
                        error
                    );
                }

                localStorage.removeItem(
                    "adminUser"
                );

                window.location.href =
                    "index.html";
            }
        );
    });


    /* =========================================================
       INITIAL SETUP
    ========================================================= */

    renderMcqQuestions();

    setupTaskCategoryField();

    const initialSection =
        location.hash
            ? location.hash.substring(1)
            : "dashboard";

    showSection(
        initialSection
    );

});
/* =========================================================
   TASK SUBMISSIONS, CATEGORIZATION & ADMIN REPLY
========================================================= */

async function loadTasks() {
    const container = $("taskList") || document.getElementById("taskList");
    if (!container) return;

    try {
       const [taskData, submissionData] = await Promise.all([
     api("/api/tasks"),
     api("/api/task-submissions")
     ]);

        const tasks = Array.isArray(taskData.tasks) ? taskData.tasks : [];

       const submissions =
    Array.isArray(submissionsData.submissions)
        ? submissionsData.submissions
        : Array.isArray(submissionsData.tasks)
        ? submissionsData.tasks
        : [];

        if (!tasks.length && !submissions.length) {
            container.innerHTML = `<div class="content-placeholder" style="padding:20px; text-align:center; color:#6b7280;"><p>No tasks or task submissions found.</p></div>`;
            return;
        }

        const categories = ["Bootcamp", "College", "Webinar"];

        container.innerHTML = categories.map((category) => {
            const categorySubmissions = submissions.filter((sub) =>
                String(sub.category || "College").toLowerCase() === category.toLowerCase()
            );

            const icon = category === "Bootcamp" ? "🎓" : category === "College" ? "🏫" : "🎤";

            return `
                <div class="task-category-section" style="margin-bottom:25px;">
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
                        <h3 style="margin:0;">${icon} ${category} Submissions</h3>
                        <span class="status">${categorySubmissions.length}</span>
                    </div>

                    ${categorySubmissions.length ? categorySubmissions.map((sub) => `
                        <div class="management-list-item" style="margin-bottom:12px; border:1px solid #e5e7eb; padding:15px; border-radius:8px; background:#fafafa;">
                            <strong>Student ID: ${sub.student_id || "N/A"}</strong>
                            <p style="margin:4px 0;"><strong>College/Event:</strong> ${sub.college || "-"} / ${sub.event_name || "-"}</p>
                            <p style="margin:4px 0;"><strong>Task:</strong> ${sub.task_name || "-"}</p>
                            <p style="margin:4px 0;">
                                <strong>GitHub Link:</strong>
                                <a href="${sub.github_link || "#"}" target="_blank" rel="noopener" style="color:#0066cc; font-weight:600;">
                                    ${sub.github_link || "No Link Provided"}
                                </a>
                            </p>
                            <span class="status ${sub.status === 'Reviewed' ? 'resolved' : 'pending'}" style="display:inline-block; margin-top:5px;">
                                ${sub.status || "Submitted"}
                            </span>

                            ${sub.admin_reply ? `
                                <div class="existing-reply" style="margin-top:10px; padding:10px; background:#eef2ff; border-left:4px solid #4f46e5; border-radius:4px;">
                                    <strong>Admin Reply:</strong> ${sub.admin_reply}
                                </div>
                            ` : ""}
                             
                            <div class="query-reply-area" style="margin-top:10px; display:flex; gap:10px;">
                                <textarea id="replyMsg_${sub.id}" placeholder="Enter your reply for this GitHub submission..." style="flex:1; padding:8px; border:1px solid #ccc; border-radius:4px; height:40px;"></textarea>
                               <button onclick="reviewSubmission(${sub.id})">
    Review
</button>
                            </div>
                        </div>
                    `).join("") : `<div class="content-placeholder"><p style="color:#888;">No submissions under ${category}.</p></div>`}
                </div>
            `;
        }).join("");

    } catch (error) {
        container.innerHTML = `<div class="content-placeholder" style="padding:20px; text-align:center; color:#6b7280;"><p>${error.message || "Unable to load task submissions."}</p></div>`;
    }
}

window.submitTaskReply = async function(submissionId) {
    const replyText = document.getElementById(`replyMsg_${submissionId}`)?.value.trim();
    if (!replyText) {
        alert("Please write a reply before submitting.");
        return;
    }

    try {
        const res = await api(`/api/task-submissions/${submissionId}/reply`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ admin_reply: replyText })
        });
        alert(res.message || "Reply sent successfully.");
        await loadTasks();
    } catch (error) {
        alert(error.message || "Failed to send reply.");
    }
};

/* =========================================================
   ADD 50 STUDENTS (DYNAMIC FRESH MODAL & BATCH POST)
========================================================= */

window.openAddStudentModal = function() {
    const existingModal = document.getElementById("addStudentModal");
    if (existingModal) existingModal.remove();

    const modal = document.createElement("div");
    modal.id = "addStudentModal";
    modal.className = "edit-student-modal";

    const rows = Array.from({ length: 50 }, (_, index) => {
        return `
            <tr>
                <td style="text-align:center; font-weight:600;">${index + 1}</td>
                <td><input type="text" class="bulk-student-input" data-field="student_id" data-row="${index}" placeholder="Student ID"></td>
                <td><input type="text" class="bulk-student-input" data-field="name" data-row="${index}" placeholder="Name"></td>
                <td><input type="text" class="bulk-student-input" data-field="username" data-row="${index}" placeholder="Username"></td>
                <td><input type="password" class="bulk-student-input" data-field="password" data-row="${index}" placeholder="Password"></td>
                <td><input type="email" class="bulk-student-input" data-field="email" data-row="${index}" placeholder="Email"></td>
                <td><input type="text" class="bulk-student-input" data-field="course" data-row="${index}" placeholder="Course"></td>
                <td>
                    <select class="bulk-student-input" data-field="status" data-row="${index}">
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                </td>
            </tr>
        `;
    }).join("");

    modal.innerHTML = `
        <div class="edit-student-modal-content" style="width:96%; max-width:1500px; max-height:92vh; overflow:hidden; background:#fff; padding:20px; border-radius:12px; position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); z-index:9999; box-shadow:0 5px 20px rgba(0,0,0,0.2);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h2 style="margin:0;">Add 50 Students</h2>
                <button type="button" id="closeAddStudentModal" style="background:none; border:none; font-size:24px; cursor:pointer;">×</button>
            </div>
            <form id="addStudentForm">
                <div style="overflow:auto; max-height:60vh; border:1px solid #e5e7eb; border-radius:10px;">
                    <table style="width:100%; min-width:1250px; border-collapse:collapse;">
                        <thead>
                            <tr style="position:sticky; top:0; background:#f8fafc; z-index:2;">
                                <th style="padding:10px; border-bottom:1px solid #ddd;">S.No</th>
                                <th style="padding:10px; border-bottom:1px solid #ddd;">Student ID</th>
                                <th style="padding:10px; border-bottom:1px solid #ddd;">Name</th>
                                <th style="padding:10px; border-bottom:1px solid #ddd;">Username</th>
                                <th style="padding:10px; border-bottom:1px solid #ddd;">Password</th>
                                <th style="padding:10px; border-bottom:1px solid #ddd;">Email</th>
                                <th style="padding:10px; border-bottom:1px solid #ddd;">Course</th>
                                <th style="padding:10px; border-bottom:1px solid #ddd;">Status</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
                <div class="edit-form-actions" style="display:flex; justify-content:flex-end; gap:10px; margin-top:15px;">
                    <button type="button" id="cancelAddStudent" style="padding:8px 16px; border-radius:6px; cursor:pointer;">Cancel</button>
                    <button type="submit" id="addAllStudentsButton" style="padding:8px 16px; background:#172033; color:#fff; border:none; border-radius:6px; cursor:pointer;">Add Students</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
    document.getElementById("closeAddStudentModal")?.addEventListener("click", () => modal.remove());
    document.getElementById("cancelAddStudent")?.addEventListener("click", () => modal.remove());
    document.getElementById("addStudentForm")?.addEventListener("submit", addAllStudents);
};

async function addAllStudents(event) {
    event.preventDefault();
    const rows = [];

    for (let i = 0; i < 50; i++) {
        const student_id = document.querySelector(`.bulk-student-input[data-row="${i}"][data-field="student_id"]`)?.value.trim() || "";
        const name = document.querySelector(`.bulk-student-input[data-row="${i}"][data-field="name"]`)?.value.trim() || "";
        const username = document.querySelector(`.bulk-student-input[data-row="${i}"][data-field="username"]`)?.value.trim() || "";
        const password = document.querySelector(`.bulk-student-input[data-row="${i}"][data-field="password"]`)?.value.trim() || "";
        const email = document.querySelector(`.bulk-student-input[data-row="${i}"][data-field="email"]`)?.value.trim() || "";
        const course = document.querySelector(`.bulk-student-input[data-row="${i}"][data-field="course"]`)?.value.trim() || "";
        const status = document.querySelector(`.bulk-student-input[data-row="${i}"][data-field="status"]`)?.value || "Active";

        if (student_id || name || username || password || email || course) {
            rows.push({ student_id, name, username, password, email, course, status });
        }
    }

    if (!rows.length) {
        alert("Please fill at least one student row.");
        return;
    }

    try {
        const data = await api("/api/students/bulk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ students: rows })
        });
        alert(data.message || "Students added successfully.");
        document.getElementById("addStudentModal")?.remove();
        if (typeof loadStudents === "function") await loadStudents();
        if (typeof loadDashboard === "function") await loadDashboard();
    } catch (error) {
        alert(error.message || "Unable to add students.");
    }
}