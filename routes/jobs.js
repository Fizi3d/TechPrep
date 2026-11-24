import { Router } from "express";
import pool from "../db.js";

import requireAuth from "../middleware/requireAuth.js";

const jobsRouter = Router();

//user CRUD for job postings
//check if db is configured for it
//


jobsRouter.get("/", requireAuth, async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT j.id, j.title, j.company, j.content, j.created_at, j.updated_at,
              COALESCE((
                SELECT ARRAY_AGG(t.name ORDER BY t.name)
                FROM job_description_tags jdt
                JOIN tags t ON t.id = jdt.tag_id
                WHERE jdt.job_id = j.id
              ), '{}') AS tags
       FROM job_descriptions j
       WHERE j.user_id = $1
       ORDER BY j.created_at DESC`,
      [userId]
    );

    return res.json({
      jobs: result.rows,
      total: result.rowCount
    });
  } catch (error) {
    console.error("Error fetching job descriptions:", error);
    return res.status(500).json({ error: "Could not fetch job descriptions" });
  }
});

// Example body: { "title": "data science intern" }
jobsRouter.post("/", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { title, company, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({
      error: "title and content are required"
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO job_descriptions (user_id, title, company, content)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title, company, content, created_at`,
      [userId, title, company || null, content]
    );

    return res.status(201).json({
      message: "Job description created",
      job: result.rows[0]
    });
  } catch (error) {
    console.error("Error creating job description:", error);
    return res.status(500).json({ error: "Could not create job description" });
  }
});

jobsRouter.get("/:jobId", requireAuth, async (req, res) => {
  const jobId = Number(req.params.jobId);
  const userId = req.user.id;

  if (!Number.isInteger(jobId) || jobId < 1) {
    return res.status(400).json({ error: "jobId must be a positive whole number" });
  }

  try {
    const result = await pool.query(
      `SELECT id, title, company, content, created_at, updated_at
       FROM job_descriptions WHERE id = $1 AND user_id = $2`,
      [jobId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Job description not found" });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching job description:", error);
    return res.status(500).json({ error: "Could not fetch job description" });
  }
});

jobsRouter.delete("/:jobId", requireAuth, async (req, res) => {
  const jobId = Number(req.params.jobId);
  const userId = req.user.id;

  if (!Number.isInteger(jobId) || jobId < 1) {
    return res.status(400).json({ error: "jobId must be a positive whole number" });
  }

  try {
    const result = await pool.query(
      `DELETE FROM job_descriptions
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [jobId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Job description not found" });
    }

    return res.json({ message: "Job description deleted" });
  } catch (error) {
    console.error("Error deleting job description:", error);
    return res.status(500).json({ error: "Could not delete job description" });
  }
});


jobsRouter.get("/:jobId/tags", requireAuth, async (req, res) => {
  const jobId = Number(req.params.jobId);
  const userId = req.user.id;

  if (!Number.isInteger(jobId) || jobId < 1) {
    return res.status(400).json({ error: "jobId must be a positive whole number" });
  }

  try {
    const job = await pool.query(
      `SELECT id FROM job_descriptions WHERE id = $1 AND user_id = $2`,
      [jobId, userId]
    );
    if (job.rowCount === 0) {
      return res.status(404).json({ error: "Job description not found" });
    }

    const result = await pool.query(
      `SELECT t.id, t.name FROM tags t
       JOIN job_description_tags jdt ON t.id = jdt.tag_id
       WHERE jdt.job_id = $1`,
      [jobId]
    );

    return res.json({ jobId, tags: result.rows });
  } catch (error) {
    console.error("Error fetching job tags:", error);
    return res.status(500).json({ error: "Could not fetch job tags" });
  }
});

jobsRouter.post("/:jobId/tags", requireAuth, async (req, res) => {
    const userId = Number(req.user.id);
    const jobId = Number(req.params.jobId);
    const tagId = Number(req.body?.tagId);

    if (
      !Number.isInteger(jobId) || jobId < 1 ||
      !Number.isInteger(tagId) || tagId < 1
    ) {
      return res.status(400).json({
        error: "jobId and tagId must be positive whole numbers"
      });
    }

    try {
      const job = await pool.query(
        "SELECT id FROM job_descriptions WHERE id = $1 AND user_id = $2",
        [jobId, userId]
      );
      if (job.rowCount === 0) {
        return res.status(404).json({ error: "Job description not found" });
      }

      const tag = await pool.query(
        "SELECT id, name FROM tags WHERE id = $1",
        [tagId]
      );
      if (tag.rowCount === 0) {
        return res.status(404).json({ error: "Tag not found" });
      }

      const result = await pool.query(
        `INSERT INTO job_description_tags (job_id, tag_id)
        VALUES ($1, $2)
        ON CONFLICT (job_id, tag_id) DO NOTHING
        RETURNING job_id, tag_id`,
        [jobId, tagId]
    );

      return res.status(result.rowCount ? 201 : 200).json({
        message: result.rowCount
          ? "Tag added to job description"
          : "Tag is already assigned to this job description",
        jobId,
        tag: tag.rows[0]
      });
    } catch (error) {
      console.error("Error adding tag to job description:", error);
      return res.status(500).json({ error: "Could not add tag to job description" });
    }
});


jobsRouter.delete(
  "/:jobId/tags/:tagId",
  requireAuth,
  async (req, res) => {
    const jobId = Number(req.params.jobId);
    const tagId = Number(req.params.tagId);

    if (
      !Number.isInteger(jobId) || jobId < 1 ||
      !Number.isInteger(tagId) || tagId < 1
    ) {
      return res.status(400).json({
        error: "jobId and tagId must be positive whole numbers",
      });
    }

    try {
      const result = await pool.query(
        `DELETE FROM job_description_tags
         WHERE job_id = $1 AND tag_id = $2
         RETURNING job_id, tag_id`,
        [jobId, tagId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          error: "That tag is not assigned to this job description",
        });
      }

      return res.json({
        message: "Tag removed from job description",
        ...result.rows[0],
      });
    } catch (error) {
      console.error("Error removing tag from job description:", error);
      return res.status(500).json({
        error: "Could not remove tag from job description",
      });
    }
  }
);


export default jobsRouter;