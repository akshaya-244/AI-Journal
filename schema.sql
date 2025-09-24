DROP TABLE IF EXISTS Users;
CREATE TABLE IF NOT EXISTS Users (user_id INTEGER PRIMARY KEY, entry_text TEXT, timestamp NUMBER, embedding vector TEXT);
