-- Every contact form request is kept here as a backup, even if the notification email fails.
CREATE TABLE IF NOT EXISTS submissions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  name          TEXT    NOT NULL,
  email         TEXT    NOT NULL,
  phone         TEXT,
  business_name TEXT,
  message       TEXT    NOT NULL,
  email_status  TEXT    NOT NULL DEFAULT 'pending' -- pending | sent | failed | skipped
);

CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions (created_at);
