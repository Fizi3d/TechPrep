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