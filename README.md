# CEN3031_Group_Project
Experiential learning service development

## Local Setup
### prerequisites
- node.js
- PostgreSQL

### install dependencies
```
npm install
```
### Create .env file in the project root with your host port
in `.env`:
```
PORT=your_host_port
```
## Database Setup

### Create Database
in psql:
```
CREATE DATABASE techprep;
```

### Configure environment variables in .env
replace [args] with your own configuration
```
DB_HOST=[localhost]
DB_PORT=[5432]
DB_USER=[postgres]
DB_NAME=techprep
DB_PASSWORD=[password]
```

### Initialize tables and load data
```
psql -U postgres -d techprep -f db/schema.sql
psql -U postgres -d techprep -f db/seed.sql
```


### Import Interview Questions

After setting up the database and running the SQL files, run:

```bash
node db/import-questions.js
```

This imports 110 interview questions into the database, including their answers, explanations, difficulty levels, and tags.

The script also connects questions to their tags. Running it again will not create duplicate questions.

### Question Data Source

The interview questions come from CodePrep Questions (https://github.com/codeprepdev/codeprep-questions), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).

The original question content is preserved and imported into our PostgreSQL database with its tags.

### Database Tables

- `users` - Stores user accounts.
- `questions` - Stores interview questions and answers.
- `tags` - Stores technologies and question topics.
- `question_tags` - Connects questions with their tags.
- `prep_plans` - One prep plan per job description.
- `prep_plan_items` - The ordered questions in each prep plan.

## Auth Routes
`path` represents the base url being hosted by the server

User session is stored in a cookie. if using curl, make sure to pass -c [path] on the first authenticaiton request to store the cookie into a file, and -b [path] to load from the file for subsequent requests.

### register
`path/api/register`

- creates a user using an email and password
- also logs in
- generates a cookie to represent the user session


Content-Type:
applicaiton/json

data:
{email: "", password: ""}

### login
`path/api/login`

- accepts email and username to log in
- generates a token to represent the user session

Content-Type:
applicaiton/json

data:
{email: "", password: ""}

### me
`path/api/me`

- requires a user session cookie
- returns user data

### logout
`path/api/logout`

- requires a user session cookie
- depreciates the session cookie

## Questions Routes

### list questions
`GET path/api/questions`

- requires a user session cookie
- returns questions with their tags, plus pagination info
- every filter given is combined with AND

Query parameters (all optional):

| Parameter | Example | Notes |
| --- | --- | --- |
| `type` | `MCQ_SINGLE` | question format: MCQ_SINGLE, MCQ_MULTI, SHORT_ANSWER, FLASHCARD, TRUE_FALSE, FIND_THE_BUG, CODE_OUTPUT |
| `difficulty` | `medium` | one of intro, easy, medium, hard, expert |
| `tag` | `React,rules-of-hooks` | comma separated; a question must have every tag listed |
| `search` | `promise` | case-insensitive match on the question text |
| `page` | `2` | defaults to 1 |
| `limit` | `20` | defaults to 20, max 100 |

Example: `path/api/questions?difficulty=medium&tag=JavaScript&page=1`

Response:
```
{
  "questions": [
    { "id": 1, "question_text": "...", "difficulty": "easy", "question_type": "FIND_THE_BUG", "tags": ["array-methods", "JavaScript"] }
  ],
  "total": 110,
  "page": 1,
  "limit": 20,
  "totalPages": 6
}
```

Invalid parameters return 400 with `{ "error": "..." }`.

Run the test suite with `npm test` (uses the database from your `.env`).
A separate server process is needed for tests regarding server behavior.

## Prep Plan Matching

`lib/matching.js` picks the questions to practice for a job posting. It is a pure function with no database access, and the same input always gives the same plan.

```js
import pool from "./db.js";
import { buildPrepPlan, loadQuestionsForMatching } from "./lib/matching.js";

const questions = await loadQuestionsForMatching(pool);
const { items, summary } = buildPrepPlan(["React", "JavaScript", "teamwork"], questions, {
    size: 15,              // questions in the plan (1-100), default 15
    behavioralShare: 0.3   // share of behavioral questions (0-1), default 0.3
});
// items:   [{ position, questionId, category, difficulty, score, matchedTags }]
// summary: { requestedSize, size, postingTags, technical, behavioral, unmatchedBehavioral, uncoveredTags }
```

### Scoring rules

1. Tags are compared case-insensitively.
2. A question's **score** is how many of its tags are also posting tags. Score 0 means unmatched.
3. Ranking: higher score first, then higher **focus** (score divided by the question's tag count), then lower question id.
4. Questions with type `BEHAVIORAL` are behavioral; every other type is technical. By default 30% of the plan is behavioral.
5. Each category is spread over difficulty: 30% easier (intro/easy), 40% medium, 30% harder (hard/expert). If a level runs out, the best questions from other levels fill its slots.
6. **Coverage:** questions are picked one at a time, taking turns between difficulty levels. Each matched tag is worth `1 / (1 + times that tag is already in the plan)`, so every posting tag gets a turn before one tag fills the plan. Ties fall back to the ranking in rule 3.
7. Technical slots only use matched questions. Behavioral slots use matched questions first, then unmatched ones, since every interview has a behavioral round.
8. Not enough behavioral questions: technical questions take the spare slots. Not enough technical questions: extra matched behavioral questions take them; otherwise the plan is shorter than requested. A posting with no tags gets an empty plan.
9. The plan lists technical questions, then behavioral, each from easier to harder.

The unit tests need no database: `node --test tests/test-matching.js`.

## Tags Routes

All tag routes require a logged-in user session. Creating and deleting tags require an admin role.

| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/api/tags` | Logged-in user | Returns all tags |
| `POST` | `/api/tags` | Admin | Creates a tag |
| `DELETE` | `/api/tags/:id` | Admin | Deletes a tag |
| `POST` | `/api/questions/:questionId/tags` | Admin | Assigns an existing tag to a question |

## Jobs Routes

All job routes require a logged-in user session. Users can only access their own job descriptions.

| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/api/jobs` | Logged-in user | Returns all job descriptions for the authenticated user |
| `POST` | `/api/jobs` | Logged-in user | Creates a new job description |
| `GET` | `/api/jobs/:jobId` | Logged-in user | Returns a specific job description |
| `DELETE` | `/api/jobs/:jobId` | Logged-in user | Deletes a job description |
| `GET` | `/api/jobs/:jobId/tags` | Logged-in user | Returns all tags for a job description |
| `POST` | `/api/jobs/:jobId/tags` | Logged-in user | Assigns an existing tag to a job description |
| `DELETE` | `/api/jobs/:jobId/tags/:tagId` | Logged-in user | Removes a tag from a job description |

### Create a job description

`POST /api/jobs`

Content-Type: application/json

data:
`{ "title": "", "company": "", "content": "" }`

- `title` and `content` are required
- `company` is optional

Response (201):
```
{
  "message": "Job description created",
  "job": { "id": 1, "title": "...", "company": "...", "content": "...", "created_at": "..." }
}
```

## Prep Plan Routes

A job description has at most one prep plan, built from its tags by the matching rules above. Users can only access plans for their own job descriptions; anyone else gets 404.

| Method | Path | Access | Description |
|---|---|---|---|
| `POST` | `/api/jobs/:jobId/plan` | Logged-in user | Generates the plan (201), or regenerates it if one exists (200) |
| `GET` | `/api/jobs/:jobId/plan` | Logged-in user | Returns the stored plan with question details |

### Generate or regenerate a plan

`POST /api/jobs/:jobId/plan`

Optional body: `{ "size": 15, "behavioralShare": 0.3 }`

- `size` is 1-100, `behavioralShare` is 0-1. Values not given keep the plan's saved values (or the defaults, 15 and 0.3, the first time).
- The job description needs at least one tag, otherwise 400.
- Regenerating replaces the plan's items. The same tags and question bank always give the same plan, so regenerate after changing the job's tags or when new questions are added.

### Response (`GET`, and `plan` in the `POST` response)

```
{
  "plan": {
    "id": 1, "jobId": 4, "size": 15, "behavioralShare": 0.3,
    "createdAt": "...", "updatedAt": "...",
    "summary": { "total": 15, "technical": 10, "behavioral": 5, "uncoveredTags": [] },
    "items": [
      {
        "id": 1, "position": 1, "category": "technical", "score": 1, "matchedTags": ["react"],
        "question": { "id": 12, "question_text": "...", "answer_text": "...", "answer_data": {}, "explanation": "...",
                      "difficulty": "easy", "question_type": "SHORT_ANSWER", "tags": ["React", "lifting-state"] }
      }
    ]
  }
}
```

Items are ordered technical first, then behavioral, each from easier to harder. `uncoveredTags` lists job tags no question in the plan covers.

Run the tests with the server running: `node tests/test-plans.js`.


### Get all tags

```http
GET /api/tags

## Frontend Setup

The React app lives in `client/` (Vite + React + react-router).

```
cd client
npm install
npm run dev
```

The app runs at http://localhost:5173. In dev, Vite proxies `/api` requests to the Express server on http://localhost:3000, so start the backend (`node server.js`) in another terminal to see live data.

Copy `client/.env.example` to `client/.env` if you need to point the app at a different API. Leave `VITE_API_URL` blank for local development.

### Routes

- `/` and `/dashboard` - Dashboard
- `/login` - Login
- `/questions` - Question bank
- `/jobs` - Job postings
- `/plan` - Prep plan
- `/admin` - Admin

API calls go through `client/src/api/client.js` (`get`, `post`, `put`, `del`).