import pool from "../db.js";
import { findQuestions, parseQuestionFilters } from "../routes/questions.js";

let failures = 0;

function check(description, condition) {
    if (condition) {
        console.log("PASS: " + description);
    } else {
        console.error("FAIL: " + description);
        failures++;
    }
}

// Parse a query string the same way the route does, then run it
async function search(queryString) {
    const query = Object.fromEntries(new URLSearchParams(queryString));
    const { filters, error } = parseQuestionFilters(query);
    if (error) {
        throw new Error(`Unexpected validation error for "${queryString}": ${error}`);
    }
    return findQuestions(filters);
}

async function count(sql, params = []) {
    const result = await pool.query(sql, params);
    return Number(result.rows[0].count);
}

async function testQuestionsApi() {
    try {
        // No filters
        const totalInDb = await count("SELECT COUNT(*) FROM questions");
        const all = await search("");
        check("no filters returns every question as the total", all.total === totalInDb);
        check("default page size is 20", all.questions.length === Math.min(20, totalInDb) && all.limit === 20);
        check("totalPages is calculated from total and limit", all.totalPages === Math.ceil(totalInDb / 20));
        check("each question includes its tags as an array", all.questions.every((q) => Array.isArray(q.tags)));
        check("answers are not included in the list", all.questions.every((q) => !("answer_text" in q)));

        // Single filters
        const byType = await search("type=mcq_single");
        check("type filter matches case-insensitively and only returns that type",
            byType.total === await count("SELECT COUNT(*) FROM questions WHERE question_type = 'MCQ_SINGLE'")
            && byType.questions.every((q) => q.question_type === "MCQ_SINGLE"));

        const byDifficulty = await search("difficulty=hard&limit=100");
        check("difficulty filter only returns that difficulty",
            byDifficulty.total === await count("SELECT COUNT(*) FROM questions WHERE difficulty = 'hard'")
            && byDifficulty.questions.every((q) => q.difficulty === "hard"));

        const byTag = await search("tag=react&limit=100");
        check("tag filter matches case-insensitively",
            byTag.total > 0 && byTag.questions.every((q) => q.tags.includes("React")));

        const bySearch = await search("search=PROMISE&limit=100");
        check("search is case-insensitive and matches question text",
            bySearch.total === await count("SELECT COUNT(*) FROM questions WHERE question_text ILIKE '%promise%'")
            && bySearch.questions.every((q) => q.question_text.toLowerCase().includes("promise")));

        // Filters combined with AND
        const combined = await search("difficulty=medium&tag=JavaScript&limit=100");
        check("difficulty + tag combine with AND",
            combined.total === await count(`
                SELECT COUNT(*) FROM questions q
                WHERE q.difficulty = 'medium'
                AND q.id IN (SELECT qt.question_id FROM question_tags qt JOIN tags t ON t.id = qt.tag_id WHERE t.name = 'JavaScript')`)
            && combined.questions.every((q) => q.difficulty === "medium" && q.tags.includes("JavaScript")));

        // Pick a real question with 2+ tags so the multi-tag test always has data
        const sample = all.questions.find((q) => q.tags.length >= 2);
        const [firstTag, secondTag] = sample.tags;
        const multiTag = await search(`tag=${encodeURIComponent(firstTag + "," + secondTag)}&limit=100`);
        check("multiple tags require a question to have all of them",
            multiTag.questions.some((q) => q.id === sample.id)
            && multiTag.questions.every((q) => q.tags.includes(firstTag) && q.tags.includes(secondTag)));

        const threeWay = await search(`type=${sample.question_type}&difficulty=${sample.difficulty}&tag=${encodeURIComponent(firstTag)}&limit=100`);
        check("type + difficulty + tag combine with AND",
            threeWay.questions.some((q) => q.id === sample.id)
            && threeWay.questions.every((q) => q.question_type === sample.question_type
                && q.difficulty === sample.difficulty && q.tags.includes(firstTag)));

        const noMatch = await search("tag=not-a-real-tag");
        check("a filter with no matches returns an empty list", noMatch.total === 0 && noMatch.questions.length === 0);

        // Pagination
        const page1 = await search("limit=10&page=1");
        const page2 = await search("limit=10&page=2");
        const page1Ids = new Set(page1.questions.map((q) => q.id));
        check("page 2 does not repeat questions from page 1",
            page2.questions.length === 10 && page2.questions.every((q) => !page1Ids.has(q.id)));

        const pastEnd = await search("page=9999");
        check("a page past the end returns an empty list with the real total",
            pastEnd.questions.length === 0 && pastEnd.total === totalInDb);

        const capped = await search("limit=500");
        check("limit is capped at 100", capped.limit === 100 && capped.questions.length === Math.min(100, totalInDb));

        // Search input is not treated as SQL wildcards
        const wildcard = await search("search=%25");
        check("a % in search is matched literally, not as a wildcard",
            wildcard.total === await count("SELECT COUNT(*) FROM questions WHERE position('%' in question_text) > 0"));

        // Validation errors
        check("unknown difficulty is rejected", Boolean(parseQuestionFilters({ difficulty: "impossible" }).error));
        check("page=0 is rejected", Boolean(parseQuestionFilters({ page: "0" }).error));
        check("non-numeric limit is rejected", Boolean(parseQuestionFilters({ limit: "ten" }).error));
        check("negative page is rejected", Boolean(parseQuestionFilters({ page: "-1" }).error));

        if (failures === 0) {
            console.log("All questions API tests passed!");
        } else {
            throw new Error(`${failures} questions API test(s) failed`);
        }
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

testQuestionsApi();
