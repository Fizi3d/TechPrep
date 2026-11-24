// Integration tests for the prep plan API (T25).
// Needs the server running (node server.js) with the questions imported.
import dotenv from "dotenv";
dotenv.config();

const url = `http://localhost:${process.env.PORT || 3000}`;
let failures = 0;

function check(description, condition) {
    if (condition) {
        console.log("PASS: " + description);
    } else {
        console.error("FAIL: " + description);
        failures++;
    }
}

async function loginAs(username) {
    const account = { username, email: `${username}@example.com`, password: "testpassword123" };
    let res = await fetch(url + "/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(account)
    });
    if (!res.ok) {
        res = await fetch(url + "/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: account.email, password: account.password })
        });
    }
    const setCookie = res.headers.get("set-cookie");
    return setCookie ? setCookie.split(";")[0] : "";
}

function api(cookie) {
    return async (method, path, body) => {
        const res = await fetch(url + path, {
            method,
            headers: { "Content-Type": "application/json", Cookie: cookie },
            body: body === undefined ? undefined : JSON.stringify(body)
        });
        const data = await res.json().catch(() => null);
        return { status: res.status, data };
    };
}

const questionIds = (plan) => plan.items.map((item) => item.question.id);

async function testPlansApi() {
    const owner = api(await loginAs("plantest"));
    const other = api(await loginAs("plantest2"));
    let jobId;

    try {
        // --- Setup: a job description ---
        const created = await owner("POST", "/api/jobs", {
            title: "Frontend Engineer",
            company: "Plan Test Co",
            content: "React, JavaScript, and working well with a team"
        });
        jobId = created.data?.job?.id;
        check("setup: job description created", created.status === 201 && jobId);

        // --- Auth protection ---
        const unauthedGet = await fetch(`${url}/api/jobs/${jobId}/plan`);
        check("GET plan requires authentication", unauthedGet.status === 401);
        const unauthedPost = await fetch(`${url}/api/jobs/${jobId}/plan`, { method: "POST" });
        check("POST plan requires authentication", unauthedPost.status === 401);

        // --- Validation ---
        check("bad jobId returns 400", (await owner("GET", "/api/jobs/abc/plan")).status === 400);
        check("size 0 returns 400", (await owner("POST", `/api/jobs/${jobId}/plan`, { size: 0 })).status === 400);
        check("size as text returns 400", (await owner("POST", `/api/jobs/${jobId}/plan`, { size: "10" })).status === 400);
        check("behavioralShare above 1 returns 400",
            (await owner("POST", `/api/jobs/${jobId}/plan`, { behavioralShare: 2 })).status === 400);

        // --- No tags yet ---
        const noTags = await owner("POST", `/api/jobs/${jobId}/plan`);
        check("POST without job tags returns 400", noTags.status === 400);
        const noPlan = await owner("GET", `/api/jobs/${jobId}/plan`);
        check("GET before generating returns 404", noPlan.status === 404);

        // --- Tag the job ---
        const tagsRes = await owner("GET", "/api/tags");
        const tagList = tagsRes.data?.tags || tagsRes.data || [];
        const wanted = ["React", "JavaScript", "teamwork"];
        const tagIds = wanted.map((name) => tagList.find((tag) => tag.name === name)?.id);
        check("setup: React, JavaScript and teamwork tags exist", tagIds.every(Boolean));
        for (const tagId of tagIds) {
            await owner("POST", `/api/jobs/${jobId}/tags`, { tagId });
        }

        // --- Generate ---
        const first = await owner("POST", `/api/jobs/${jobId}/plan`);
        const plan = first.data?.plan;
        check("POST generates a plan (201)", first.status === 201 && plan);
        check("plan has 15 items by default", plan?.items.length === 15);
        check("plan is 10 technical + 5 behavioral",
            plan?.summary.technical === 10 && plan?.summary.behavioral === 5);
        check("positions run 1..n",
            plan?.items.every((item, index) => item.position === index + 1));
        const categories = plan?.items.map((item) => item.category) || [];
        check("technical items come before behavioral",
            categories.lastIndexOf("technical") < categories.indexOf("behavioral"));
        check("items include question details",
            plan?.items.every((item) => item.question.question_text && item.question.question_type && Array.isArray(item.question.tags)));
        check("technical items match a job tag",
            plan?.items.filter((item) => item.category === "technical").every((item) => item.score > 0));
        check("every job tag is covered", plan?.summary.uncoveredTags.length === 0);

        // --- Retrieve ---
        const fetched = await owner("GET", `/api/jobs/${jobId}/plan`);
        check("GET returns the stored plan", fetched.status === 200 && fetched.data.plan.id === plan.id);
        check("GET returns the same items in order",
            JSON.stringify(questionIds(fetched.data.plan)) === JSON.stringify(questionIds(plan)));

        // --- Regenerate ---
        const again = await owner("POST", `/api/jobs/${jobId}/plan`);
        check("POST again regenerates (200)", again.status === 200);
        check("regenerate keeps the same plan id", again.data?.plan.id === plan.id);
        check("same tags give the same plan",
            JSON.stringify(questionIds(again.data.plan)) === JSON.stringify(questionIds(plan)));

        const smaller = await owner("POST", `/api/jobs/${jobId}/plan`, { size: 6, behavioralShare: 0.5 });
        check("regenerate with options uses them",
            smaller.status === 200 && smaller.data.plan.items.length === 6 && smaller.data.plan.summary.behavioral === 3);
        const keep = await owner("POST", `/api/jobs/${jobId}/plan`);
        check("regenerate without options keeps the saved size and share",
            keep.data?.plan.size === 6 && keep.data?.plan.behavioralShare === 0.5 && keep.data.plan.items.length === 6);

        // --- Other users ---
        check("another user cannot read the plan (404)",
            (await other("GET", `/api/jobs/${jobId}/plan`)).status === 404);
        check("another user cannot generate a plan (404)",
            (await other("POST", `/api/jobs/${jobId}/plan`)).status === 404);
        check("unknown job returns 404",
            (await owner("GET", "/api/jobs/999999999/plan")).status === 404);

        // --- Deleting the job removes its plan ---
        await owner("DELETE", `/api/jobs/${jobId}`);
        check("plan is gone after its job is deleted",
            (await owner("GET", `/api/jobs/${jobId}/plan`)).status === 404);
        jobId = null;
    } catch (error) {
        console.error("FAIL: " + error.message);
        failures++;
    } finally {
        if (jobId) {
            await owner("DELETE", `/api/jobs/${jobId}`);
        }
    }

    if (failures > 0) {
        console.error(`${failures} prep plan test(s) failed`);
        process.exitCode = 1;
    } else {
        console.log("All prep plan tests passed!");
    }
}

testPlansApi();
