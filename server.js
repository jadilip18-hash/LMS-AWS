const express = require("express");
const mysql = require("mysql2");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const fs = require("fs");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

/* ==========================================
   UPLOAD FOLDER
========================================== */

const uploadFolder = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadFolder)) {
    fs.mkdirSync(uploadFolder, { recursive: true });
}

app.use(
    "/uploads",
    express.static(uploadFolder)
);


/* ==========================================
   MULTER STORAGE
========================================== */

const storage = multer.diskStorage({

    destination: (req, file, cb) => {
        cb(null, uploadFolder);
    },

    filename: (req, file, cb) => {

        const extension =
            path.extname(file.originalname);

        const fileName =
            Date.now() +
            "-" +
            crypto.randomBytes(6).toString("hex") +
            extension;

        cb(null, fileName);
    }

});

const upload = multer({
    storage
});


/* ==========================================
   MYSQL CONNECTION
========================================== */

const db = mysql.createConnection({

    host: "localhost",

    user: "root",

    password: "Harsha@356",

    database: "student_dashboard"

});


db.connect(error => {

    if (error) {

        console.log(
            "MySQL connection failed."
        );

        console.log(
            error.message
        );

        return;
    }

    console.log(
        "MySQL connected successfully."
    );

    initializeDatabase();

});


/* ==========================================
   DATABASE INITIALIZATION
========================================== */

function initializeDatabase() {

    const tables = [

        `
        CREATE TABLE IF NOT EXISTS assessments(

            id INT AUTO_INCREMENT PRIMARY KEY,

            student_id VARCHAR(100) NOT NULL,

            title VARCHAR(255) NOT NULL,

            marks DECIMAL(10,2)
                NOT NULL DEFAULT 0,

            max_marks DECIMAL(10,2)
                NOT NULL DEFAULT 100,

            remarks TEXT,

            created_at TIMESTAMP
                DEFAULT CURRENT_TIMESTAMP,

            updated_at TIMESTAMP
                DEFAULT CURRENT_TIMESTAMP
                ON UPDATE CURRENT_TIMESTAMP

        )
        `,

        `
        CREATE TABLE IF NOT EXISTS events(

            id INT AUTO_INCREMENT PRIMARY KEY,

            title VARCHAR(255) NOT NULL,

            date VARCHAR(100),

            time VARCHAR(100),

            type VARCHAR(100),

            description TEXT,

            media_path VARCHAR(500),

            media_type VARCHAR(20),

            created_at TIMESTAMP
                DEFAULT CURRENT_TIMESTAMP

        )
        `,

        `
        CREATE TABLE IF NOT EXISTS recordings(

            id INT AUTO_INCREMENT PRIMARY KEY,

            title VARCHAR(255) NOT NULL,

            course VARCHAR(255),

            description TEXT,

            file_name VARCHAR(255),

            file_path VARCHAR(500),

            created_at TIMESTAMP
                DEFAULT CURRENT_TIMESTAMP

        )
        `,

        `
        CREATE TABLE IF NOT EXISTS tasks(

            id INT AUTO_INCREMENT PRIMARY KEY,

            title VARCHAR(255) NOT NULL,

            course VARCHAR(255),

            due_date VARCHAR(100),

            status VARCHAR(100),

            description TEXT,

            created_at TIMESTAMP
                DEFAULT CURRENT_TIMESTAMP

        )
        `, `
    CREATE TABLE IF NOT EXISTS task_submissions(
        id INT AUTO_INCREMENT PRIMARY KEY,
        task_id INT NOT NULL,
        student_id VARCHAR(100) NOT NULL,
        category VARCHAR(255),
        subject VARCHAR(255) NOT NULL,
        college VARCHAR(255) NOT NULL,
        event_name VARCHAR(255) NOT NULL,
        task_name VARCHAR(255) NOT NULL,
        github_link VARCHAR(500) NOT NULL,
        status VARCHAR(100) DEFAULT 'Submitted',
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_task_student (task_id, student_id),
        INDEX idx_task_submissions_task (task_id),
        INDEX idx_task_submissions_student (student_id),
        INDEX idx_task_submissions_category (category)
    )
`,

        `
        CREATE TABLE IF NOT EXISTS placements(

            id INT AUTO_INCREMENT PRIMARY KEY,

            title VARCHAR(255) NOT NULL,

            date VARCHAR(100),

            description TEXT,

            media_path VARCHAR(500),

            media_type VARCHAR(20),

            created_at TIMESTAMP
                DEFAULT CURRENT_TIMESTAMP

        )
        `,

        `
        CREATE TABLE IF NOT EXISTS mcq_assessments(

            id INT AUTO_INCREMENT PRIMARY KEY,

            title VARCHAR(255) NOT NULL,

            description TEXT,

            start_time DATETIME NOT NULL,

            end_time DATETIME NOT NULL,

            created_at TIMESTAMP
                DEFAULT CURRENT_TIMESTAMP

        )
        `,

        `
        CREATE TABLE IF NOT EXISTS mcq_questions(

            id INT AUTO_INCREMENT PRIMARY KEY,

            assessment_id INT NOT NULL,

            question_text TEXT NOT NULL,

            option_a TEXT NOT NULL,

            option_b TEXT NOT NULL,

            option_c TEXT NOT NULL,

            option_d TEXT NOT NULL,

            correct_option VARCHAR(1) NOT NULL,

            marks DECIMAL(10,2)
                NOT NULL DEFAULT 1,

            created_at TIMESTAMP
                DEFAULT CURRENT_TIMESTAMP,

            INDEX(assessment_id)

        )
        `,

        `
        CREATE TABLE IF NOT EXISTS mcq_submissions(

            id INT AUTO_INCREMENT PRIMARY KEY,

            assessment_id INT NOT NULL,

            student_id VARCHAR(100) NOT NULL,

            total_marks DECIMAL(10,2)
                NOT NULL DEFAULT 0,

            obtained_marks DECIMAL(10,2)
                NOT NULL DEFAULT 0,

            percentage DECIMAL(10,2)
                NOT NULL DEFAULT 0,

            grade VARCHAR(10) NOT NULL,

            submitted_at TIMESTAMP
                DEFAULT CURRENT_TIMESTAMP,

            UNIQUE KEY
                unique_submission
                (assessment_id, student_id),

            INDEX(student_id)

        )
        `,

        `
        CREATE TABLE IF NOT EXISTS mcq_answers(

            id INT AUTO_INCREMENT PRIMARY KEY,

            submission_id INT NOT NULL,

            question_id INT NOT NULL,

            selected_option VARCHAR(1),

            is_correct TINYINT(1)
                NOT NULL DEFAULT 0,

            marks_awarded DECIMAL(10,2)
                NOT NULL DEFAULT 0,

            INDEX(submission_id),

            INDEX(question_id)

        )
        `,

        `
        CREATE TABLE IF NOT EXISTS notifications(

            id INT AUTO_INCREMENT PRIMARY KEY,

            student_id VARCHAR(100) NULL,

            title VARCHAR(255) NOT NULL,

            message TEXT NOT NULL,

            type VARCHAR(50)
                DEFAULT 'general',

            is_read TINYINT(1)
                NOT NULL DEFAULT 0,

            created_at TIMESTAMP
                DEFAULT CURRENT_TIMESTAMP,

            INDEX(student_id),

            INDEX(is_read)

        )
        `

    ];


    let completed = 0;


    tables.forEach(sql => {

        db.query(
            sql,
            error => {

                if (error) {

                    console.log(
                        "Table creation error:",
                        error.message
                    );

                }


                completed++;


                if (
                    completed ===
                    tables.length
                ) {

                    ensureReplyColumn();

                    ensureEventMediaColumns();

                    ensurePlacementMediaColumns();

                }

            }
        );

    });

}


/* ==========================================
   QUERY REPLY COLUMN
========================================== */

function ensureReplyColumn() {

    const sql = `
        SELECT COUNT(*) AS count

        FROM INFORMATION_SCHEMA.COLUMNS

        WHERE TABLE_SCHEMA = DATABASE()

        AND TABLE_NAME = 'student_queries'

        AND COLUMN_NAME = 'reply'
    `;


    db.query(
        sql,
        (error, results) => {

            if (error) {

                console.log(
                    "Reply column check error:",
                    error.message
                );

                return;
            }


            if (
                results &&
                results[0] &&
                results[0].count > 0
            ) {

                console.log(
                    "Query reply column is ready."
                );

                return;
            }


            db.query(
                `
                ALTER TABLE student_queries

                ADD COLUMN reply TEXT NULL

                AFTER message
                `,
                alterError => {

                    if (alterError) {

                        console.log(
                            "Reply column creation error:",
                            alterError.message
                        );

                    } else {

                        console.log(
                            "Query reply column added successfully."
                        );

                    }

                }
            );

        }
    );

}


/* ==========================================
   EVENT MEDIA COLUMNS
========================================== */

function ensureEventMediaColumns() {

    const columns = [

        {
            name: "media_path",

            sql: `
                ALTER TABLE events

                ADD COLUMN media_path
                VARCHAR(500) NULL
            `
        },

        {
            name: "media_type",

            sql: `
                ALTER TABLE events

                ADD COLUMN media_type
                VARCHAR(20) NULL
            `
        }

    ];


    let completed = 0;


    columns.forEach(column => {

        const checkSql = `
            SELECT COUNT(*) AS count

            FROM INFORMATION_SCHEMA.COLUMNS

            WHERE TABLE_SCHEMA = DATABASE()

            AND TABLE_NAME = 'events'

            AND COLUMN_NAME = ?
        `;


        db.query(
            checkSql,
            [column.name],
            (error, results) => {

                if (error) {

                    console.log(
                        "Event media column check error:",
                        error.message
                    );

                    completed++;

                    return;
                }


                if (
                    results &&
                    results[0] &&
                    results[0].count > 0
                ) {

                    completed++;

                    return;
                }


                db.query(
                    column.sql,
                    alterError => {

                        if (alterError) {

                            console.log(
                                "Event media column creation error:",
                                alterError.message
                            );

                        } else {

                            console.log(
                                column.name +
                                " column added successfully."
                            );

                        }


                        completed++;

                    }
                );

            }
        );

    });

}


/* ==========================================
   PLACEMENT MEDIA COLUMNS
========================================== */

function ensurePlacementMediaColumns() {

    const columns = [

        {
            name: "media_path",

            sql: `
                ALTER TABLE placements

                ADD COLUMN media_path
                VARCHAR(500) NULL
            `
        },

        {
            name: "media_type",

            sql: `
                ALTER TABLE placements

                ADD COLUMN media_type
                VARCHAR(20) NULL
            `
        }

    ];


    columns.forEach(column => {

        db.query(
            `
            SELECT COUNT(*) AS count

            FROM INFORMATION_SCHEMA.COLUMNS

            WHERE TABLE_SCHEMA = DATABASE()

            AND TABLE_NAME = 'placements'

            AND COLUMN_NAME = ?
            `,
            [column.name],
            (error, results) => {

                if (error) {

                    console.log(
                        "Placement media column check error:",
                        error.message
                    );

                    return;
                }


                if (
                    results &&
                    results[0] &&
                    results[0].count > 0
                ) {

                    return;
                }


                db.query(
                    column.sql,
                    alterError => {

                        if (alterError) {

                            console.log(
                                "Placement media column creation error:",
                                alterError.message
                            );

                        } else {

                            console.log(
                                column.name +
                                " column added successfully."
                            );

                        }

                    }
                );

            }
        );

    });

}


/* ==========================================
   GRADE CALCULATION
========================================== */

function calculateGrade(percentage) {

    if (percentage >= 90) {
        return "A+";
    }

    if (percentage >= 80) {
        return "A";
    }

    if (percentage >= 70) {
        return "B+";
    }

    if (percentage >= 60) {
        return "B";
    }

    if (percentage >= 50) {
        return "C";
    }

    if (percentage >= 40) {
        return "D";
    }

    return "F";

}


/* ==========================================
   DATE NORMALIZATION
========================================== */

function normalizeDateTime(value) {

    const raw =
        String(value || "").trim();


    if (!raw) {
        return null;
    }


    return raw.replace(
        "T",
        " "
    );

}


/* ==========================================
   GLOBAL NOTIFICATION
========================================== */

function createGlobalNotification(
    title,
    message,
    type = "general"
) {

    return new Promise(
        (resolve, reject) => {

            db.query(
                `
                INSERT INTO notifications
                (
                    student_id,
                    title,
                    message,
                    type
                )

                VALUES
                (
                    NULL,
                    ?,
                    ?,
                    ?
                )
                `,
                [
                    title,
                    message,
                    type
                ],
                (error, result) => {

                    if (error) {

                        reject(error);

                    } else {

                        resolve(result);

                    }

                }
            );

        }
    );

}


/* ==========================================
   STUDENT NOTIFICATION
========================================== */

function createStudentNotification(
    studentId,
    title,
    message,
    type = "general"
) {

    return new Promise(
        (resolve, reject) => {

            db.query(
                `
                INSERT INTO notifications
                (
                    student_id,
                    title,
                    message,
                    type
                )

                VALUES
                (
                    ?,
                    ?,
                    ?,
                    ?
                )
                `,
                [
                    studentId,
                    title,
                    message,
                    type
                ],
                (error, result) => {

                    if (error) {

                        reject(error);

                    } else {

                        resolve(result);

                    }

                }
            );

        }
    );

}


/* ==========================================
   ADMIN SESSION
========================================== */

const adminSessions =
    new Map();


function getCookie(
    req,
    cookieName
) {

    const cookies =
        req.headers.cookie;


    if (!cookies) {
        return null;
    }


    const cookieList =
        cookies.split(";");


    for (
        const cookie
        of cookieList
    ) {

        const parts =
            cookie
                .trim()
                .split("=");


        const name =
            parts.shift();


        const value =
            parts.join("=");


        if (
            name ===
            cookieName
        ) {

            return decodeURIComponent(
                value
            );

        }

    }


    return null;

}


/* ==========================================
   ADMIN COOKIE
========================================== */

function setAdminCookie(
    res,
    token
) {

    res.setHeader(
        "Set-Cookie",

        `adminSession=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Strict`
    );

}


function clearAdminCookie(
    res
) {

    res.setHeader(
        "Set-Cookie",

        "adminSession=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict"
    );

}


/* ==========================================
   ADMIN AUTHENTICATION
========================================== */

function requireAdmin(
    req,
    res,
    next
) {

    const token =
        getCookie(
            req,
            "adminSession"
        );


    if (!token) {

        return res
            .status(401)
            .json({

                success: false,

                message:
                    "Admin access required."

            });

    }


    const session =
        adminSessions.get(
            token
        );


    if (!session) {

        return res
            .status(401)
            .json({

                success: false,

                message:
                    "Admin session expired. Please login again."

            });

    }


    req.admin =
        session;


    next();

}


/* ==========================================
   MAIN PAGE
========================================== */

app.get(
    "/",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "index.html"
            )
        );

    }
);


/* ==========================================
   HEALTH CHECK
========================================== */

app.get(
    "/api/health",
    (req, res) => {

        res.json({

            success: true,

            message:
                "Server is working correctly."

        });

    }
);


/* ==========================================
   STUDENT LOGIN
========================================== */

app.post(
    "/api/student/login",
    (req, res) => {

        const username =
            req.body.username;

        const password =
            req.body.password;


        if (
            !username ||
            !password
        ) {

            return res
                .status(400)
                .json({

                    success: false,

                    message:
                        "Username and password are required."

                });

        }


        db.query(
            `
            SELECT
                id,
                student_id,
                name,
                username,
                email,
                course,
                status

            FROM students

            WHERE username = ?

            AND password = ?

            LIMIT 1
            `,
            [
                username,
                password
            ],
            (error, results) => {

                if (error) {

                    console.log(
                        "Student login error:",
                        error.message
                    );

                    return res
                        .status(500)
                        .json({

                            success: false,

                            message:
                                "Database error."

                        });

                }


                if (!results.length) {

                    return res
                        .status(401)
                        .json({

                            success: false,

                            message:
                                "Invalid username or password."

                        });

                }


                const student =
                    results[0];


                if (
                    student.status &&
                    student.status !==
                    "Active"
                ) {

                    return res
                        .status(403)
                        .json({

                            success: false,

                            message:
                                "Student account is inactive."

                        });

                }


                return res.json({

                    success: true,

                    message:
                        "Student login successful.",

                    student: {

                        id:
                            student.id,

                        student_id:
                            student.student_id,

                        name:
                            student.name,

                        username:
                            student.username,

                        email:
                            student.email,

                        course:
                            student.course,

                        status:
                            student.status

                    }

                });

            }
        );

    }
);


/* ==========================================
   ADMIN LOGIN
========================================== */

app.post(
    "/api/admin/login",
    (req, res) => {

        const username =
            String(
                req.body.username || ""
            ).trim();

        const password =
            String(
                req.body.password || ""
            ).trim();


        if (
            !username ||
            !password
        ) {

            return res
                .status(400)
                .json({

                    success: false,

                    message:
                        "Username and password are required."

                });

        }


        db.query(
            `
            SELECT
                id,
                name,
                username,
                email

            FROM admins

            WHERE username = ?

            AND password = ?

            LIMIT 1
            `,
            [
                username,
                password
            ],
            (error, results) => {

                if (error) {

                    console.log(
                        "Admin login error:",
                        error.message
                    );

                    return res
                        .status(500)
                        .json({

                            success: false,

                            message:
                                "Database error."

                        });

                }


                if (!results.length) {

                    return res
                        .status(401)
                        .json({

                            success: false,

                            message:
                                "Invalid admin username or password."

                        });

                }


                const admin =
                    results[0];


                const token =
                    crypto
                        .randomBytes(32)
                        .toString("hex");


                adminSessions.set(
                    token,
                    {

                        id:
                            admin.id,

                        name:
                            admin.name,

                        username:
                            admin.username,

                        email:
                            admin.email

                    }
                );


                setAdminCookie(
                    res,
                    token
                );


                return res.json({

                    success: true,

                    message:
                        "Admin login successful.",

                    admin: {

                        id:
                            admin.id,

                        name:
                            admin.name,

                        username:
                            admin.username,

                        email:
                            admin.email

                    }

                });

            }
        );

    }
);


/* ==========================================
   ADMIN LOGOUT
========================================== */

app.post(
    "/api/admin/logout",
    requireAdmin,
    (req, res) => {

        const token =
            getCookie(
                req,
                "adminSession"
            );


        if (token) {

            adminSessions.delete(
                token
            );

        }


        clearAdminCookie(
            res
        );


        return res.json({

            success: true,

            message:
                "Admin logout successful."

        });

    }
);


/* ==========================================
   ADMIN SESSION CHECK
========================================== */

app.get(
    "/api/admin/me",
    requireAdmin,
    (req, res) => {

        return res.json({

            success: true,

            admin:
                req.admin

        });

    }
);
/* ==========================================
   GET ALL STUDENTS (2000 STUDENTS)
========================================== */

app.get("/api/student/:studentId/task-submissions", (req, res) => {

    db.query(
        `SELECT
            event_name,
            task_name,
            github_link,
            marks,
            reply,
            review,
            status,
            submission_status,
            reviewed_at
        FROM task_submissions
        WHERE student_id = ?
        ORDER BY created_at DESC`,
        [req.params.studentId],
        (err, results) => {

            if (err) return res.json({ success: false });

           res.json({
    success: true,
    submissions: results
});
        }
    );

});
/* ==========================================
   GET ALL STUDENTS
========================================== */

app.get("/api/students", (req, res) => {
    db.query(
        `SELECT id, student_id, name, username, email, course, status
         FROM students
         ORDER BY student_id ASC`,
        (error, results) => {
            if (error) {
                console.log("Student fetch error:", error.message);

                return res.status(500).json({
                    success: false,
                    message: "Unable to fetch students."
                });
            }

            res.json({
                success: true,
                students: results
            });
        }
    );
});
/* ==========================================
   GET SINGLE STUDENT
========================================== */

app.get(
    "/api/students/:studentId",
    (req, res) => {

        const studentId =
            String(
                req.params.studentId || ""
            ).trim();


        if (!studentId) {

            return res
                .status(400)
                .json({

                    success: false,

                    message:
                        "Student ID is required."

                });

        }


        db.query(
            `
            SELECT
                id,
                student_id,
                name,
                username,
                email,
                course,
                status

            FROM students

            WHERE student_id = ?

            LIMIT 1
            `,
            [
                studentId
            ],
            (error, results) => {

                if (error) {

                    return res
                        .status(500)
                        .json({

                            success: false,

                            message:
                                "Database error."

                        });

                }


                if (
                    results.length === 0
                ) {

                    return res
                        .status(404)
                        .json({

                            success: false,

                            message:
                                "Student not found."

                        });

                }


                return res.json({

                    success: true,

                    student:
                        results[0]

                });

            }
        );

    }
);


/* ==========================================
   ADD STUDENT
========================================== */

app.post(
    "/api/students",
    requireAdmin,
    (req, res) => {

        const studentId =
            String(
                req.body.student_id || ""
            ).trim();

        const name =
            String(
                req.body.name || ""
            ).trim();

        const username =
            String(
                req.body.username || ""
            ).trim();

        const email =
            String(
                req.body.email || ""
            ).trim();

        const password =
            String(
                req.body.password || ""
            ).trim();

        const course =
            String(
                req.body.course || ""
            ).trim();

        const status =
            String(
                req.body.status ||
                "Active"
            ).trim();


        if (
            !studentId ||
            !name ||
            !username ||
            !email ||
            !password ||
            !course
        ) {

            return res
                .status(400)
                .json({

                    success: false,

                    message:
                        "All student details are required."

                });

        }


        db.query(
            `
            INSERT INTO students
            (
                student_id,
                name,
                username,
                email,
                password,
                course,
                status
            )

            VALUES
            (
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?
            )
            `,
            [
                studentId,
                name,
                username,
                email,
                password,
                course,
                status
            ],
            (error, result) => {

                if (error) {

                    console.log(
                        "Student create error:",
                        error.message
                    );


                    if (
                        error.code ===
                        "ER_DUP_ENTRY"
                    ) {

                        return res
                            .status(409)
                            .json({

                                success: false,

                                message:
                                    "Student ID, username or email already exists."

                            });

                    }


                    return res
                        .status(500)
                        .json({

                            success: false,

                            message:
                                "Unable to create student."

                        });

                }


                return res
                    .status(201)
                    .json({

                        success: true,

                        message:
                            "Student created successfully.",

                        studentId:
                            result.insertId

                    });

            }
        );

    }
);


/* ==========================================
   UPDATE STUDENT
========================================== */

app.put(
    "/api/students/:studentId",
    requireAdmin,
    (req, res) => {

        const oldStudentId =
            String(
                req.params.studentId || ""
            ).trim();

        const newStudentId =
            String(
                req.body.student_id ||
                oldStudentId
            ).trim();

        const name =
            String(
                req.body.name || ""
            ).trim();

        const username =
            String(
                req.body.username || ""
            ).trim();

        const email =
            String(
                req.body.email || ""
            ).trim();

        const course =
            String(
                req.body.course || ""
            ).trim();

        const status =
            String(
                req.body.status || ""
            ).trim();


        if (
            !oldStudentId ||
            !newStudentId ||
            !name ||
            !username ||
            !email ||
            !course ||
            !status
        ) {

            return res
                .status(400)
                .json({

                    success: false,

                    message:
                        "All student details are required."

                });

        }


        if (
            ![
                "Active",
                "Inactive"
            ].includes(status)
        ) {

            return res
                .status(400)
                .json({

                    success: false,

                    message:
                        "Invalid student status."

                });

        }


        db.query(
            `
            SELECT id

            FROM students

            WHERE student_id = ?

            LIMIT 1
            `,
            [
                oldStudentId
            ],
            (checkError, found) => {

                if (checkError) {

                    return res
                        .status(500)
                        .json({

                            success: false,

                            message:
                                "Database error."

                        });

                }


                if (!found.length) {

                    return res
                        .status(404)
                        .json({

                            success: false,

                            message:
                                "Student not found."

                        });

                }


                db.query(
                    `
                    SELECT id

                    FROM students

                    WHERE student_id = ?

                    AND student_id <> ?

                    LIMIT 1
                    `,
                    [
                        newStudentId,
                        oldStudentId
                    ],
                    (idError, duplicate) => {

                        if (idError) {

                            return res
                                .status(500)
                                .json({

                                    success: false,

                                    message:
                                        "Database error."

                                });

                        }


                        if (
                            duplicate.length
                        ) {

                            return res
                                .status(409)
                                .json({

                                    success: false,

                                    message:
                                        "Student ID already exists."

                                });

                        }


                        db.query(
                            `
                            UPDATE students

                            SET
                                student_id = ?,
                                name = ?,
                                username = ?,
                                email = ?,
                                course = ?,
                                status = ?

                            WHERE student_id = ?
                            `,
                            [
                                newStudentId,
                                name,
                                username,
                                email,
                                course,
                                status,
                                oldStudentId
                            ],
                            (updateError, result) => {

                                if (updateError) {

                                    if (
                                        updateError.code ===
                                        "ER_DUP_ENTRY"
                                    ) {

                                        return res
                                            .status(409)
                                            .json({

                                                success: false,

                                                message:
                                                    "Student ID, username or email already exists."

                                            });

                                    }


                                    return res
                                        .status(500)
                                        .json({

                                            success: false,

                                            message:
                                                "Unable to update student."

                                        });

                                }


                                if (
                                    !result.affectedRows
                                ) {

                                    return res
                                        .status(404)
                                        .json({

                                            success: false,

                                            message:
                                                "Student not found."

                                        });

                                }


                                db.query(
                                    `
                                    UPDATE assessments

                                    SET student_id = ?

                                    WHERE student_id = ?
                                    `,
                                    [
                                        newStudentId,
                                        oldStudentId
                                    ],
                                    () => {

                                        db.query(
                                            `
                                            UPDATE student_queries

                                            SET student_id = ?

                                            WHERE student_id = ?
                                            `,
                                            [
                                                newStudentId,
                                                oldStudentId
                                            ],
                                            () => {

                                                res.json({

                                                    success: true,

                                                    message:
                                                        "Student details updated successfully.",

                                                    student_id:
                                                        newStudentId

                                                });

                                            }
                                        );

                                    }
                                );

                            }
                        );

                    }
                );

            }
        );

    }
);


/* ==========================================
   DELETE STUDENT
========================================== */

app.delete(
    "/api/students/:studentId",
    requireAdmin,
    (req, res) => {

        const studentId =
            req.params.studentId;


        db.query(
            `
            DELETE FROM students

            WHERE student_id = ?
            `,
            [
                studentId
            ],
            (error, result) => {

                if (error) {

                    return res
                        .status(500)
                        .json({

                            success: false,

                            message:
                                "Unable to delete student."

                        });

                }


                if (
                    !result.affectedRows
                ) {

                    return res
                        .status(404)
                        .json({

                            success: false,

                            message:
                                "Student not found."

                        });

                }


                return res.json({

                    success: true,

                    message:
                        "Student deleted successfully."

                });

            }
        );

    }
);
/*------------------------------------------------------------------------*/
/* ==========================================
   ASSESSMENTS - CREATE MANUAL MARK
========================================== */

app.post(
    "/api/assessments",
    requireAdmin,
    (req, res) => {

        const studentId =
            String(req.body.student_id || "").trim();

        const title =
            String(req.body.title || "").trim();

        const marks =
            Number(req.body.marks);

        const maxMarks =
            Number(req.body.max_marks);

        const remarks =
            String(req.body.remarks || "").trim();


        if (
            !studentId ||
            !title ||
            !Number.isFinite(marks) ||
            !Number.isFinite(maxMarks)
        ) {

            return res.status(400).json({
                success: false,
                message: "Student ID, title, marks and maximum marks are required."
            });

        }


        if (
            maxMarks <= 0 ||
            marks < 0 ||
            marks > maxMarks
        ) {

            return res.status(400).json({
                success: false,
                message: "Invalid marks."
            });

        }


        db.query(
            `
            SELECT student_id
            FROM students
            WHERE student_id = ?
            LIMIT 1
            `,
            [studentId],
            (studentError, students) => {

                if (studentError) {

                    return res.status(500).json({
                        success: false,
                        message: "Database error."
                    });

                }


                if (!students.length) {

                    return res.status(404).json({
                        success: false,
                        message: "Student not found."
                    });

                }


                db.query(
                    `
                    INSERT INTO assessments
                    (
                        student_id,
                        title,
                        marks,
                        max_marks,
                        remarks
                    )
                    VALUES (?, ?, ?, ?, ?)
                    `,
                    [
                        studentId,
                        title,
                        marks,
                        maxMarks,
                        remarks
                    ],
                    (error, result) => {

                        if (error) {

                            console.log(
                                "Assessment create error:",
                                error.message
                            );

                            return res.status(500).json({
                                success: false,
                                message: "Unable to save assessment."
                            });

                        }


                        return res.status(201).json({
                            success: true,
                            message: "Assessment saved successfully.",
                            id: result.insertId
                        });

                    }
                );

            }
        );

    }
);


/* ==========================================
   GET ALL MANUAL ASSESSMENTS
========================================== */

app.get(
    "/api/assessments",
    requireAdmin,
    (req, res) => {

        db.query(
            `
            SELECT
                a.id,
                a.student_id,
                s.name AS student_name,
                s.email,
                s.course,
                a.title,
                a.marks,
                a.max_marks,
                a.remarks,
                a.created_at,
                a.updated_at

            FROM assessments a

            LEFT JOIN students s
            ON a.student_id = s.student_id

            ORDER BY a.created_at DESC
            `,
            (error, results) => {

                if (error) {

                    console.log(
                        "Assessment fetch error:",
                        error.message
                    );

                    return res.status(500).json({
                        success: false,
                        message: "Unable to fetch assessments."
                    });

                }


                return res.json({
                    success: true,
                    assessments: results
                });

            }
        );

    }
);


/* ==========================================
   GET STUDENT MANUAL ASSESSMENTS
========================================== */

app.get(
    "/api/assessments/student/:studentId",
    (req, res) => {

        const studentId =
            String(
                req.params.studentId || ""
            ).trim();


        db.query(
            `
            SELECT
                id,
                student_id,
                title,
                marks,
                max_marks,
                remarks,
                created_at,
                updated_at

            FROM assessments

            WHERE student_id = ?

            ORDER BY created_at DESC
            `,
            [studentId],
            (error, results) => {

                if (error) {

                    console.log(
                        "Student assessment fetch error:",
                        error.message
                    );

                    return res.status(500).json({
                        success: false,
                        message: "Unable to fetch assessments."
                    });

                }


                return res.json({
                    success: true,
                    assessments: results
                });

            }
        );

    }
);


/* ==========================================
   UPDATE MANUAL ASSESSMENT
========================================== */

app.put(
    "/api/assessments/:id",
    requireAdmin,
    (req, res) => {

        const assessmentId =
            req.params.id;

        const studentId =
            String(
                req.body.student_id || ""
            ).trim();

        const title =
            String(
                req.body.title || ""
            ).trim();

        const marks =
            Number(req.body.marks);

        const maxMarks =
            Number(req.body.max_marks);

        const remarks =
            String(
                req.body.remarks || ""
            ).trim();


        if (
            !studentId ||
            !title ||
            !Number.isFinite(marks) ||
            !Number.isFinite(maxMarks)
        ) {

            return res.status(400).json({
                success: false,
                message: "Invalid assessment details."
            });

        }


        if (
            maxMarks <= 0 ||
            marks < 0 ||
            marks > maxMarks
        ) {

            return res.status(400).json({
                success: false,
                message: "Invalid marks."
            });

        }


        db.query(
            `
            UPDATE assessments

            SET
                student_id = ?,
                title = ?,
                marks = ?,
                max_marks = ?,
                remarks = ?

            WHERE id = ?
            `,
            [
                studentId,
                title,
                marks,
                maxMarks,
                remarks,
                assessmentId
            ],
            (error, result) => {

                if (error) {

                    return res.status(500).json({
                        success: false,
                        message: "Unable to update assessment."
                    });

                }


                if (!result.affectedRows) {

                    return res.status(404).json({
                        success: false,
                        message: "Assessment not found."
                    });

                }


                return res.json({
                    success: true,
                    message: "Assessment updated successfully."
                });

            }
        );

    }
);


/* ==========================================
   DELETE MANUAL ASSESSMENT
========================================== */

app.delete(
    "/api/assessments/:id",
    requireAdmin,
    (req, res) => {

        db.query(
            `
            DELETE FROM assessments
            WHERE id = ?
            `,
            [req.params.id],
            (error, result) => {

                if (error) {

                    return res.status(500).json({
                        success: false,
                        message: "Unable to delete assessment."
                    });

                }


                if (!result.affectedRows) {

                    return res.status(404).json({
                        success: false,
                        message: "Assessment not found."
                    });

                }


                return res.json({
                    success: true,
                    message: "Assessment deleted successfully."
                });

            }
        );

    }
);


/* ==========================================
   EVENTS - CREATE
========================================== */

app.post(
    "/api/events",
    requireAdmin,
    upload.single("media"),
    (req, res) => {

        const title =
            String(req.body.title || "").trim();

        const date =
            String(req.body.date || "").trim();

        const time =
            String(req.body.time || "").trim();

        const type =
            String(req.body.type || "").trim();

        const description =
            String(req.body.description || "").trim();


        if (!title) {

            return res.status(400).json({
                success: false,
                message: "Event title is required."
            });

        }


        const mediaPath =
            req.file
                ? "/uploads/" + req.file.filename
                : null;

        let mediaType = null;


        if (req.file) {

            if (
                req.file.mimetype.startsWith(
                    "video/"
                )
            ) {

                mediaType = "video";

            } else if (
                req.file.mimetype.startsWith(
                    "image/"
                )
            ) {

                mediaType = "image";

            }

        }


        db.query(
            `
            INSERT INTO events
            (
                title,
                date,
                time,
                type,
                description,
                media_path,
                media_type
            )

            VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            [
                title,
                date,
                time,
                type,
                description,
                mediaPath,
                mediaType
            ],
            (error, result) => {

                if (error) {

                    console.log(
                        "Event create error:",
                        error.message
                    );

                    return res.status(500).json({
                        success: false,
                        message: "Unable to save event."
                    });

                }


                return res.status(201).json({
                    success: true,
                    message: "Event saved successfully.",
                    id: result.insertId
                });

            }
        );

    }
);


/* ==========================================
   EVENTS - GET
========================================== */

app.get(
    "/api/events",
    (req, res) => {

        db.query(
            `
            SELECT
                id,
                title,
                date,
                time,
                type,
                description,
                media_path,
                media_type,
                created_at

            FROM events

            ORDER BY created_at DESC
            `,
            (error, results) => {

                if (error) {

                    return res.status(500).json({
                        success: false,
                        message: "Unable to fetch events."
                    });

                }


                return res.json({
                    success: true,
                    events: results
                });

            }
        );

    }
);


/* ==========================================
   EVENTS - DELETE
========================================== */

app.delete(
    "/api/events/:id",
    requireAdmin,
    (req, res) => {

        db.query(
            `
            DELETE FROM events
            WHERE id = ?
            `,
            [req.params.id],
            (error, result) => {

                if (error) {

                    return res.status(500).json({
                        success: false,
                        message: "Unable to delete event."
                    });

                }


                if (!result.affectedRows) {

                    return res.status(404).json({
                        success: false,
                        message: "Event not found."
                    });

                }


                return res.json({
                    success: true,
                    message: "Event deleted successfully."
                });

            }
        );

    }
);


/* ==========================================
   RECORDINGS - CREATE
========================================== */

app.post(
    "/api/recordings",
    requireAdmin,
    upload.single("video"),
    (req, res) => {

        const title =
            String(req.body.title || "").trim();

        const course =
            String(req.body.course || "").trim();

        const description =
            String(
                req.body.description || ""
            ).trim();


        if (!title) {

            return res.status(400).json({
                success: false,
                message: "Recording title is required."
            });

        }


        const fileName =
            req.file
                ? req.file.filename
                : null;

        const filePath =
            req.file
                ? "/uploads/" + req.file.filename
                : null;


        db.query(
            `
            INSERT INTO recordings
            (
                title,
                course,
                description,
                file_name,
                file_path
            )

            VALUES (?, ?, ?, ?, ?)
            `,
            [
                title,
                course,
                description,
                fileName,
                filePath
            ],
            (error, result) => {

                if (error) {

                    console.log(
                        "Recording create error:",
                        error.message
                    );

                    return res.status(500).json({
                        success: false,
                        message: "Unable to upload recording."
                    });

                }


                return res.status(201).json({
                    success: true,
                    message: "Recording uploaded successfully.",
                    id: result.insertId
                });

            }
        );

    }
);


/* ==========================================
   RECORDINGS - GET
========================================== */

app.get(
    "/api/recordings",
    (req, res) => {

        db.query(
            `
            SELECT
                id,
                title,
                course,
                description,
                file_name,
                file_path,
                created_at

            FROM recordings

            ORDER BY created_at DESC
            `,
            (error, results) => {

                if (error) {

                    return res.status(500).json({
                        success: false,
                        message: "Unable to fetch recordings."
                    });

                }


                return res.json({
                    success: true,
                    recordings: results
                });

            }
        );

    }
);


/* ==========================================
   RECORDINGS - DELETE
========================================== */

app.delete(
    "/api/recordings/:id",
    requireAdmin,
    (req, res) => {

        db.query(
            `
            DELETE FROM recordings
            WHERE id = ?
            `,
            [req.params.id],
            (error, result) => {

                if (error) {

                    return res.status(500).json({
                        success: false,
                        message: "Unable to delete recording."
                    });

                }


                if (!result.affectedRows) {

                    return res.status(404).json({
                        success: false,
                        message: "Recording not found."
                    });

                }


                return res.json({
                    success: true,
                    message: "Recording deleted successfully."
                });

            }
        );

    }
);


/* ==========================================
   TASKS - CREATE
========================================== */

app.post(
    "/api/tasks",
    requireAdmin,
    (req, res) => {

        const title =
            String(req.body.title || "").trim();

        const course =
            String(req.body.course || "").trim();

        const dueDate =
            String(
                req.body.due_date ||
                req.body.dueDate ||
                ""
            ).trim();

        const status =
            String(
                req.body.status || "Pending"
            ).trim();

        const description =
            String(
                req.body.description || ""
            ).trim();


        if (!title) {

            return res.status(400).json({
                success: false,
                message: "Task title is required."
            });

        }


        db.query(
            `
            INSERT INTO tasks
            (
                title,
                course,
                due_date,
                status,
                description
            )

            VALUES (?, ?, ?, ?, ?)
            `,
            [
                title,
                course,
                dueDate,
                status,
                description
            ],
            (error, result) => {

                if (error) {

                    console.log(
                        "Task create error:",
                        error.message
                    );

                    return res.status(500).json({
                        success: false,
                        message: "Unable to save task."
                    });

                }


                return res.status(201).json({
                    success: true,
                    message: "Task saved successfully.",
                    id: result.insertId
                });

            }
        );

    }
);


/* ==========================================
   TASKS - GET
========================================== */

app.get(
    "/api/tasks",
    (req, res) => {

        db.query(
            `
            SELECT
                id,
                title,
                course,
                due_date,
                status,
                description,
                created_at
            FROM tasks
            ORDER BY created_at DESC
            `,
            (taskError, tasks) => {

                if (taskError) {

                    return res.status(500).json({
                        success: false,
                        message:
                            "Unable to fetch tasks."
                    });
                }


                db.query(
                    `
                    SELECT
                        ts.*,
                        s.name AS student_name,
                        s.email AS student_email,
                        s.course AS student_course

                    FROM task_submissions ts

                    LEFT JOIN students s
                    ON ts.student_id = s.student_id

                    ORDER BY ts.created_at DESC
                    `,
                    (submissionError, submissions) => {

                        if (submissionError) {

                            return res.status(500).json({
                                success: false,
                                message:
                                    "Unable to fetch task submissions."
                            });
                        }


                        return res.json({

                            success: true,

                            tasks:
                                tasks,

                            submissions:
                                submissions

                        });

                    }
                );

            }
        );

    }
);
/* ==========================================
   STUDENT TASK SUBMISSION
========================================== */

/* ==========================================
   ADMIN VIEW ALL TASK SUBMISSIONS
========================================== */

app.get("/api/task-submissions", (req, res) => {

    const sql = `
        SELECT ts.*, s.name AS student_name
        FROM task_submissions ts
        LEFT JOIN students s
        ON ts.student_id = s.student_id
        ORDER BY ts.created_at DESC
    `;

    db.query(sql, (err, results) => {
        if (err) return res.json({ success: false });

        res.json({
            success: true,
            tasks: results
        });
    });

});
/* ==========================================
   STUDENT VIEW OWN TASK SUBMISSIONS
========================================== */

app.get(
    "/api/task-submissions/student/:student_id",
    (req, res) => {

        const studentId =
            req.params.student_id;


        const sql = `
            SELECT
                id,
                task_id,
                student_id,
                category,
                subject,
                college,
                event_name,
                task_name,
                github_link,
                marks,
                review,
                reply,
                status,
                submission_status,
                created_at,
                reviewed_at
            FROM task_submissions
            WHERE student_id = ?
            ORDER BY created_at DESC
        `;


        db.query(
            sql,
            [studentId],
            (err, rows) => {

                if (err) {

                    console.error(
                        "STUDENT TASK SUBMISSIONS ERROR:",
                        err
                    );

                    return res.status(500).json({
                        success: false,
                        message:
                            "Unable to load student submissions."
                    });

                }


                return res.json({
                    success: true,
                    submissions: rows
                });

            }
        );

    }
);


/* ==========================================
   LEGACY STUDENT SUBMISSION API
========================================== */

app.get(
    "/api/task-submissions/:studentId",
    (req, res) => {

        db.query(
            `
                SELECT *
                FROM task_submissions
                WHERE student_id = ?
                ORDER BY created_at DESC
            `,
            [req.params.studentId],
            (err, result) => {

                if (err) {

                    console.error(
                        "LEGACY STUDENT SUBMISSIONS ERROR:",
                        err
                    );

                    return res.status(500).json({
                        success: false,
                        message:
                            "Unable to load submissions."
                    });

                }


                return res.json({
                    success: true,
                    submissions: result
                });

            }
        );

    }
);


/* ==========================================
   OPTIONAL ADMIN REPLY / EVALUATION
   BACKWARD COMPATIBILITY
========================================== */
/*-----------------------------------------------------------------------*/
/* ==========================================
   ADMIN SAVE TASK EVALUATION
========================================== */
app.put("/api/task-submissions/:id/evaluate", requireAdmin, (req, res) => {

    const submissionId = req.params.id;
    const { marks, review, status } = req.body;

    db.query(
        `UPDATE task_submissions
         SET
            marks = ?,
            review = ?,
            reply = ?,
            status = ?,
            submission_status = ?,
            reviewed_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
            marks,
            review,
            review,
            status || "Reviewed",
            status || "Reviewed",
            submissionId
        ],
        (err, result) => {

            if (err) {
                console.error("TASK EVALUATION ERROR:", err);
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Task submission not found."
                });
            }

            return res.json({
                success: true,
                message: "Evaluation saved successfully."
            });

        }
    );
});
/* ==========================================
   MCQ ASSESSMENT - CREATE
========================================== */

app.post(
    "/api/mcq-assessments",
    requireAdmin,
    (req, res) => {

        const title =
            String(req.body.title || "").trim();

        const description =
            String(
                req.body.description || ""
            ).trim();

        const startTime =
            normalizeDateTime(
                req.body.start_time ||
                req.body.startTime
            );

        const endTime =
            normalizeDateTime(
                req.body.end_time ||
                req.body.endTime
            );

        const questions =
            Array.isArray(req.body.questions)
                ? req.body.questions
                : [];


        if (
            !title ||
            !startTime ||
            !endTime ||
            questions.length === 0
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Title, start time, end time and at least one question are required."
            });

        }


        if (
            new Date(endTime) <=
            new Date(startTime)
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "End time must be after start time."
            });

        }


        db.beginTransaction(
            transactionError => {

                if (transactionError) {

                    return res.status(500).json({
                        success: false,
                        message:
                            "Unable to create assessment."
                    });

                }


                db.query(
                    `
                    INSERT INTO mcq_assessments
                    (
                        title,
                        description,
                        start_time,
                        end_time
                    )
                    VALUES (?, ?, ?, ?)
                    `,
                    [
                        title,
                        description,
                        startTime,
                        endTime
                    ],
                    (assessmentError, result) => {

                        if (assessmentError) {

                            return db.rollback(
                                () => {

                                    console.log(
                                        "MCQ assessment create error:",
                                        assessmentError.message
                                    );

                                    res.status(500).json({
                                        success: false,
                                        message:
                                            "Unable to create MCQ assessment."
                                    });

                                }
                            );

                        }


                        const assessmentId =
                            result.insertId;


                        const validQuestions =
                            questions.map(
                                question => ({

                                    question_text:
                                        String(
                                            question.question_text ||
                                            question.question ||
                                            ""
                                        ).trim(),

                                    option_a:
                                        String(
                                            question.option_a ||
                                            question.optionA ||
                                            ""
                                        ).trim(),

                                    option_b:
                                        String(
                                            question.option_b ||
                                            question.optionB ||
                                            ""
                                        ).trim(),

                                    option_c:
                                        String(
                                            question.option_c ||
                                            question.optionC ||
                                            ""
                                        ).trim(),

                                    option_d:
                                        String(
                                            question.option_d ||
                                            question.optionD ||
                                            ""
                                        ).trim(),

                                    correct_option:
                                        String(
                                            question.correct_option ||
                                            question.correctOption ||
                                            ""
                                        ).trim().toUpperCase(),

                                    marks:
                                        Number(
                                            question.marks || 1
                                        )

                                })
                            );


                        const invalid =
                            validQuestions.some(
                                question => {

                                    return (
                                        !question.question_text ||
                                        !question.option_a ||
                                        !question.option_b ||
                                        !question.option_c ||
                                        !question.option_d ||
                                        ![
                                            "A",
                                            "B",
                                            "C",
                                            "D"
                                        ].includes(
                                            question.correct_option
                                        ) ||
                                        !Number.isFinite(
                                            question.marks
                                        ) ||
                                        question.marks <= 0
                                    );

                                }
                            );


                        if (invalid) {

                            return db.rollback(
                                () => {

                                    res.status(400).json({
                                        success: false,
                                        message:
                                            "One or more MCQ questions are invalid."
                                    });

                                }
                            );

                        }


                        let completed = 0;
                        let failed = false;


                        validQuestions.forEach(
                            question => {

                                db.query(
                                    `
                                    INSERT INTO mcq_questions
                                    (
                                        assessment_id,
                                        question_text,
                                        option_a,
                                        option_b,
                                        option_c,
                                        option_d,
                                        correct_option,
                                        marks
                                    )

                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                                    `,
                                    [
                                        assessmentId,
                                        question.question_text,
                                        question.option_a,
                                        question.option_b,
                                        question.option_c,
                                        question.option_d,
                                        question.correct_option,
                                        question.marks
                                    ],
                                    questionError => {

                                        if (
                                            questionError &&
                                            !failed
                                        ) {

                                            failed = true;

                                            return db.rollback(
                                                () => {

                                                    console.log(
                                                        "MCQ question create error:",
                                                        questionError.message
                                                    );

                                                    res.status(500).json({
                                                        success: false,
                                                        message:
                                                            "Unable to save MCQ questions."
                                                    });

                                                }
                                            );

                                        }


                                        completed++;


                                        if (
                                            completed ===
                                            validQuestions.length &&
                                            !failed
                                        ) {

                                            db.commit(
                                                commitError => {

                                                    if (
                                                        commitError
                                                    ) {

                                                        return db.rollback(
                                                            () => {

                                                                res.status(500).json({
                                                                    success: false,
                                                                    message:
                                                                        "Unable to complete assessment creation."
                                                                });

                                                            }
                                                        );

                                                    }


                                                    res.status(201).json({

                                                        success: true,

                                                        message:
                                                            "MCQ assessment created successfully.",

                                                        id:
                                                            assessmentId

                                                    });

                                                }
                                            );

                                        }

                                    }
                                );

                            }
                        );

                    }
                );

            }
        );

    }
);


/* ==========================================
   GET ALL MCQ ASSESSMENTS
========================================== */

app.get(
    "/api/mcq-assessments",
    requireAdmin,
    (req, res) => {

        db.query(
            `
            SELECT
                a.id,
                a.title,
                a.description,
                a.start_time,
                a.end_time,
                a.created_at,

                COUNT(q.id) AS question_count,

                COALESCE(
                    SUM(q.marks),
                    0
                ) AS total_marks

            FROM mcq_assessments a

            LEFT JOIN mcq_questions q
            ON q.assessment_id = a.id

            GROUP BY
                a.id,
                a.title,
                a.description,
                a.start_time,
                a.end_time,
                a.created_at

            ORDER BY a.created_at DESC
            `,
            (error, results) => {

                if (error) {

                    console.log(
                        "MCQ assessment fetch error:",
                        error.message
                    );

                    return res.status(500).json({
                        success: false,
                        message:
                            "Unable to fetch MCQ assessments."
                    });

                }


                return res.json({
                    success: true,
                    assessments: results
                });

            }
        );

    }
);


/* ==========================================
   GET AVAILABLE MCQ FOR STUDENT
========================================== */

app.get(
    "/api/mcq-assessments/available/:studentId",
    (req, res) => {

        const studentId =
            String(
                req.params.studentId || ""
            ).trim();


        const now =
            new Date();


        db.query(
            `
            SELECT
                a.id,
                a.title,
                a.description,
                a.start_time,
                a.end_time,

                COUNT(q.id) AS question_count,

                COALESCE(
                    SUM(q.marks),
                    0
                ) AS total_marks

            FROM mcq_assessments a

            LEFT JOIN mcq_questions q
            ON q.assessment_id = a.id

            LEFT JOIN mcq_submissions sub
            ON sub.assessment_id = a.id
            AND sub.student_id = ?

            WHERE a.start_time <= ?

            AND a.end_time >= ?

            AND sub.id IS NULL

            GROUP BY
                a.id,
                a.title,
                a.description,
                a.start_time,
                a.end_time

            ORDER BY a.start_time ASC
            `,
            [
                studentId,
                now,
                now
            ],
            (error, results) => {

                if (error) {

                    console.log(
                        "Available MCQ fetch error:",
                        error.message
                    );

                    return res.status(500).json({
                        success: false,
                        message:
                            "Unable to fetch available assessments."
                    });

                }


                return res.json({
                    success: true,
                    assessments: results
                });

            }
        );

    }
);


/* ==========================================
   GET MCQ QUESTIONS
========================================== */

app.get(
    "/api/mcq-assessments/:id",
    (req, res) => {

        const assessmentId =
            req.params.id;


        db.query(
            `
            SELECT
                id,
                title,
                description,
                start_time,
                end_time

            FROM mcq_assessments

            WHERE id = ?

            LIMIT 1
            `,
            [assessmentId],
            (assessmentError, assessments) => {

                if (assessmentError) {

                    return res.status(500).json({
                        success: false,
                        message:
                            "Unable to fetch assessment."
                    });

                }


                if (!assessments.length) {

                    return res.status(404).json({
                        success: false,
                        message:
                            "Assessment not found."
                    });

                }


                db.query(
                    `
                    SELECT
                        id,
                        question_text,
                        option_a,
                        option_b,
                        option_c,
                        option_d,
                        marks

                    FROM mcq_questions

                    WHERE assessment_id = ?

                    ORDER BY id ASC
                    `,
                    [assessmentId],
                    (questionError, questions) => {

                        if (questionError) {

                            return res.status(500).json({
                                success: false,
                                message:
                                    "Unable to fetch questions."
                            });

                        }


                        return res.json({

                            success: true,

                            assessment:
                                assessments[0],

                            questions:
                                questions

                        });

                    }
                );

            }
        );

    }
);


/* ==========================================
   MCQ SUBMIT
========================================== */

app.post(
    "/api/mcq-assessments/:id/submit",
    (req, res) => {

        const assessmentId =
            req.params.id;

        const studentId =
            String(
                req.body.student_id ||
                req.body.studentId ||
                ""
            ).trim();

        const submittedAnswers =
            req.body.answers || {};


        if (!studentId) {

            return res.status(400).json({
                success: false,
                message:
                    "Student ID is required."
            });

        }


        db.query(
            `
            SELECT
                id,
                title,
                start_time,
                end_time

            FROM mcq_assessments

            WHERE id = ?

            LIMIT 1
            `,
            [assessmentId],
            (assessmentError, assessments) => {

                if (assessmentError) {

                    return res.status(500).json({
                        success: false,
                        message:
                            "Database error."
                    });

                }


                if (!assessments.length) {

                    return res.status(404).json({
                        success: false,
                        message:
                            "Assessment not found."
                    });

                }


                const assessment =
                    assessments[0];

                const currentTime =
                    new Date();


                if (
                    currentTime <
                    new Date(
                        assessment.start_time
                    )
                ) {

                    return res.status(403).json({
                        success: false,
                        message:
                            "Assessment has not started yet."
                    });

                }


                if (
                    currentTime >
                    new Date(
                        assessment.end_time
                    )
                ) {

                    return res.status(403).json({
                        success: false,
                        message:
                            "Assessment time has expired."
                    });

                }


                db.query(
                    `
                    SELECT id

                    FROM mcq_submissions

                    WHERE assessment_id = ?

                    AND student_id = ?

                    LIMIT 1
                    `,
                    [
                        assessmentId,
                        studentId
                    ],
                    (existingError, existing) => {

                        if (existingError) {

                            return res.status(500).json({
                                success: false,
                                message:
                                    "Database error."
                            });

                        }


                        if (existing.length) {

                            return res.status(409).json({
                                success: false,
                                message:
                                    "You have already submitted this assessment."
                            });

                        }


                        db.query(
                            `
                            SELECT
                                id,
                                question_text,
                                option_a,
                                option_b,
                                option_c,
                                option_d,
                                correct_option,
                                marks

                            FROM mcq_questions

                            WHERE assessment_id = ?

                            ORDER BY id ASC
                            `,
                            [assessmentId],
                            (questionError, questions) => {

                                if (questionError) {

                                    return res.status(500).json({
                                        success: false,
                                        message:
                                            "Unable to evaluate assessment."
                                    });

                                }


                                if (
                                    questions.length === 0
                                ) {

                                    return res.status(400).json({
                                        success: false,
                                        message:
                                            "Assessment has no questions."
                                    });

                                }


                                let totalMarks = 0;
                                let obtainedMarks = 0;


                                questions.forEach(
                                    question => {

                                        const questionId =
                                            String(
                                                question.id
                                            );

                                        let selectedOption =
                                            "";


                                        if (
                                            typeof submittedAnswers ===
                                            "object" &&
                                            submittedAnswers !== null
                                        ) {

                                            selectedOption =
                                                String(
                                                    submittedAnswers[
                                                        questionId
                                                    ] || ""
                                                )
                                                    .trim()
                                                    .toUpperCase();

                                        }


                                        const isCorrect =
                                            selectedOption ===
                                            question.correct_option;


                                        totalMarks +=
                                            Number(
                                                question.marks
                                            );


                                        if (isCorrect) {

                                            obtainedMarks +=
                                                Number(
                                                    question.marks
                                                );

                                        }

                                    }
                                );


                                const percentage =
                                    totalMarks > 0
                                        ? (
                                            obtainedMarks /
                                            totalMarks
                                        ) * 100
                                        : 0;


                                const roundedPercentage =
                                    Number(
                                        percentage.toFixed(2)
                                    );


                                const grade =
                                    calculateGrade(
                                        roundedPercentage
                                    );


                                db.beginTransaction(
                                    transactionError => {

                                        if (
                                            transactionError
                                        ) {

                                            return res.status(500).json({
                                                success: false,
                                                message:
                                                    "Unable to save result."
                                            });

                                        }


                                        db.query(
                                            `
                                            INSERT INTO mcq_submissions
                                            (
                                                assessment_id,
                                                student_id,
                                                total_marks,
                                                obtained_marks,
                                                percentage,
                                                grade
                                            )

                                            VALUES (?, ?, ?, ?, ?, ?)
                                            `,
                                            [
                                                assessmentId,
                                                studentId,
                                                totalMarks,
                                                obtainedMarks,
                                                roundedPercentage,
                                                grade
                                            ],
                                            (submissionError, result) => {

                                                if (
                                                    submissionError
                                                ) {

                                                    return db.rollback(
                                                        () => {

                                                            console.log(
                                                                "Submission error:",
                                                                submissionError.message
                                                            );

                                                            res.status(500).json({
                                                                success: false,
                                                                message:
                                                                    "Unable to save submission."
                                                            });

                                                        }
                                                    );

                                                }


                                                const submissionId =
                                                    result.insertId;

                                                let completed =
                                                    0;

                                                let failed =
                                                    false;


                                                questions.forEach(
                                                    question => {

                                                        const selectedOption =
                                                            String(
                                                                submittedAnswers[
                                                                    String(
                                                                        question.id
                                                                    )
                                                                ] || ""
                                                            )
                                                                .trim()
                                                                .toUpperCase();

                                                        const isCorrect =
                                                            selectedOption ===
                                                            question.correct_option;

                                                        const awarded =
                                                            isCorrect
                                                                ? Number(
                                                                    question.marks
                                                                )
                                                                : 0;


                                                        db.query(
                                                            `
                                                            INSERT INTO mcq_answers
                                                            (
                                                                submission_id,
                                                                question_id,
                                                                selected_option,
                                                                is_correct,
                                                                marks_awarded
                                                            )

                                                            VALUES (?, ?, ?, ?, ?)
                                                            `,
                                                            [
                                                                submissionId,
                                                                question.id,
                                                                selectedOption ||
                                                                    null,
                                                                isCorrect
                                                                    ? 1
                                                                    : 0,
                                                                awarded
                                                            ],
                                                            answerError => {

                                                                if (
                                                                    answerError &&
                                                                    !failed
                                                                ) {

                                                                    failed =
                                                                        true;

                                                                    return db.rollback(
                                                                        () => {

                                                                            res.status(500).json({
                                                                                success: false,
                                                                                message:
                                                                                    "Unable to save answers."
                                                                            });

                                                                        }
                                                                    );

                                                                }


                                                                completed++;


                                                                if (
                                                                    completed ===
                                                                    questions.length &&
                                                                    !failed
                                                                ) {

                                                                    db.commit(
                                                                        commitError => {

                                                                            if (
                                                                                commitError
                                                                            ) {

                                                                                return db.rollback(
                                                                                    () => {

                                                                                        res.status(500).json({
                                                                                            success: false,
                                                                                            message:
                                                                                                "Unable to complete submission."
                                                                                        });

                                                                                    }
                                                                                );

                                                                            }


                                                                            return res.json({

                                                                                success: true,

                                                                                message:
                                                                                    "Assessment submitted successfully.",

                                                                                result: {

                                                                                    assessment_id:
                                                                                        assessmentId,

                                                                                    submission_id:
                                                                                        submissionId,

                                                                                    total_marks:
                                                                                        totalMarks,

                                                                                    obtained_marks:
                                                                                        obtainedMarks,

                                                                                    percentage:
                                                                                        roundedPercentage,

                                                                                    grade:
                                                                                        grade

                                                                                }

                                                                            });

                                                                        }
                                                                    );

                                                                }

                                                            }
                                                        );

                                                    }
                                                );

                                            }
                                        );

                                    }
                                );

                            }
                        );

                    }
                );

            }
        );

    }
);


/* ==========================================
   MCQ RESULTS - ADMIN
========================================== */

app.get(
    "/api/mcq-results",
    requireAdmin,
    (req, res) => {

        db.query(
            `
            SELECT
                sub.id,
                sub.assessment_id,
                a.title AS assessment_title,

                sub.student_id,
                s.name AS student_name,
                s.email,
                s.course,

                sub.total_marks,
                sub.obtained_marks,
                sub.percentage,
                sub.grade,
                sub.submitted_at

            FROM mcq_submissions sub

            LEFT JOIN mcq_assessments a
            ON sub.assessment_id = a.id

            LEFT JOIN students s
            ON sub.student_id = s.student_id

            ORDER BY sub.submitted_at DESC
            `,
            (error, results) => {

                if (error) {

                    console.log(
                        "MCQ result fetch error:",
                        error.message
                    );

                    return res.status(500).json({
                        success: false,
                        message:
                            "Unable to fetch MCQ results."
                    });

                }


                return res.json({
                    success: true,
                    results: results
                });

            }
        );

    }
);


/* ==========================================
   MCQ RESULTS - STUDENT
========================================== */

app.get(
    "/api/mcq-results/student/:studentId",
    (req, res) => {

        const studentId =
            String(
                req.params.studentId || ""
            ).trim();


        db.query(
            `
            SELECT
                sub.id,
                sub.assessment_id,
                a.title AS assessment_title,
                a.description,
                a.start_time,
                a.end_time,

                sub.total_marks,
                sub.obtained_marks,
                sub.percentage,
                sub.grade,
                sub.submitted_at

            FROM mcq_submissions sub

            LEFT JOIN mcq_assessments a
            ON sub.assessment_id = a.id

            WHERE sub.student_id = ?

            ORDER BY sub.submitted_at DESC
            `,
            [studentId],
            (error, results) => {

                if (error) {

                    return res.status(500).json({
                        success: false,
                        message:
                            "Unable to fetch student MCQ results."
                    });

                }


                return res.json({
                    success: true,
                    results: results
                });

            }
        );

    }
);


/* ==========================================
   QUERIES - CREATE
========================================== */

app.post(
    "/api/queries",
    (req, res) => {

        const studentId =
            String(
                req.body.student_id ||
                req.body.studentId ||
                ""
            ).trim();

        const subject =
            String(
                req.body.subject || ""
            ).trim();

        const message =
            String(
                req.body.message || ""
            ).trim();


        if (
            !studentId ||
            !subject ||
            !message
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Student ID, subject and message are required."
            });

        }


        db.query(
            `
            INSERT INTO student_queries
            (
                student_id,
                subject,
                message,
                status
            )

            VALUES (?, ?, ?, 'Pending')
            `,
            [
                studentId,
                subject,
                message
            ],
            (error, result) => {

                if (error) {

                    console.log(
                        "Query create error:",
                        error.message
                    );

                    return res.status(500).json({
                        success: false,
                        message:
                            "Unable to submit query."
                    });

                }


                return res.status(201).json({
                    success: true,
                    message:
                        "Query submitted successfully.",
                    id:
                        result.insertId
                });

            }
        );

    }
);


/* ==========================================
   GET ALL QUERIES - ADMIN
========================================== */

app.get(
    "/api/queries",
    requireAdmin,
    (req, res) => {

        const sql = `
            SELECT
                q.id,
                q.student_id,
                s.name AS student_name,
                s.email,
                q.subject,
                q.message,
                q.reply,
                q.status,
                q.created_at

            FROM student_queries q

            LEFT JOIN students s
            ON q.student_id = s.student_id

            ORDER BY q.created_at DESC
        `;


        db.query(
            sql,
            (error, results) => {

                if (error) {

                    console.log(
                        "Query fetch error:",
                        error.message
                    );

                    return res.status(500).json({
                        success: false,
                        message:
                            "Unable to fetch queries."
                    });

                }


                return res.status(200).json({
                    success: true,
                    queries: results
                });

            }
        );

    }
);


/* ==========================================
   GET STUDENT QUERIES
========================================== */

app.get(
    "/api/queries/student/:studentId",
    (req, res) => {

        const studentId =
            String(
                req.params.studentId || ""
            ).trim();


        const sql = `
            SELECT
                id,
                subject,
                message,
                reply,
                status,
                created_at

            FROM student_queries

            WHERE student_id = ?

            ORDER BY created_at DESC
        `;


        db.query(
            sql,
            [studentId],
            (error, results) => {

                if (error) {

                    console.log(
                        "Student query fetch error:",
                        error.message
                    );

                    return res.status(500).json({
                        success: false,
                        message:
                            "Unable to fetch student queries."
                    });

                }


                return res.status(200).json({
                    success: true,
                    queries: results
                });

            }
        );

    }
);


/* ==========================================
   UPDATE QUERY / REPLY
========================================== */

app.put("/api/task-submissions/:id/review", (req, res) => {

    const { review, reply, marks, status } = req.body;

    const sql = `
        UPDATE task_submissions
        SET
            review = ?,
            reply = ?,
            marks = ?,
            status = ?,
            submission_status = ?,
            reviewed_by = 'Admin',
            reviewed_at = NOW()
        WHERE id = ?
    `;

    db.query(sql,
        [
            review,
            reply,
            marks,
            status,
            status,
            req.params.id
        ],
        (err) => {
            if (err) {
                console.log(err);
                return res.json({ success: false });
            }

            res.json({
                success: true,
                message: "Review saved successfully."
            });
        });

});

/* ==========================================
   PLACEMENTS - CREATE
========================================== */

app.post(
    "/api/placements",
    requireAdmin,
    upload.single("media"),
    async (req, res) => {

        const title =
            String(
                req.body.title || ""
            ).trim();

        const date =
            String(
                req.body.date || ""
            ).trim();

        const description =
            String(
                req.body.description || ""
            ).trim();


        if (!title) {

            return res.status(400).json({
                success: false,
                message:
                    "Placement title is required."
            });

        }


        const mediaPath =
            req.file
                ? "/uploads/" +
                  req.file.filename
                : null;


        let mediaType =
            null;


        if (req.file) {

            if (
                req.file.mimetype.startsWith(
                    "image/"
                )
            ) {

                mediaType =
                    "image";

            } else if (
                req.file.mimetype.startsWith(
                    "video/"
                )
            ) {

                mediaType =
                    "video";

            }

        }


        db.query(
            `
            INSERT INTO placements
            (
                title,
                date,
                description,
                media_path,
                media_type
            )

            VALUES (?, ?, ?, ?, ?)
            `,
            [
                title,
                date,
                description,
                mediaPath,
                mediaType
            ],
            async (
                error,
                result
            ) => {

                if (error) {

                    console.log(
                        "Placement create error:",
                        error.message
                    );

                    return res.status(500).json({
                        success: false,
                        message:
                            "Unable to save placement."
                    });

                }


                try {

                    await createGlobalNotification(
                        "New Placement Update",

                        `${title} has been posted in placements.`,

                        "placement"
                    );

                } catch (
                    notificationError
                ) {

                    console.log(
                        "Placement notification error:",
                        notificationError.message
                    );

                }


                return res.status(201).json({

                    success: true,

                    message:
                        "Placement posted successfully.",

                    id:
                        result.insertId

                });

            }
        );

    }
);


/* ==========================================
   PLACEMENTS - GET
========================================== */

app.get(
    "/api/placements",
    (req, res) => {

        db.query(
            `
            SELECT
                id,
                title,
                date,
                description,
                media_path,
                media_type,
                created_at

            FROM placements

            ORDER BY created_at DESC
            `,
            (error, results) => {

                if (error) {

                    console.log(
                        "Placement fetch error:",
                        error.message
                    );

                    return res.status(500).json({
                        success: false,
                        message:
                            "Unable to fetch placements."
                    });

                }


                return res.json({
                    success: true,
                    placements: results
                });

            }
        );

    }
);


/* ==========================================
   PLACEMENTS - DELETE
========================================== */

app.delete(
    "/api/placements/:id",
    requireAdmin,
    (req, res) => {

        db.query(
            `
            DELETE FROM placements
            WHERE id = ?
            `,
            [req.params.id],
            (error, result) => {

                if (error) {

                    return res.status(500).json({
                        success: false,
                        message:
                            "Unable to delete placement."
                    });

                }


                if (
                    !result.affectedRows
                ) {

                    return res.status(404).json({
                        success: false,
                        message:
                            "Placement not found."
                    });

                }


                return res.json({
                    success: true,
                    message:
                        "Placement deleted successfully."
                });

            }
        );

    }
);


/* ==========================================
   NOTIFICATIONS - GET
========================================== */

app.get(
    "/api/notifications",
    (req, res) => {

        const studentId =
            String(
                req.query.student_id ||
                req.query.studentId ||
                ""
            ).trim();


        if (!studentId) {

            return res.status(400).json({
                success: false,
                message:
                    "Student ID is required."
            });

        }


        db.query(
            `
            SELECT
                id,
                title,
                message,
                type,
                is_read,
                created_at

            FROM notifications

            WHERE
                student_id = ?

                OR

                student_id IS NULL

            ORDER BY created_at DESC
            `,
            [studentId],
            (error, results) => {

                if (error) {

                    console.log(
                        "Notification fetch error:",
                        error.message
                    );

                    return res.status(500).json({
                        success: false,
                        message:
                            "Unable to fetch notifications."
                    });

                }


                return res.json({
                    success: true,
                    notifications: results
                });

            }
        );

    }
);


/* ==========================================
   MARK NOTIFICATION AS READ
========================================== */

app.put(
    "/api/notifications/:id/read",
    (req, res) => {

        const notificationId =
            req.params.id;

        const studentId =
            String(
                req.body.student_id ||
                req.body.studentId ||
                ""
            ).trim();


        if (!studentId) {

            return res.status(400).json({
                success: false,
                message:
                    "Student ID is required."
            });

        }


        db.query(
            `
            UPDATE notifications

            SET is_read = 1

            WHERE id = ?

            AND
            (
                student_id = ?

                OR

                student_id IS NULL
            )
            `,
            [
                notificationId,
                studentId
            ],
            (error, result) => {

                if (error) {

                    return res.status(500).json({
                        success: false,
                        message:
                            "Unable to update notification."
                    });

                }


                if (
                    !result.affectedRows
                ) {

                    return res.status(404).json({
                        success: false,
                        message:
                            "Notification not found."
                    });

                }


                return res.json({
                    success: true,
                    message:
                        "Notification marked as read."
                });

            }
        );

    }
);


/* ==========================================
   DELETE NOTIFICATION
========================================== */

app.delete(
    "/api/notifications/:id",
    (req, res) => {

        const notificationId =
            req.params.id;

        const studentId =
            String(
                req.query.student_id ||
                req.query.studentId ||
                ""
            ).trim();


        if (!studentId) {

            return res.status(400).json({
                success: false,
                message:
                    "Student ID is required."
            });

        }


        db.query(
            `
            DELETE FROM notifications

            WHERE id = ?

            AND
            (
                student_id = ?

                OR
                student_id IS NULL
            )
            `,
            [
                notificationId,
                studentId
            ],
            (error, result) => {

                if (error) {

                    return res.status(500).json({
                        success: false,
                        message:
                            "Unable to delete notification."
                    });

                }


                return res.json({
                    success: true,
                    message:
                        "Notification deleted successfully."
                });

            }
        );

    }
);


/* ==========================================
   DASHBOARD COUNTS
========================================== */

app.get(
    "/api/dashboard/stats",
    requireAdmin,
    (req, res) => {

        const queries = {

            students:
                `SELECT COUNT(*) AS count FROM students`,

            events:
                `SELECT COUNT(*) AS count FROM events`,

            tasks:
                `
                SELECT COUNT(*) AS count
                FROM tasks
                WHERE status = 'Pending'
                `,

            queries:
                `
                SELECT COUNT(*) AS count
                FROM student_queries
                WHERE status <> 'Resolved'
                `

        };


        const result = {};


        db.query(
            queries.students,
            (studentError, studentRows) => {

                if (studentError) {

                    return res.status(500).json({
                        success: false,
                        message:
                            "Unable to load dashboard statistics."
                    });

                }


                result.students =
                    studentRows[0].count;


                db.query(
                    queries.events,
                    (eventError, eventRows) => {

                        if (eventError) {

                            return res.status(500).json({
                                success: false,
                                message:
                                    "Unable to load dashboard statistics."
                            });

                        }


                        result.events =
                            eventRows[0].count;


                        db.query(
                            queries.tasks,
                            (taskError, taskRows) => {

                                if (taskError) {

                                    return res.status(500).json({
                                        success: false,
                                        message:
                                            "Unable to load dashboard statistics."
                                    });

                                }


                                result.pendingTasks =
                                    taskRows[0].count;


                                db.query(
                                    queries.queries,
                                    (queryError, queryRows) => {

                                        if (queryError) {

                                            return res.status(500).json({
                                                success: false,
                                                message:
                                                    "Unable to load dashboard statistics."
                                            });

                                        }


                                        result.newQueries =
                                            queryRows[0].count;


                                        return res.json({

                                            success: true,

                                            stats:
                                                result

                                        });

                                    }
                                );

                            }
                        );

                    }
                );

            }
        );

    }
);
/* ==========================================
   GENERAL ERROR HANDLER
========================================== */

app.use(
    (
        error,
        req,
        res,
        next
    ) => {

        console.log(
            "Server error:",
            error.message
        );


        return res.status(500).json({

            success: false,

            message:
                "Internal server error."

        });

    }
);
/* ==========================================
   DASHBOARD AUTO STATS
========================================== */

app.get("/api/dashboard-stats", requireAdmin, (req, res) => {

    db.query(
        `SELECT * FROM task_submissions`,
        (err, rows) => {

            if (err) {
                return res.json({
                    success: false
                });
            }

            const totalTasks = rows.length;
            const reviewedTasks = rows.filter(r => r.status === "Reviewed").length;
            const pendingTasks = totalTasks - reviewedTasks;

            let totalMarks = 0;

            rows.forEach(item => {
                totalMarks += Number(item.marks || 0);
            });

            const averageMarks =
                reviewedTasks === 0
                    ? 0
                    : Math.round(totalMarks / reviewedTasks);

            res.json({
                success: true,
                totalTasks,
                reviewedTasks,
                pendingTasks,
                averageMarks
            });

        }
    );

});// STUDENT SUBMISSION HISTORY
app.get("/api/task-submissions", (req, res) => {

    const sql = `
        SELECT ts.*, s.name AS student_name
        FROM task_submissions ts
        LEFT JOIN students s
        ON ts.student_id = s.student_id
        ORDER BY ts.created_at DESC
    `;

    db.query(sql, (err, results) => {
        if (err) return res.json({ success: false });

        res.json({
            success: true,
            tasks: results
        });
    });

});
/* ==========================================
   UNKNOWN API HANDLER
========================================== */
app.use(
    "/api",
    (req, res) => {

        return res.status(404).json({

            success: false,

            message:
                "API endpoint not found."

        });

    }
);



app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});