
-- Here we add tags from CodePrep repostory 
INSERT INTO tags (name)
VALUES
    ('JavaScript'),
    ('TypeScript'),
    ('React'),
    ('Web Platform'),
    ('CSS'),
    ('Node.js'),
    ('HTTP & APIs'),
    ('Databases & SQL'),
    ('System Design'),
    ('AI Engineering'),
    ('Python')
ON CONFLICT (name) DO NOTHING;
