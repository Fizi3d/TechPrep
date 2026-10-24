-- This table is where we gonna store user information 
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- here we store interview questions from different sources
CREATE TABLE IF NOT EXISTS questions (
    id SERIAL PRIMARY KEY,
    question_text TEXT NOT NULL,
    answer_text TEXT,
    answer_data JSONB,
    explanation TEXT,
    difficulty VARCHAR(20),
    question_type VARCHAR(30),
    source_company VARCHAR(100),
    source_name VARCHAR(100),
    source_url TEXT,
    source_question_id VARCHAR(100),
    UNIQUE (source_name, source_question_id)
);

--this is the different topics for each question 
CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

-- this connect interview questions with their tags
CREATE TABLE IF NOT EXISTS question_tags (
    question_id INTEGER REFERENCES questions(id),
    tag_id INTEGER REFERENCES tags(id),
    PRIMARY KEY (question_id, tag_id)
);
