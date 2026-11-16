import { Router } from "express";
import pool from "../db.js";

const questionsRouter = Router();

const DIFFICULTIES = ["intro", "easy", "medium", "hard", "expert"];
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// Query params can arrive as arrays (?tag=a&tag=b), so flatten everything to one trimmed string
function readParam(value) {
    if (value === undefined) {
        return "";
    }
    return (Array.isArray(value) ? value.join(",") : String(value)).trim();
}

function readPositiveInt(value, name) {
    if (value === "") {
        return { value: null };
    }
    if (!/^\d+$/.test(value) || Number(value) < 1) {
        return { error: `${name} must be a positive whole number` };
    }
    return { value: Number(value) };
}

// Turn req.query into clean filters, or return { error } for bad input
export function parseQuestionFilters(query) {
    const type = readParam(query.type).toUpperCase();
    const difficulty = readParam(query.difficulty).toLowerCase();
    const search = readParam(query.search);
    const tags = [...new Set(
        readParam(query.tag)
            .split(",")
            .map((tag) => tag.trim().toLowerCase())
            .filter(Boolean)
    )];

    if (difficulty && !DIFFICULTIES.includes(difficulty)) {
        return { error: `difficulty must be one of: ${DIFFICULTIES.join(", ")}` };
    }

    const page = readPositiveInt(readParam(query.page), "page");
    if (page.error) {
        return { error: page.error };
    }
    const limit = readPositiveInt(readParam(query.limit), "limit");
    if (limit.error) {
        return { error: limit.error };
    }

    return {
        filters: {
            type,
            difficulty,
            search,
            tags,
            page: page.value || 1,
            limit: Math.min(limit.value || DEFAULT_LIMIT, MAX_LIMIT)
        }
    };
}

// Run the filtered, paginated query. Every filter given is combined with AND.
export async function findQuestions({ type, difficulty, search, tags, page, limit }) {
    const conditions = [];
    const params = [];

    if (type) {
        params.push(type);
        conditions.push(`q.question_type = $${params.length}`);
    }

    if (difficulty) {
        params.push(difficulty);
        conditions.push(`q.difficulty = $${params.length}`);
    }

    if (search) {
        // Escape LIKE wildcards so "%" or "_" in the search box are matched literally
        const escaped = search.replace(/[\\%_]/g, (char) => "\\" + char);
        params.push(`%${escaped}%`);
        conditions.push(`q.question_text ILIKE $${params.length}`);
    }

    if (tags.length > 0) {
        // A question must have every requested tag
        params.push(tags);
        const tagsParam = params.length;
        params.push(tags.length);
        conditions.push(`q.id IN (
            SELECT qt.question_id
            FROM question_tags qt
            JOIN tags t ON t.id = qt.tag_id
            WHERE LOWER(t.name) = ANY($${tagsParam})
            GROUP BY qt.question_id
            HAVING COUNT(DISTINCT LOWER(t.name)) = $${params.length}
        )`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await pool.query(
        `SELECT COUNT(*) AS total FROM questions q ${where}`,
        params
    );
    const total = Number(countResult.rows[0].total);

    const offset = (page - 1) * limit;
    const result = await pool.query(
        `SELECT q.id, q.question_text, q.difficulty, q.question_type,
            COALESCE((
                SELECT ARRAY_AGG(t.name ORDER BY t.name)
                FROM question_tags qt
                JOIN tags t ON t.id = qt.tag_id
                WHERE qt.question_id = q.id
            ), '{}') AS tags
        FROM questions q
        ${where}
        ORDER BY q.id
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
    );

    return {
        questions: result.rows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
    };
}

// GET /api/questions?type=&difficulty=&tag=&search=&page=&limit=
questionsRouter.get("/questions", async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: "Please log in first" });
    }

    const { filters, error } = parseQuestionFilters(req.query);
    if (error) {
        return res.status(400).json({ error });
    }

    try {
        res.json(await findQuestions(filters));
    } catch (error) {
        console.error("Error loading questions:", error);
        res.status(500).json({ error: "Could not load questions" });
    }
});

export default questionsRouter;
