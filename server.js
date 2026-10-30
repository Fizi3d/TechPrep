import express from "express";
import "dotenv/config";
import pool from "./db.js";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import loginRouter from "./routes/login.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());


const PgStore = connectPgSimple(session);

app.use(session({
    store: new PgStore({ pool, createTableIfMissing: true }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,                 // JS in the page can't read the cookie
        sameSite: "lax",                // basic CSRF protection
        secure: process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
    }
}));

app.use("/api", loginRouter);

app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        message: "TechPrep API is running"
    });
});

app.get("/api/db-health", async (req, res) => {
    try {
        await pool.query("SELECT 1");
        res.json({
            status: "ok",
            message: "PostgreSQL connected successfully"
        });
    } catch (error) {
        console.error("Database health check failed:", error.message);
        res.status(500).json({
            status: "error",
            message: "Database connection failed"
        });
    }
});

app.listen(PORT, () => {
    console.log(`TechPrep server running on port ${PORT}`);
});

app.get("/api/questions", async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({
            error: "Please log in first"
        });
    }
    try {
        const result = await pool.query(
            "SELECT id, question_text FROM questions ORDER BY id LIMIT 5"
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Error loading questions:", error);
        res.status(500).json({
            error: "Could not load questions"
        });
    }
});
