PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS people (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_people_group ON people(group_id);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  payer_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_expenses_group ON expenses(group_id);

CREATE TABLE IF NOT EXISTS splits (
  expense_id TEXT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  person_id TEXT NOT NULL,
  amount REAL NOT NULL,
  PRIMARY KEY (expense_id, person_id)
);
