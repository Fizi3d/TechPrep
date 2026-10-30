import { Router } from "express";
import pool from "../db.js";
import bcrypt from "bcrypt";

const loginRouter = Router();

loginRouter.post("/register", async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ error: "Username, email and password are required" });
    }

    const cleanUsername = username.trim().toLowerCase();

    if (!/^[a-z0-9_]{3,30}$/.test(cleanUsername)) {
        return res.status(400).json({ error: "Username must be 3-30 characters using letters, numbers or underscores" });
    }

    if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email",
            [cleanUsername, email.trim().toLowerCase(), hashedPassword]
        );
        req.session.userId = result.rows[0].id;
        res.status(201).json({ user: result.rows[0] });
    } catch (error) {
        if (error.code === "23505") { // Unique violation
            if (error.constraint === "users_username_key") {
                return res.status(409).json({ error: "Username already exists" });
            }
            return res.status(409).json({ error: "Email already exists" });
        }
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

loginRouter.post("/login", async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query(
            "SELECT id, username, email, password_hash FROM users WHERE email = $1 OR username = $1",
            [(email || "").trim().toLowerCase()]
        )
        const user = result.rows[0];
        const valid = user && await bcrypt.compare(password || "", user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: "Invalid username/email or password" });
        }
        req.session.userId = user.id;
        res.json({ user: { id: user.id, username: user.username, email: user.email } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

loginRouter.post("/logout", (req, res) => {
    req.session.destroy(() => res.json({ok: true}));
});

loginRouter.get("/me", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: "not logged in"});
    const result = await pool.query(
        "SELECT id, username, email FROM users WHERE id = $1",
        [req.session.userId]
    );
    const user = result.rows[0];
    res.json({ user });
});

export default loginRouter;
