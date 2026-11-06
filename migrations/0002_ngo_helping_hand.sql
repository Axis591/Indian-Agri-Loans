-- AgriBridge NGO Helping Hand: applications, pseudonymous farmer profiles,
-- private supporting documents and manual scheme-application tracking.
-- Apply only after 0001_ngo_secure.sql. Do not use this migration for Aadhaar,
-- PAN, bank statements, phone numbers or unredacted identity documents.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS ngo_organisations (
  id TEXT PRIMARY KEY,
  org_name TEXT NOT NULL,
  org_type TEXT NOT NULL,
  registration_number TEXT NOT NULL DEFAULT 'Not provided',
  state_name TEXT NOT NULL,
  district_name TEXT NOT NULL,
  application_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  joined_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Preserve compatibility with already-provisioned V3 NGO users.
INSERT OR IGNORE INTO ngo_organisations (id, org_name, org_type, registration_number, state_name, district_name, application_id)
SELECT org_id, org_id, 'Other', 'Not provided', 'Not specified', 'Not specified', 'legacy-' || org_id
FROM ngo_users WHERE org_id IS NOT NULL AND length(trim(org_id)) > 0
GROUP BY org_id;

CREATE TABLE IF NOT EXISTS ngo_applications (
  id TEXT PRIMARY KEY,
  application_code TEXT NOT NULL UNIQUE,
  tracking_token_hash TEXT NOT NULL,
  org_name TEXT NOT NULL,
  org_type TEXT NOT NULL,
  registration_number TEXT NOT NULL,
  registration_year INTEGER,
  state_name TEXT NOT NULL,
  district_name TEXT NOT NULL,
  districts_served TEXT NOT NULL,
  website TEXT NOT NULL DEFAULT '',
  contact_name TEXT NOT NULL,
  contact_role TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  work_summary TEXT NOT NULL,
  privacy_notice_version TEXT NOT NULL,
  privacy_consent_at TEXT NOT NULL,
  accuracy_confirmed_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','needs_info','approved','rejected')),
  review_note TEXT NOT NULL DEFAULT '',
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_ngo_applications_status_date ON ngo_applications(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ngo_applications_email ON ngo_applications(contact_email);

CREATE TABLE IF NOT EXISTS ngo_join_rate_limits (
  ip_hash TEXT PRIMARY KEY,
  window_start TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0)
);

CREATE TABLE IF NOT EXISTS ngo_farmers (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  farmer_ref TEXT NOT NULL CHECK (length(farmer_ref) BETWEEN 3 AND 40),
  state_name TEXT NOT NULL,
  district_name TEXT NOT NULL,
  profile_type TEXT NOT NULL,
  land_status TEXT NOT NULL,
  activity TEXT NOT NULL,
  support_need TEXT NOT NULL,
  crop_name TEXT NOT NULL DEFAULT '',
  land_area REAL,
  land_area_unit TEXT NOT NULL DEFAULT 'acre',
  season TEXT NOT NULL DEFAULT 'unknown',
  irrigation TEXT NOT NULL DEFAULT 'unknown',
  consent_at TEXT NOT NULL,
  consent_version TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  created_by TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_by TEXT NOT NULL,
  UNIQUE (org_id, farmer_ref),
  FOREIGN KEY (org_id) REFERENCES ngo_organisations(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_ngo_farmers_org_date ON ngo_farmers(org_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ngo_farmer_documents (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  farmer_id TEXT NOT NULL,
  doc_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes BETWEEN 1 AND 5242880),
  object_key TEXT NOT NULL UNIQUE,
  review_status TEXT NOT NULL DEFAULT 'pending_review' CHECK (review_status IN ('pending_review','reviewed','rejected')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  uploaded_by TEXT NOT NULL,
  FOREIGN KEY (org_id) REFERENCES ngo_organisations(id) ON DELETE CASCADE,
  FOREIGN KEY (farmer_id) REFERENCES ngo_farmers(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_ngo_farmer_documents_org_farmer ON ngo_farmer_documents(org_id, farmer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ngo_scheme_applications (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  farmer_id TEXT NOT NULL,
  scheme_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'preparing' CHECK (status IN ('identified','preparing','documents_pending','ready_to_submit','submitted','approved','rejected','benefit_received','closed')),
  internal_reference TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  created_by TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_by TEXT NOT NULL,
  FOREIGN KEY (org_id) REFERENCES ngo_organisations(id) ON DELETE CASCADE,
  FOREIGN KEY (farmer_id) REFERENCES ngo_farmers(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_ngo_scheme_apps_org_date ON ngo_scheme_applications(org_id, updated_at DESC);
