
import { readFile } from "node:fs/promises";
import pool from "../db.js";

// we are gonna read the questions from the json file
const file = await readFile("./db/data/questions.json", "utf8");
const data = JSON.parse(file);

console.log("Questions found:", data.questions.length);

let added = 0;

try {
    // Here we go through each question and save it to the database
    for (const question of data.questions) {
        const result = await pool.query(
            `INSERT INTO questions (
                question_text,
                answer_text,
                answer_data,
                explanation,
                difficulty,
                question_type,
                source_company,
                source_name,
                source_url,
                source_question_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (source_name, source_question_id) DO NOTHING`,
            [
                question.prompt,
                question.answer.sampleAnswer || question.answer.back || null,
                JSON.stringify(question.answer),
                question.explanation,
                question.difficultyLabel,
                question.type,
                null,
                "CodePrep",
                "https://github.com/codeprepdev/codeprep-questions/blob/main/data/questions.json",
                question.id
            ]
        );

        added += result.rowCount;

        
        // Import interview questions from CodePrep and connect them to their tags in the database
        const questionResult = await pool.query(
            "SELECT id FROM questions WHERE source_name = $1 AND source_question_id = $2",
            ["CodePrep", question.id]
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

    console.log("New questions added:", added);
} catch (error) {
    console.error("Error importing questions:", error.message);
} finally {
    await pool.end();
}
