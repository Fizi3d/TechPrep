// Tag-matching algorithm (T24)
//
// Picks the questions a user should practice for one job posting. This module is
// pure: it takes plain data and returns plain data, so it never touches the
// database and the same input always gives the same plan.
//
// Scoring rules (also documented in README.md under "Prep Plan Matching"):
//
// 1. Tags are compared case-insensitively ("React" matches "react").
// 2. A question's score is the number of its tags that are also posting tags.
//    Questions with score 0 are "unmatched".
// 3. Questions are ranked by:
//      a. score, highest first
//      b. focus (score / number of tags the question has), highest first,
//         so a question that is entirely about the posting's topics wins a tie
//      c. question id, lowest first, so ties always break the same way
// 4. Each question is "behavioral" (question_type BEHAVIORAL) or "technical"
//    (every other type). By default 30% of the plan is behavioral.
// 5. Within each category the slots are spread across three difficulty levels,
//    by default 30% easier (intro/easy), 40% medium, 30% harder (hard/expert).
//    If a level runs out, its leftover slots go to the best questions left in
//    any level.
// 6. Coverage: questions are picked one at a time, taking turns between the
//    difficulty levels. Each pick takes the question with the highest coverage
//    score: every matched tag is worth 1 / (1 + times that tag was already picked
//    in this plan). So once a few JavaScript questions are in, a React question
//    beats another JavaScript one, and every posting tag gets a turn. Ties fall
//    back to the ranking in rule 3.
// 7. Technical slots only use matched questions. Behavioral slots use matched
//    behavioral questions first, then unmatched ones, because behavioral rounds
//    happen in every interview whatever the job's tech stack.
// 8. If there are not enough behavioral questions, the leftover slots go to
//    technical questions. If there are not enough technical questions, the
//    leftover slots go to extra *matched* behavioral questions; if there are none,
//    the plan is shorter than requested. The plan is never padded with unrelated
//    questions beyond the behavioral share. A posting with no tags gets an empty plan.
// 9. The final plan lists technical questions first, then behavioral. Within a
//    category, questions go from easier to harder, then in the order they were picked.

export const DEFAULT_PLAN_SIZE = 15;
export const MAX_PLAN_SIZE = 100;
export const DEFAULT_BEHAVIORAL_SHARE = 0.3;

export const DIFFICULTY_LEVELS = ["easier", "medium", "harder"];
export const DEFAULT_DIFFICULTY_MIX = { easier: 0.3, medium: 0.4, harder: 0.3 };

const LEVEL_BY_DIFFICULTY = {
    intro: "easier",
    easy: "easier",
    medium: "medium",
    hard: "harder",
    expert: "harder"
};

function normalizeTag(tag) {
    return String(tag).trim().toLowerCase();
}

function normalizeTags(tags) {
    return [...new Set((tags || []).map(normalizeTag).filter(Boolean))].sort();
}

export function categoryOf(question) {
    return String(question.question_type || "").toUpperCase() === "BEHAVIORAL"
        ? "behavioral"
        : "technical";
}

// Questions with a missing or unknown difficulty count as medium
export function difficultyLevelOf(question) {
    return LEVEL_BY_DIFFICULTY[String(question.difficulty || "").toLowerCase()] || "medium";
}

// Rule 2 and 3b: how well one question matches the posting's tags
export function scoreQuestion(postingTags, question) {
    const wanted = postingTags instanceof Set ? postingTags : new Set(normalizeTags(postingTags));
    const questionTags = normalizeTags(question.tags);
    const matchedTags = questionTags.filter((tag) => wanted.has(tag));

    return {
        score: matchedTags.length,
        focus: questionTags.length > 0 ? matchedTags.length / questionTags.length : 0,
        matchedTags
    };
}

// Rule 3: total order, so sorting never depends on input order
function compareRanked(a, b) {
    return b.score - a.score || b.focus - a.focus || a.id - b.id;
}

// Split `total` slots by `weights` with the largest-remainder method.
// Ties in the remainder go to the earlier level, so the result is deterministic.
export function splitSlots(total, weights) {
    const sum = DIFFICULTY_LEVELS.reduce((acc, level) => acc + weights[level], 0);
    const exact = DIFFICULTY_LEVELS.map((level) => (total * weights[level]) / sum);
    const slots = exact.map(Math.floor);
    let left = total - slots.reduce((acc, n) => acc + n, 0);

    const byRemainder = exact
        .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
        .sort((a, b) => b.remainder - a.remainder || a.index - b.index);

    for (const { index } of byRemainder) {
        if (left === 0) {
            break;
        }
        slots[index] += 1;
        left -= 1;
    }

    return Object.fromEntries(DIFFICULTY_LEVELS.map((level, i) => [level, slots[i]]));
}

// Rule 6: what a question adds given how often each tag is already in the plan
function coverageScore(question, tagUses) {
    let total = 0;
    for (const tag of question.matchedTags) {
        total += 1 / (1 + (tagUses.get(tag) || 0));
    }
    return total;
}

// Take the best remaining candidate out of `candidates` and record its tags as used
function takeBest(candidates, tagUses) {
    let bestIndex = 0;
    let bestCoverage = coverageScore(candidates[0], tagUses);
    for (let i = 1; i < candidates.length; i++) {
        const coverage = coverageScore(candidates[i], tagUses);
        if (coverage > bestCoverage
            || (coverage === bestCoverage && compareRanked(candidates[i], candidates[bestIndex]) < 0)) {
            bestIndex = i;
            bestCoverage = coverage;
        }
    }
    const [best] = candidates.splice(bestIndex, 1);
    for (const tag of best.matchedTags) {
        tagUses.set(tag, (tagUses.get(tag) || 0) + 1);
    }
    return best;
}

// Rules 5 and 6: pick `count` questions, taking turns between difficulty levels.
// `tagUses` is shared across calls so coverage carries over (e.g. matched then
// unmatched behavioral questions).
function pickWithDifficultyMix(candidates, count, difficultyMix, tagUses) {
    const picked = [];
    if (count <= 0 || candidates.length === 0) {
        return picked;
    }

    const quotas = splitSlots(count, difficultyMix);
    const remaining = Object.fromEntries(
        DIFFICULTY_LEVELS.map((level) => [level, candidates.filter((q) => q.level === level)])
    );

    let progress = true;
    while (picked.length < count && progress) {
        progress = false;
        for (const level of DIFFICULTY_LEVELS) {
            if (picked.length < count && quotas[level] > 0 && remaining[level].length > 0) {
                picked.push(takeBest(remaining[level], tagUses));
                quotas[level] -= 1;
                progress = true;
            }
        }
    }

    // Leftover slots from levels that ran out go to the best questions left in any level
    const rest = DIFFICULTY_LEVELS.flatMap((level) => remaining[level]);
    while (picked.length < count && rest.length > 0) {
        picked.push(takeBest(rest, tagUses));
    }

    return picked;
}

function validateOptions({ size, behavioralShare, difficultyMix }) {
    if (!Number.isInteger(size) || size < 1 || size > MAX_PLAN_SIZE) {
        throw new TypeError(`size must be a whole number from 1 to ${MAX_PLAN_SIZE}`);
    }
    if (typeof behavioralShare !== "number" || !(behavioralShare >= 0 && behavioralShare <= 1)) {
        throw new TypeError("behavioralShare must be a number from 0 to 1");
    }
    const weights = DIFFICULTY_LEVELS.map((level) => difficultyMix[level]);
    if (weights.some((w) => typeof w !== "number" || !(w >= 0)) || weights.every((w) => w === 0)) {
        throw new TypeError(
            `difficultyMix needs non-negative numbers for ${DIFFICULTY_LEVELS.join(", ")} and at least one above 0`
        );
    }
}

/**
 * Build a prep plan for one job posting.
 *
 * @param {string[]} postingTags  tag names attached to the job posting
 * @param {Array<{id: number, question_type: string, difficulty: string, tags: string[]}>} questions
 *        every question that may be used
 * @param {object} [options]
 * @param {number} [options.size=15]               how many questions the plan should have
 * @param {number} [options.behavioralShare=0.3]   share of the plan that is behavioral (0 to 1)
 * @param {{easier: number, medium: number, harder: number}} [options.difficultyMix]
 *        relative weight of each difficulty level inside a category
 * @returns {{items: object[], summary: object}}
 */
export function buildPrepPlan(postingTags, questions, options = {}) {
    const size = options.size ?? DEFAULT_PLAN_SIZE;
    const behavioralShare = options.behavioralShare ?? DEFAULT_BEHAVIORAL_SHARE;
    const difficultyMix = { ...DEFAULT_DIFFICULTY_MIX, ...options.difficultyMix };
    validateOptions({ size, behavioralShare, difficultyMix });

    const tags = normalizeTags(postingTags);
    const wanted = new Set(tags);

    const summary = {
        requestedSize: size,
        size: 0,
        postingTags: tags,
        technical: 0,
        behavioral: 0,
        unmatchedBehavioral: 0,
        uncoveredTags: tags
    };

    if (tags.length === 0) {
        return { items: [], summary };
    }

    // Score everything once. Duplicate ids keep the first copy.
    const seen = new Set();
    const ranked = { technical: [], behavioral: [] };
    for (const question of questions || []) {
        if (!Number.isInteger(question?.id) || seen.has(question.id)) {
            continue;
        }
        seen.add(question.id);
        ranked[categoryOf(question)].push({
            id: question.id,
            category: categoryOf(question),
            difficulty: question.difficulty ?? null,
            level: difficultyLevelOf(question),
            ...scoreQuestion(wanted, question)
        });
    }
    ranked.technical = ranked.technical.filter((q) => q.score > 0).sort(compareRanked);
    ranked.behavioral.sort(compareRanked);

    const matchedBehavioral = ranked.behavioral.filter((q) => q.score > 0);
    const unmatchedBehavioral = ranked.behavioral.filter((q) => q.score === 0);

    // Rules 4 and 8: decide how many slots each category gets
    const behavioralQuota = Math.min(Math.round(size * behavioralShare), ranked.behavioral.length);
    const technicalSlots = Math.min(size - behavioralQuota, ranked.technical.length);
    // Spare slots (technical ran short) only go to behavioral questions that match the posting
    const behavioralSlots = Math.min(
        size - technicalSlots,
        Math.max(behavioralQuota, matchedBehavioral.length)
    );

    // Rule 7: matched behavioral questions come first, unmatched ones only fill the quota
    const behavioralTagUses = new Map();
    const behavioralPicks = pickWithDifficultyMix(
        matchedBehavioral, behavioralSlots, difficultyMix, behavioralTagUses
    );
    behavioralPicks.push(...pickWithDifficultyMix(
        unmatchedBehavioral, behavioralSlots - behavioralPicks.length, difficultyMix, behavioralTagUses
    ));

    const technicalPicks = pickWithDifficultyMix(ranked.technical, technicalSlots, difficultyMix, new Map());

    // Rule 9: final order is category, then difficulty level, then pick order
    const levelOrder = (q) => DIFFICULTY_LEVELS.indexOf(q.level);
    const byLevelThenPick = (picks) => picks
        .map((q, pickIndex) => ({ q, pickIndex }))
        .sort((a, b) => levelOrder(a.q) - levelOrder(b.q) || a.pickIndex - b.pickIndex)
        .map(({ q }) => q);
    const ordered = [...byLevelThenPick(technicalPicks), ...byLevelThenPick(behavioralPicks)];

    const items = ordered.map((q, index) => ({
        position: index + 1,
        questionId: q.id,
        category: q.category,
        difficulty: q.difficulty,
        score: q.score,
        matchedTags: q.matchedTags
    }));

    const covered = new Set(items.flatMap((item) => item.matchedTags));

    return {
        items,
        summary: {
            ...summary,
            size: items.length,
            technical: technicalPicks.length,
            behavioral: behavioralPicks.length,
            unmatchedBehavioral: behavioralPicks.filter((q) => q.score === 0).length,
            uncoveredTags: tags.filter((tag) => !covered.has(tag))
        }
    };
}

// Load every question with its tag names, in the shape buildPrepPlan expects.
// `db` is anything with a pg-style query() method (the shared pool or a client).
export async function loadQuestionsForMatching(db) {
    const result = await db.query(
        `SELECT q.id, q.question_type, q.difficulty,
            COALESCE(ARRAY_AGG(t.name ORDER BY t.name) FILTER (WHERE t.name IS NOT NULL), '{}') AS tags
        FROM questions q
        LEFT JOIN question_tags qt ON qt.question_id = q.id
        LEFT JOIN tags t ON t.id = qt.tag_id
        GROUP BY q.id
        ORDER BY q.id`
    );
    return result.rows;
}
