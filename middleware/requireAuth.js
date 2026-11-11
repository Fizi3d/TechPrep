import db from "../db.js";

export default async function requireAuth(req, res, next) {
  try {
    // Assumes express-session is configured and puts session data on req.session.
    const userID = req.session?.userID;

    if (!userID) {
      return res.status(401).json({ error: "Not logged in" });
    }

    const result = await db.query(
      "SELECT id, email, role FROM users WHERE id = $1",
      [userID]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: "Invalid session" });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    console.error("Authentication check failed:", error);
    return res.status(500).json({ error: "Authentication check failed" });
  }
}



export function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }

  next();
}