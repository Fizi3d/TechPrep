import { Router } from "express";
import db from "../db.js";
const tagsRouter = Router();


import requireAuth, {requireAdmin} from "../middleware/requireAuth.js";

// GET /api/tags — return all tag information
tagsRouter.get("/", requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM tags ORDER BY name ASC"
    );
    res.json({ tags: result.rows });
  } catch (error) {
    console.error("Failed to fetch tags:", error);
    res.status(500).json({ error: "Failed to fetch tags" });
  }
});


// Add a tag to the list of tags (admin only)
// Example body: { "name": "Python" }
tagsRouter.post("/", requireAuth, requireAdmin, async (req, res) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";

  if (!name) {
    return res.status(400).json({ error: "Tag name is required" });
  }

  try {
    const result = await db.query(
      "INSERT INTO tags (name) VALUES ($1) RETURNING *",
      [name]
    );
    res.status(201).json({ tag: result.rows[0] });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ error: "That tag already exists" });
    }
    console.error("Failed to create tag:", error);
    res.status(500).json({ error: "Failed to create tag" });
  }
});

// Delete a tag from the list of tags (admin only)
// Example body: { "id": 1 }
tagsRouter.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid tag ID" });
  }

  try {
    const result = await db.query(
      "DELETE FROM tags WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Tag not found" });
    }

    res.json({ tag: result.rows[0] });
  } catch (error) {
    console.error("Failed to delete tag:", error);
    res.status(500).json({ error: "Failed to delete tag" });
  }
});

export default tagsRouter;