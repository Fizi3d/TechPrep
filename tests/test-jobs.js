import dotenv from "dotenv";
dotenv.config();

const url = `http://localhost:${process.env.PORT || 3000}`;
let failures = 0;
let cookie = "";

function check(description, condition) {
  if (condition) {
    console.log("PASS: " + description);
  } else {
    console.error("FAIL: " + description);
    failures++;
  }
}

async function loginAsTestUser() {
  let res = await fetch(url + "/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "jobtest",
      email: "jobtest@example.com",
      password: "testpassword123"
    })
  });

  if (!res.ok) {
    res = await fetch(url + "/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "jobtest@example.com",
        password: "testpassword123"
      })
    });
  }

  const setCookie = res.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
}

async function testJobsApi() {
  try {
    await loginAsTestUser();

    // --- Auth protection ---
    const unauthed = await fetch(url + "/api/jobs");
    check("job descriptions require authentication", unauthed.status === 401);

    // --- POST ---
    const createRes = await fetch(url + "/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({
        title: "Software Engineer",
        company: "Test Co",
        content: "Looking for a software engineer with experience in Node.js"
      })
    });
    check("POST creates a job description", createRes.status === 201);
    const created = await createRes.json();
    const jobId = created.job?.id;
    check("POST returns the created job", jobId !== undefined);

    // --- POST validation ---
    const missingTitle = await fetch(url + "/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ company: "Test Co", content: "Some content" })
    });
    check("POST rejects missing title", missingTitle.status === 400);

    const missingContent = await fetch(url + "/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ title: "Engineer", company: "Test Co" })
    });
    check("POST rejects missing content", missingContent.status === 400);

    // --- GET all ---
    const getAll = await fetch(url + "/api/jobs", {
      headers: { Cookie: cookie }
    });
    check("GET returns job descriptions", getAll.status === 200);
    const getAllData = await getAll.json();
    check("GET returns an array of jobs", Array.isArray(getAllData.jobs));
    check("GET includes the created job", getAllData.jobs.some((j) => j.id === jobId));

    // --- GET by ID ---
    const getOne = await fetch(url + `/api/jobs/${jobId}`, {
      headers: { Cookie: cookie }
    });
    check("GET by ID returns the correct job", getOne.status === 200);
    const getOneData = await getOne.json();
    check("GET by ID returns correct title", getOneData.title === "Software Engineer");

    // --- GET non-existent job ---
    const getInvalid = await fetch(url + "/api/jobs/99999999", {
      headers: { Cookie: cookie }
    });
    check("GET non-existent job returns 404", getInvalid.status === 404);

    // --- Tags ---
    const tagsRes = await fetch(url + "/api/tags", {
      headers: { Cookie: cookie }
    });
    const tagsData = await tagsRes.json();
    const tagId = tagsData.tags?.[0]?.id;

    if (tagId) {
      const addTag = await fetch(url + `/api/jobs/${jobId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ tagId })
      });
      check("POST tag to job returns 201", addTag.status === 201);

      // duplicate tag
      const dupTag = await fetch(url + `/api/jobs/${jobId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ tagId })
      });
      check("POST duplicate tag returns 200", dupTag.status === 200);

      // GET tags
      const getTags = await fetch(url + `/api/jobs/${jobId}/tags`, {
        headers: { Cookie: cookie }
      });
      check("GET job tags returns 200", getTags.status === 200);
      const getTagsData = await getTags.json();
      check("GET job tags includes added tag", getTagsData.tags.some((t) => t.id === tagId));
    }

    // --- DELETE ---
    const deleteRes = await fetch(url + `/api/jobs/${jobId}`, {
      method: "DELETE",
      headers: { Cookie: cookie }
    });
    check("DELETE removes the job description", deleteRes.status === 200);

    // confirm deletion
    const getDeleted = await fetch(url + `/api/jobs/${jobId}`, {
      headers: { Cookie: cookie }
    });
    check("GET deleted job returns 404", getDeleted.status === 404);

    // --- DELETE non-existent ---
    const deleteInvalid = await fetch(url + "/api/jobs/99999999", {
      method: "DELETE",
      headers: { Cookie: cookie }
    });
    check("DELETE non-existent job returns 404", deleteInvalid.status === 404);

    if (failures === 0) {
      console.log("\nAll jobs API tests passed!");
    } else {
      throw new Error(`${failures} jobs API test(s) failed`);
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

await testJobsApi();