// Unit tests for the tag-matching algorithm (T24). No database needed.
// Run with: node --test tests/test-matching.js
import { test } from "node:test";
import assert from "node:assert/strict";

import {
    buildPrepPlan,
    scoreQuestion,
    splitSlots,
    difficultyLevelOf,
    categoryOf,
    loadQuestionsForMatching,
    DEFAULT_DIFFICULTY_MIX
} from "../lib/matching.js";

let nextId = 1;
function q(type, difficulty, tags, id = nextId++) {
    return { id, question_type: type, difficulty, tags };
}

// A small question bank: React/JavaScript technical questions at every level,
// one unrelated Python question, and behavioral questions.
function sampleBank() {
    nextId = 1;
    return [
        q("MCQ_SINGLE", "easy", ["React", "usestate"]),               // 1
        q("SHORT_ANSWER", "medium", ["React", "rules-of-hooks"]),     // 2
        q("CODE_OUTPUT", "hard", ["React", "JavaScript", "effect-races"]), // 3
        q("FLASHCARD", "intro", ["JavaScript", "truthiness"]),        // 4
        q("FIND_THE_BUG", "medium", ["JavaScript", "async-await"]),   // 5
        q("MCQ_MULTI", "expert", ["JavaScript", "microtasks"]),       // 6
        q("TRUE_FALSE", "medium", ["Python", "gil"]),                 // 7
        q("BEHAVIORAL", "easy", ["Behavioral", "teamwork", "communication"]), // 8
        q("BEHAVIORAL", "medium", ["Behavioral", "leadership"]),      // 9
        q("BEHAVIORAL", "hard", ["Behavioral", "conflict-resolution"]), // 10
        q("BEHAVIORAL", "medium", ["Behavioral", "teamwork"])         // 11
    ];
}

const ids = (plan) => plan.items.map((item) => item.questionId);

test("scoreQuestion counts shared tags case-insensitively", () => {
    const result = scoreQuestion(["react", " JAVASCRIPT "], q("CODE_OUTPUT", "hard", ["React", "JavaScript", "effect-races"]));
    assert.equal(result.score, 2);
    assert.deepEqual(result.matchedTags, ["javascript", "react"]);
    assert.equal(result.focus, 2 / 3);
});

test("scoreQuestion handles questions without tags", () => {
    assert.deepEqual(scoreQuestion(["react"], { id: 1, tags: null }), { score: 0, focus: 0, matchedTags: [] });
});

test("categoryOf and difficultyLevelOf map types and difficulties", () => {
    assert.equal(categoryOf({ question_type: "BEHAVIORAL" }), "behavioral");
    assert.equal(categoryOf({ question_type: "behavioral" }), "behavioral");
    assert.equal(categoryOf({ question_type: "MCQ_SINGLE" }), "technical");
    assert.equal(categoryOf({}), "technical");
    assert.equal(difficultyLevelOf({ difficulty: "intro" }), "easier");
    assert.equal(difficultyLevelOf({ difficulty: "easy" }), "easier");
    assert.equal(difficultyLevelOf({ difficulty: "medium" }), "medium");
    assert.equal(difficultyLevelOf({ difficulty: "hard" }), "harder");
    assert.equal(difficultyLevelOf({ difficulty: "EXPERT" }), "harder");
    assert.equal(difficultyLevelOf({ difficulty: null }), "medium");
    assert.equal(difficultyLevelOf({ difficulty: "weird" }), "medium");
});

test("splitSlots always adds up and breaks remainder ties toward easier", () => {
    assert.deepEqual(splitSlots(10, DEFAULT_DIFFICULTY_MIX), { easier: 3, medium: 4, harder: 3 });
    assert.deepEqual(splitSlots(5, DEFAULT_DIFFICULTY_MIX), { easier: 2, medium: 2, harder: 1 });
    assert.deepEqual(splitSlots(1, DEFAULT_DIFFICULTY_MIX), { easier: 0, medium: 1, harder: 0 });
    assert.deepEqual(splitSlots(0, DEFAULT_DIFFICULTY_MIX), { easier: 0, medium: 0, harder: 0 });
    for (let n = 0; n <= 40; n++) {
        const s = splitSlots(n, DEFAULT_DIFFICULTY_MIX);
        assert.equal(s.easier + s.medium + s.harder, n);
    }
});

test("same input gives the same plan", () => {
    const bank = sampleBank();
    const first = buildPrepPlan(["React", "JavaScript", "teamwork"], bank, { size: 8 });
    const second = buildPrepPlan(["React", "JavaScript", "teamwork"], sampleBank(), { size: 8 });
    assert.deepEqual(first, second);
});

test("plan does not depend on input order or tag order/case", () => {
    const bank = sampleBank();
    const shuffled = [...bank].reverse();
    const a = buildPrepPlan(["React", "JavaScript", "teamwork"], bank, { size: 8 });
    const b = buildPrepPlan(["teamwork", "javascript", "REACT", "react"], shuffled, { size: 8 });
    assert.deepEqual(a, b);
});

test("does not change the input", () => {
    const bank = sampleBank();
    const tags = ["React", "teamwork"];
    const copy = structuredClone(bank);
    buildPrepPlan(tags, bank, { size: 6 });
    assert.deepEqual(bank, copy);
    assert.deepEqual(tags, ["React", "teamwork"]);
});

test("unrelated technical questions are never picked", () => {
    const plan = buildPrepPlan(["React", "JavaScript", "teamwork"], sampleBank(), { size: 20 });
    assert.ok(!ids(plan).includes(7), "Python question should not be in a React plan");
    for (const item of plan.items.filter((i) => i.category === "technical")) {
        assert.ok(item.score > 0);
    }
});

test("higher overlap ranks first and focus breaks ties", () => {
    nextId = 1;
    const bank = [
        q("SHORT_ANSWER", "medium", ["React", "a", "b", "c"]),  // 1: score 1, focus 1/4
        q("SHORT_ANSWER", "medium", ["React"]),                // 2: score 1, focus 1
        q("SHORT_ANSWER", "medium", ["React", "JavaScript"])   // 3: score 2
    ];
    const plan = buildPrepPlan(["react", "javascript"], bank, { size: 3, behavioralShare: 0 });
    assert.deepEqual(ids(plan), [3, 2, 1]);
    assert.deepEqual(plan.items.map((i) => i.position), [1, 2, 3]);
});

test("exact ties break by lowest question id", () => {
    nextId = 1;
    const bank = [
        q("SHORT_ANSWER", "medium", ["React"], 30),
        q("SHORT_ANSWER", "medium", ["React"], 10),
        q("SHORT_ANSWER", "medium", ["React"], 20)
    ];
    const plan = buildPrepPlan(["React"], bank, { size: 2, behavioralShare: 0 });
    assert.deepEqual(ids(plan), [10, 20]);
});

test("rotates through posting tags instead of filling up on one tag", () => {
    nextId = 1;
    const bank = [];
    // Lower ids are all JavaScript, so ranking alone would pick only JavaScript
    for (let i = 0; i < 6; i++) bank.push(q("SHORT_ANSWER", "medium", ["JavaScript"]));
    bank.push(q("SHORT_ANSWER", "medium", ["React"]));
    bank.push(q("SHORT_ANSWER", "medium", ["CSS"]));

    const plan = buildPrepPlan(["JavaScript", "React", "CSS"], bank, { size: 3, behavioralShare: 0 });
    assert.deepEqual(ids(plan), [1, 7, 8]);
    assert.deepEqual(plan.summary.uncoveredTags, []);
});

test("a question covering two new tags beats one covering a used tag", () => {
    nextId = 1;
    const bank = [
        q("SHORT_ANSWER", "medium", ["JavaScript"]),          // 1
        q("SHORT_ANSWER", "medium", ["JavaScript"]),          // 2
        q("SHORT_ANSWER", "medium", ["React", "CSS"])         // 3
    ];
    const plan = buildPrepPlan(["JavaScript", "React", "CSS"], bank, { size: 2, behavioralShare: 0 });
    assert.deepEqual(ids(plan), [3, 1]);
});

test("respects the behavioral share", () => {
    const plan = buildPrepPlan(["React", "JavaScript", "teamwork"], sampleBank(), { size: 6, behavioralShare: 0.5 });
    assert.equal(plan.summary.technical, 3);
    assert.equal(plan.summary.behavioral, 3);
    assert.equal(plan.items.length, 6);
});

test("technical questions come first, then behavioral, each easier to harder", () => {
    const plan = buildPrepPlan(["React", "JavaScript", "teamwork"], sampleBank(), { size: 9, behavioralShare: 0.34 });
    const categories = plan.items.map((i) => i.category);
    const firstBehavioral = categories.indexOf("behavioral");
    assert.ok(firstBehavioral > 0);
    assert.ok(categories.slice(firstBehavioral).every((c) => c === "behavioral"));

    const rank = { intro: 0, easy: 0, medium: 1, hard: 2, expert: 2 };
    for (const category of ["technical", "behavioral"]) {
        const levels = plan.items.filter((i) => i.category === category).map((i) => rank[i.difficulty]);
        assert.deepEqual(levels, [...levels].sort((a, b) => a - b));
    }
});

test("spreads technical questions across difficulty levels", () => {
    nextId = 1;
    const bank = [];
    // Many easy questions that match strongly, plus a few weaker medium/hard ones
    for (let i = 0; i < 10; i++) bank.push(q("SHORT_ANSWER", "easy", ["React", "JavaScript"]));
    bank.push(q("SHORT_ANSWER", "medium", ["React"]));
    bank.push(q("SHORT_ANSWER", "medium", ["React"]));
    bank.push(q("SHORT_ANSWER", "hard", ["React"]));
    bank.push(q("SHORT_ANSWER", "expert", ["React"]));

    const plan = buildPrepPlan(["React", "JavaScript"], bank, { size: 10, behavioralShare: 0 });
    const count = (d) => plan.items.filter((i) => i.difficulty === d).length;
    // Quotas for 10 are 3 easier / 4 medium / 3 harder. Only 2 medium and 2 harder exist,
    // so the 3 spare slots go to the next best easy questions.
    assert.equal(count("medium"), 2);
    assert.equal(count("hard") + count("expert"), 2);
    assert.equal(count("easy"), 6);
});

test("behavioral slots prefer matched questions, then fill with unmatched", () => {
    const plan = buildPrepPlan(["React", "teamwork"], sampleBank(), { size: 6, behavioralShare: 0.5 });
    const behavioral = plan.items.filter((i) => i.category === "behavioral");
    assert.equal(behavioral.length, 3);
    // 8 and 11 match "teamwork"; one unmatched behavioral question fills the third slot
    assert.ok(ids(plan).includes(8));
    assert.ok(ids(plan).includes(11));
    assert.equal(plan.summary.unmatchedBehavioral, 1);
});

test("not enough technical questions: spare slots go to matched behavioral only", () => {
    // Only "teamwork" matches: no technical questions, two matched behavioral (8, 11)
    const plan = buildPrepPlan(["teamwork"], sampleBank(), { size: 10, behavioralShare: 0.2 });
    assert.equal(plan.summary.technical, 0);
    // Quota is 2 behavioral; extra slots may only use matched behavioral questions
    assert.deepEqual(ids(plan).sort((a, b) => a - b), [8, 11]);
    assert.equal(plan.summary.size, 2);
    assert.equal(plan.summary.requestedSize, 10);
});

test("not enough behavioral questions: spare slots go to technical", () => {
    nextId = 1;
    const bank = [];
    for (let i = 0; i < 8; i++) bank.push(q("SHORT_ANSWER", "medium", ["SQL"]));
    bank.push(q("BEHAVIORAL", "easy", ["teamwork"]));
    const plan = buildPrepPlan(["SQL"], bank, { size: 6, behavioralShare: 0.5 });
    assert.equal(plan.summary.behavioral, 1);
    assert.equal(plan.summary.technical, 5);
});

test("plan is shorter than requested when the bank is small", () => {
    const plan = buildPrepPlan(["React"], sampleBank(), { size: 50 });
    // 3 React questions + all 4 behavioral (quota of 15 is capped at 4)
    assert.equal(plan.summary.technical, 3);
    assert.equal(plan.summary.behavioral, 4);
    assert.equal(plan.items.length, 7);
});

test("posting with no tags gets an empty plan", () => {
    for (const tags of [[], null, undefined, ["", "  "]]) {
        const plan = buildPrepPlan(tags, sampleBank());
        assert.deepEqual(plan.items, []);
        assert.equal(plan.summary.size, 0);
    }
});

test("empty question bank gives an empty plan", () => {
    assert.deepEqual(buildPrepPlan(["React"], []).items, []);
    assert.deepEqual(buildPrepPlan(["React"], null).items, []);
});

test("summary lists posting tags that no picked question covers", () => {
    const plan = buildPrepPlan(["React", "Kubernetes", "teamwork"], sampleBank(), { size: 10 });
    assert.deepEqual(plan.summary.postingTags, ["kubernetes", "react", "teamwork"]);
    assert.deepEqual(plan.summary.uncoveredTags, ["kubernetes"]);
});

test("ignores duplicate ids and items without an id", () => {
    nextId = 1;
    const bank = [
        q("SHORT_ANSWER", "medium", ["React"], 1),
        q("SHORT_ANSWER", "medium", ["React"], 1),
        { question_type: "SHORT_ANSWER", difficulty: "medium", tags: ["React"] }
    ];
    assert.deepEqual(ids(buildPrepPlan(["React"], bank, { behavioralShare: 0 })), [1]);
});

test("uses 15 questions and 30% behavioral by default", () => {
    nextId = 1;
    const bank = [];
    for (let i = 0; i < 30; i++) bank.push(q("SHORT_ANSWER", ["easy", "medium", "hard"][i % 3], ["React"]));
    for (let i = 0; i < 30; i++) bank.push(q("BEHAVIORAL", ["easy", "medium", "hard"][i % 3], ["teamwork"]));
    const plan = buildPrepPlan(["React", "teamwork"], bank);
    assert.equal(plan.items.length, 15);
    assert.equal(plan.summary.behavioral, 5);
    assert.equal(plan.summary.technical, 10);
});

test("rejects bad options", () => {
    const bank = sampleBank();
    assert.throws(() => buildPrepPlan(["React"], bank, { size: 0 }), TypeError);
    assert.throws(() => buildPrepPlan(["React"], bank, { size: 2.5 }), TypeError);
    assert.throws(() => buildPrepPlan(["React"], bank, { size: 101 }), TypeError);
    assert.throws(() => buildPrepPlan(["React"], bank, { behavioralShare: 1.5 }), TypeError);
    assert.throws(() => buildPrepPlan(["React"], bank, { behavioralShare: Number.NaN }), TypeError);
    assert.throws(() => buildPrepPlan(["React"], bank, { difficultyMix: { easier: -1 } }), TypeError);
    assert.throws(
        () => buildPrepPlan(["React"], bank, { difficultyMix: { easier: 0, medium: 0, harder: 0 } }),
        TypeError
    );
});

test("loadQuestionsForMatching returns the query rows", async () => {
    const rows = [{ id: 1, question_type: "MCQ_SINGLE", difficulty: "easy", tags: ["React"] }];
    let sql = "";
    const fakeDb = { query: async (text) => { sql = text; return { rows }; } };
    assert.equal(await loadQuestionsForMatching(fakeDb), rows);
    assert.match(sql, /FROM questions q/);
});
