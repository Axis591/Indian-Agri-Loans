-- AgriBridge V3 secure NGO workspace.
-- Store only aggregate programme metrics and non-identifying internal reference codes.
-- Never add farmer names, phone numbers, Aadhaar, bank account numbers or document blobs here.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS ngo_users (
  email TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_ngo_users_org ON ngo_users(org_id, active);

CREATE TABLE IF NOT EXISTS ngo_metrics (
  org_id TEXT PRIMARY KEY,
  farmers_reached INTEGER NOT NULL DEFAULT 0 CHECK (farmers_reached BETWEEN 0 AND 10000000),
  counselling_sessions INTEGER NOT NULL DEFAULT 0 CHECK (counselling_sessions BETWEEN 0 AND 10000000),
  applications_submitted INTEGER NOT NULL DEFAULT 0 CHECK (applications_submitted BETWEEN 0 AND 10000000),
  applications_approved INTEGER NOT NULL DEFAULT 0 CHECK (applications_approved BETWEEN 0 AND 10000000),
  benefits_received INTEGER NOT NULL DEFAULT 0 CHECK (benefits_received BETWEEN 0 AND 10000000),
  camps_held INTEGER NOT NULL DEFAULT 0 CHECK (camps_held BETWEEN 0 AND 10000000),
  villages_reached INTEGER NOT NULL DEFAULT 0 CHECK (villages_reached BETWEEN 0 AND 10000000),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_by TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ngo_followups (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  ref_code TEXT NOT NULL CHECK (length(ref_code) BETWEEN 3 AND 40),
  state_name TEXT NOT NULL CHECK (length(state_name) BETWEEN 2 AND 80),
  district_name TEXT NOT NULL CHECK (length(district_name) BETWEEN 2 AND 80),
  support_route TEXT NOT NULL CHECK (length(support_route) BETWEEN 2 AND 60),
  case_status TEXT NOT NULL CHECK (length(case_status) BETWEEN 2 AND 40),
  event_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  created_by TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_by TEXT NOT NULL,
  UNIQUE (org_id, ref_code)
);

CREATE INDEX IF NOT EXISTS idx_ngo_followups_org_date
ON ngo_followups(org_id, event_date DESC);

CREATE TABLE IF NOT EXISTS ngo_audit (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  actor_email TEXT NOT NULL,
  event_type TEXT NOT NULL,
  record_type TEXT NOT NULL,
  record_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_ngo_audit_org_date
ON ngo_audit(org_id, created_at DESC);
