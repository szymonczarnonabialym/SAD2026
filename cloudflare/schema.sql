CREATE TABLE IF NOT EXISTS farms (
  owner TEXT PRIMARY KEY NOT NULL,
  data TEXT NOT NULL,
  revision INTEGER DEFAULT 0 NOT NULL
);
CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash TEXT PRIMARY KEY NOT NULL,
  owner TEXT NOT NULL,
  expires INTEGER NOT NULL,
  password_version TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS auth_login_attempts (
  bucket TEXT PRIMARY KEY NOT NULL,
  attempts INTEGER NOT NULL,
  expires INTEGER NOT NULL
);
-- Farm register, one row per entry. The application also creates these tables on first use and copies
-- an owner's former single-row `farms` blob into them; `farms` stays as a backup.
CREATE TABLE IF NOT EXISTS farm_state (
  owner TEXT PRIMARY KEY NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0,
  token TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS farm_records (
  owner TEXT NOT NULL,
  id TEXT NOT NULL,
  kind TEXT NOT NULL,
  date TEXT NOT NULL,
  version INTEGER NOT NULL,
  data TEXT NOT NULL,
  PRIMARY KEY (owner, id)
);
CREATE TABLE IF NOT EXISTS farm_requests (
  owner TEXT NOT NULL,
  request_id TEXT NOT NULL,
  applied_at INTEGER NOT NULL,
  PRIMARY KEY (owner, request_id)
);
