-- This table is where we gonna store user information 
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users
ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
CHECK (role IN ('user', 'admin'));

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

CREATE TABLE IF NOT EXISTS job_descriptions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_job_descriptions_user_id ON job_descriptions(user_id);

CREATE TABLE IF NOT EXISTS job_description_tags (
  job_id INT NOT NULL REFERENCES job_descriptions(id) ON DELETE CASCADE,
  tag_id INT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (job_id, tag_id)
);
-- one prep plan per job description, built by the tag-matching algorithm (lib/matching.js)
CREATE TABLE IF NOT EXISTS prep_plans (
  id SERIAL PRIMARY KEY,
  job_id INT NOT NULL UNIQUE REFERENCES job_descriptions(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  size INT NOT NULL CHECK (size BETWEEN 1 AND 100),
  behavioral_share NUMERIC(3, 2) NOT NULL CHECK (behavioral_share BETWEEN 0 AND 1),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_prep_plans_user_id ON prep_plans(user_id);

-- the ordered questions in a prep plan
CREATE TABLE IF NOT EXISTS prep_plan_items (
  id SERIAL PRIMARY KEY,
  plan_id INT NOT NULL REFERENCES prep_plans(id) ON DELETE CASCADE,
  question_id INT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  position INT NOT NULL,
  category VARCHAR(20) NOT NULL CHECK (category IN ('technical', 'behavioral')),
  score INT NOT NULL DEFAULT 0,
  matched_tags TEXT[] NOT NULL DEFAULT '{}',
  UNIQUE (plan_id, position),
  UNIQUE (plan_id, question_id)
);
