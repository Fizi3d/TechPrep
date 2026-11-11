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

Run the tests with `node tests/test-questions-api.js` (uses the database from your .env).

## Tags Routes

All tag routes require a logged-in user session. Creating and deleting tags require an admin role.

| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/api/tags` | Logged-in user | Returns all tags |
| `POST` | `/api/tags` | Admin | Creates a tag |
| `DELETE` | `/api/tags/:id` | Admin | Deletes a tag |
| `POST` | `/api/questions/:questionId/tags` | Admin | Assigns an existing tag to a question |

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


