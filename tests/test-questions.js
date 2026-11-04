import pool from "../db.js";

async function testQuestions() {
    try {
        const result = await pool.query("SELECT COUNT(*) FROM questions");
        const total = Number(result.rows[0].count);

        if (total >= 5) {
            console.log("PASS: Database contains " + total + " questions");
        } else {
            throw new Error("FAIL: Not enough questions in database");
        }
        const questions = await pool.query(
            "SELECT id, question_text FROM questions ORDER BY id LIMIT 5"
        );

        if (questions.rows.length === 5) {
            console.log("PASS: Successfully retrieved 5 questions");
        } else {
            throw new Error("FAIL: Could not retrieve 5 questions");
        }
        for (let question of questions.rows) {
            if (!question.question_text) {
                throw new Error("FAIL: Question is missing text");
            }
        }
        console.log("PASS: All 5 questions contain text");
        console.log("All question database tests passed!");

    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

testQuestions();
