import { Router } from "express";
import pool from "../db.js";

import requireAuth from "../middleware/requireAuth.js";
import {
    buildPrepPlan,
    loadQuestionsForMatching,
    DEFAULT_PLAN_SIZE,
    DEFAULT_BEHAVIORAL_SHARE,
    MAX_PLAN_SIZE
} from "../lib/matching.js";

// Prep plans (T25). Mounted at /api/jobs, so the routes are
//   POST /api/jobs/:jobId/plan   generate or regenerate the plan for a job description
//   GET  /api/jobs/:jobId/plan   the stored plan with question details
const plansRouter = Router();

function readJobId(req) {
    const jobId = Number(req.params.jobId);
    return Number.isInteger(jobId) && jobId > 0 ? jobId : null;
}

// Body options are optional. Anything not given keeps the plan's current value
// (on regenerate) or the default (first time).
export function parsePlanOptions(body) {
    const options = {};
    const size = body?.size;
    const behavioralShare = body?.behavioralShare;

    if (size !== undefined) {
        if (!Number.isInteger(size) || size < 1 || size > MAX_PLAN_SIZE) {
            return { error: `size must be a whole number from 1 to ${MAX_PLAN_SIZE}` };
        }
        options.size = size;
    }

    if (behavioralShare !== undefined) {
        if (typeof behavioralShare !== "number" || !(behavioralShare >= 0 && behavioralShare <= 1)) {
            return { error: "behavioralShare must be a number from 0 to 1" };
        }
        // Stored as NUMERIC(3, 2)
        options.behavioralShare = Math.round(behavioralShare * 100) / 100;
    }

    return { options };
}

async function findOwnedJob(db, jobId, userId) {
    const result = await db.query(
        "SELECT id FROM job_descriptions WHERE id = $1 AND user_id = $2",
        [jobId, userId]
    );
    return result.rowCount > 0;
}

async function findJobTags(db, jobId) {
    const result = await db.query(
        `SELECT t.name FROM job_description_tags jdt
        JOIN tags t ON t.id = jdt.tag_id
        WHERE jdt.job_id = $1
        ORDER BY t.name`,
        [jobId]
    );
    return result.rows.map((row) => row.name);
}

// The stored plan with every item's question, or null if the job has no plan yet
export async function findPlan(db, jobId) {
    const planResult = await db.query(
        `SELECT id, job_id, size, behavioral_share, created_at, updated_at
        FROM prep_plans WHERE job_id = $1`,
        [jobId]
    );
    if (planResult.rowCount === 0) {
        return null;
    }
    const plan = planResult.rows[0];

    const itemsResult = await db.query(
        `SELECT i.id, i.position, i.category, i.score, i.matched_tags,
            q.id AS question_id, q.question_text, q.answer_text, q.answer_data,
            q.explanation, q.difficulty, q.question_type,
            COALESCE((
                SELECT ARRAY_AGG(t.name ORDER BY t.name)
                FROM question_tags qt
                JOIN tags t ON t.id = qt.tag_id
                WHERE qt.question_id = q.id
            ), '{}') AS tags
        FROM prep_plan_items i
        JOIN questions q ON q.id = i.question_id
        WHERE i.plan_id = $1
        ORDER BY i.position`,
        [plan.id]
    );

    const items = itemsResult.rows.map((row) => ({
        id: row.id,
        position: row.position,
        category: row.category,
        score: row.score,
        matchedTags: row.matched_tags,
        question: {
            id: row.question_id,
            question_text: row.question_text,
            answer_text: row.answer_text,
            answer_data: row.answer_data,
            explanation: row.explanation,
            difficulty: row.difficulty,
            question_type: row.question_type,
            tags: row.tags
        }
    }));

    const jobTags = (await findJobTags(db, jobId)).map((tag) => tag.toLowerCase());
    const covered = new Set(items.flatMap((item) => item.matchedTags));

    return {
        id: plan.id,
        jobId: plan.job_id,
        size: plan.size,
        behavioralShare: Number(plan.behavioral_share),
        createdAt: plan.created_at,
        updatedAt: plan.updated_at,
        summary: {
            total: items.length,
            technical: items.filter((item) => item.category === "technical").length,
            behavioral: items.filter((item) => item.category === "behavioral").length,
            uncoveredTags: [...new Set(jobTags)].filter((tag) => !covered.has(tag))
        },
        items
    };
}

// POST /api/jobs/:jobId/plan
// Example body (all optional): { "size": 15, "behavioralShare": 0.3 }
plansRouter.post("/:jobId/plan", requireAuth, async (req, res) => {
    const jobId = readJobId(req);
    if (!jobId) {
        return res.status(400).json({ error: "jobId must be a positive whole number" });
    }

    const { options, error } = parsePlanOptions(req.body);
    if (error) {
        return res.status(400).json({ error });
    }

    const client = await pool.connect();
    try {
        if (!(await findOwnedJob(client, jobId, req.user.id))) {
            return res.status(404).json({ error: "Job description not found" });
        }

        const jobTags = await findJobTags(client, jobId);
        if (jobTags.length === 0) {
            return res.status(400).json({
                error: "Add tags to this job description before generating a prep plan"
            });
        }

        await client.query("BEGIN");

        // Lock the existing plan (if any) so two regenerate requests run one after the other
        const existing = await client.query(
            "SELECT size, behavioral_share FROM prep_plans WHERE job_id = $1 FOR UPDATE",
            [jobId]
        );
        const size = options.size ?? existing.rows[0]?.size ?? DEFAULT_PLAN_SIZE;
        const behavioralShare = options.behavioralShare
            ?? (existing.rowCount > 0 ? Number(existing.rows[0].behavioral_share) : DEFAULT_BEHAVIORAL_SHARE);

        const questions = await loadQuestionsForMatching(client);
        const { items } = buildPrepPlan(jobTags, questions, { size, behavioralShare });

        if (items.length === 0) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "No questions match this job description's tags" });
        }

        const planResult = await client.query(
            `INSERT INTO prep_plans (job_id, user_id, size, behavioral_share)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (job_id) DO UPDATE
                SET size = EXCLUDED.size,
                    behavioral_share = EXCLUDED.behavioral_share,
                    updated_at = CURRENT_TIMESTAMP
            RETURNING id, (xmax = 0) AS created`,
            [jobId, req.user.id, size, behavioralShare]
        );
        const { id: planId, created } = planResult.rows[0];

        await client.query("DELETE FROM prep_plan_items WHERE plan_id = $1", [planId]);
        await client.query(
            `INSERT INTO prep_plan_items (plan_id, question_id, position, category, score, matched_tags)
            SELECT $1, item.question_id, item.position, item.category, item.score,
                ARRAY(SELECT json_array_elements_text(item.matched_tags))
            FROM json_to_recordset($2::json)
                AS item(question_id INT, position INT, category TEXT, score INT, matched_tags JSON)`,
            [planId, JSON.stringify(items.map((item) => ({
                question_id: item.questionId,
                position: item.position,
                category: item.category,
                score: item.score,
                matched_tags: item.matchedTags
            })))]
        );

        await client.query("COMMIT");

        const plan = await findPlan(client, jobId);
        return res.status(created ? 201 : 200).json({
            message: created ? "Prep plan created" : "Prep plan regenerated",
            plan
        });
    } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        console.error("Error generating prep plan:", error);
        return res.status(500).json({ error: "Could not generate prep plan" });
    } finally {
        client.release();
    }
});

// GET /api/jobs/:jobId/plan
plansRouter.get("/:jobId/plan", requireAuth, async (req, res) => {
    const jobId = readJobId(req);
    if (!jobId) {
        return res.status(400).json({ error: "jobId must be a positive whole number" });
    }

    try {
        if (!(await findOwnedJob(pool, jobId, req.user.id))) {
            return res.status(404).json({ error: "Job description not found" });
        }

        const plan = await findPlan(pool, jobId);
        if (!plan) {
            return res.status(404).json({ error: "This job description has no prep plan yet" });
        }

        return res.json({ plan });
    } catch (error) {
        console.error("Error loading prep plan:", error);
        return res.status(500).json({ error: "Could not load prep plan" });
    }
});

export default plansRouter;
