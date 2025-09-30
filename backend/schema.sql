DROP TABLE IF EXISTS journal_entries;
DROP TABLE IF EXISTS users;

-- Create Users table
CREATE TABLE users (
    id TEXT PRIMARY KEY,           -- Google user ID (sub field)
    email TEXT NOT NULL UNIQUE,    -- Google email
    name TEXT NOT NULL,            -- Google display name
    picture TEXT,                  -- Google profile picture URL
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create Journal Entries table
CREATE TABLE journal_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,         -- References users.id
    entry_text TEXT NOT NULL,      -- The journal content                  
    timestamp DATETIME NOT NULL,   -- When the entry was created
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_journal_entries_user_id ON journal_entries(user_id);
CREATE INDEX idx_journal_entries_timestamp ON journal_entries(timestamp);
CREATE INDEX idx_users_email ON users(email);