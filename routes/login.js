import { Rotuer } from "express";
import pool from "../db.js";
import bcrypt from "bcrypt";

const router = Router();

router.post("/register", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email",
            [email.toLowerCase(), hashedPassword]
        );
        req.session.userId = result.rows[0].id;
        res.status(201).json({ user: result.rows[0] });
    } catch (error) {
        if (error.code === "23505") { // Unique violation
            return res.status(409).json({ error: "Email already exists" });
        }
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query(
            "SELECT id, email, password FROM users WHERE email = $1",
            [(email || "").toLowerCase()]
        )
        const user = result.rows[0];
        const valid = user && await bcrypt.compare(password || "", user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: "Invalid email or password" });
        }
        req.session.userId = user.id;
        res.json({ user: { id: user.id, email: user.email } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.post("/logout", (req, res) => {
    req.session.destroy(() => res.json({ok: true}));
});

router.get("/me", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: "not logged in"});
    const result = await pool.query(
        "SELECT id, email FROM users WHERE id = $1",
        [req.session.userId]
    );
    const user = result.rows[0];
    res.json({ user });
});

export default router;