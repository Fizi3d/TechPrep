import { readFile } from "node:fs/promises";
import pool from "../db.js";

const file = await readFile("./db/data/behavioral-questions.json", "utf8");
const data = JSON.parse(file);

console.log("Behavioral questions found:", data.questions.length);

let added = 0;
try {
    for (const question of data.questions) {
        const result = await pool.query(
            `INSERT INTO questions (
                question_text,
                answer_text,
                answer_data,
                explanation,
                difficulty,
                question_type,
                source_name,
                source_question_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (source_name, source_question_id) DO NOTHING`,
            [
                question.prompt,
                question.answer.sampleAnswer,
                JSON.stringify(question.answer),
                question.explanation,
                question.difficultyLabel,
                question.type,
                "TechPrep",
                question.id
            ]
        );

        added += result.rowCount;

        const questionResult = await pool.query(
            "SELECT id FROM questions WHERE source_name = $1 AND source_question_id = $2",
            ["TechPrep", question.id]
        );

        const questionId = questionResult.rows[0].id;

        const allTags = [question.technologyName, ...question.tags];

        for (const tag of allTags) {
            await pool.query(
                "INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO NOTHING",
                [tag]
            );

            const tagResult = await pool.query(
                "SELECT id FROM tags WHERE name = $1",
                [tag]
            );

            const tagId = tagResult.rows[0].id;

            await pool.query(
                "INSERT INTO question_tags (question_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
                [questionId, tagId]
            );
        }
    }
    console.log("New behavioral questions added:", added);

} catch (error) {
    console.error("Error importing behavioral questions:", error.message);
    process.exitCode = 1;
} finally {
    await pool.end();
}
