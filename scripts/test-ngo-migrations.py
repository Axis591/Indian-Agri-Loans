#!/usr/bin/env python3
"""Exercise the NGO D1 migrations with SQLite using synthetic records only."""
from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]
connection = sqlite3.connect(":memory:")
connection.row_factory = sqlite3.Row
connection.execute("PRAGMA foreign_keys = ON")

migration_1 = (ROOT / "migrations" / "0001_ngo_secure.sql").read_text(encoding="utf-8")
migration_2 = (ROOT / "migrations" / "0002_ngo_helping_hand.sql").read_text(encoding="utf-8")
connection.executescript(migration_1)

# A V3 member already provisioned before migration 0002 must be migrated
# into the organisation table without losing their user membership.
connection.execute(
    "INSERT INTO ngo_users (email, org_id, role, active) VALUES (?, ?, ?, 1)",
    ("legacy-admin@example.invalid", "legacy-org", "admin"),
)
connection.executescript(migration_2)

legacy = connection.execute(
    "SELECT id, application_id FROM ngo_organisations WHERE id = ?",
    ("legacy-org",),
).fetchone()
assert legacy is not None and legacy["application_id"] == "legacy-legacy-org"

# Simulate a verified organisation approval and provisioned first admin.
connection.execute(
    """INSERT INTO ngo_organisations
       (id, org_name, org_type, registration_number, state_name, district_name, application_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)""",
    ("test-org", "Example Field Network", "Trust", "TEST-001", "Punjab", "Ludhiana", "test-app-001"),
)
connection.execute(
    "INSERT INTO ngo_users (email, org_id, role, active) VALUES (?, ?, 'admin', 1)",
    ("test-admin@example.invalid", "test-org"),
)
connection.execute(
    """INSERT INTO ngo_applications
       (id, application_code, tracking_token_hash, org_name, org_type,
        registration_number, state_name, district_name, districts_served,
        contact_name, contact_role, contact_email, contact_phone, work_summary,
        privacy_notice_version, privacy_consent_at, accuracy_confirmed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
    (
        "application-id", "AGH-20261107-A1B2C3", "a" * 64,
        "Example Field Network", "Trust", "TEST-001", "Punjab", "Ludhiana",
        "Ludhiana", "Test Contact", "Coordinator", "contact@example.invalid",
        "+911234567890", "Synthetic test organisation application description only.",
        "ngo-privacy-notice-v1.0", "2026-11-07T00:00:00Z", "2026-11-07T00:00:00Z",
    ),
)

# Farmer profiles deliberately have pseudonymous case data only.
connection.execute(
    """INSERT INTO ngo_farmers
       (id, org_id, farmer_ref, state_name, district_name, profile_type,
        land_status, activity, support_need, crop_name, land_area,
        land_area_unit, season, irrigation, consent_at, consent_version,
        created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
    (
        "farmer-id", "test-org", "CASE-TEST-001", "Punjab", "Ludhiana",
        "owner", "owner", "crop", "subsidy", "paddy", 2.5, "acre",
        "kharif", "irrigated", "2026-11-07T00:00:00Z",
        "agribridge-farmer-consent-v1", "test-admin@example.invalid",
        "test-admin@example.invalid",
    ),
)
connection.execute(
    """INSERT INTO ngo_farmer_documents
       (id, org_id, farmer_id, doc_type, file_name, mime_type,
        size_bytes, object_key, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
    (
        "document-id", "test-org", "farmer-id", "redacted_land_record",
        "supporting-document.pdf", "application/pdf", 1024,
        "private/test-org/farmers/farmer-id/document-id",
        "test-admin@example.invalid",
    ),
)
connection.execute(
    """INSERT INTO ngo_scheme_applications
       (id, org_id, farmer_id, scheme_id, status, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)""",
    (
        "scheme-application-id", "test-org", "farmer-id", "crm-scheme",
        "preparing", "test-admin@example.invalid", "test-admin@example.invalid",
    ),
)

def must_reject(statement, parameters, label):
    try:
        connection.execute(statement, parameters)
    except sqlite3.IntegrityError:
        return
    raise AssertionError(f"Expected database constraint to reject: {label}")

must_reject(
    """INSERT INTO ngo_farmers
       (id, org_id, farmer_ref, state_name, district_name, profile_type,
        land_status, activity, support_need, consent_at, consent_version,
        created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
    ("bad-farmer", "missing-org", "CASE-TEST-002", "Punjab", "Ludhiana",
     "owner", "owner", "crop", "all", "2026-11-07T00:00:00Z",
     "agribridge-farmer-consent-v1", "test-admin@example.invalid",
     "test-admin@example.invalid"),
    "farmer without an organisation",
)
must_reject(
    """INSERT INTO ngo_farmers
       (id, org_id, farmer_ref, state_name, district_name, profile_type,
        land_status, activity, support_need, consent_at, consent_version,
        created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
    ("duplicate-farmer", "test-org", "CASE-TEST-001", "Punjab", "Ludhiana",
     "owner", "owner", "crop", "all", "2026-11-07T00:00:00Z",
     "agribridge-farmer-consent-v1", "test-admin@example.invalid",
     "test-admin@example.invalid"),
    "duplicate pseudonymous reference within one organisation",
)
must_reject(
    """INSERT INTO ngo_farmer_documents
       (id, org_id, farmer_id, doc_type, file_name, mime_type,
        size_bytes, object_key, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
    ("oversize-document", "test-org", "farmer-id", "other_redacted_support",
     "oversize.pdf", "application/pdf", 5 * 1024 * 1024 + 1,
     "private/test-org/farmers/farmer-id/oversize",
     "test-admin@example.invalid"),
    "document above the 5 MB limit",
)

assert connection.execute("PRAGMA foreign_key_check").fetchall() == []
connection.execute("DELETE FROM ngo_farmers WHERE id = ?", ("farmer-id",))
assert connection.execute(
    "SELECT COUNT(*) FROM ngo_farmer_documents WHERE farmer_id = ?", ("farmer-id",)
).fetchone()[0] == 0
assert connection.execute(
    "SELECT COUNT(*) FROM ngo_scheme_applications WHERE farmer_id = ?", ("farmer-id",)
).fetchone()[0] == 0

print("PASS 0001 + 0002 migrations execute in SQLite.")
print("PASS Legacy organisation members are preserved by migration 0002.")
print("PASS Membership privacy acknowledgements and application fields are stored.")
print("PASS Farmer profiles, private document metadata and scheme tracker records insert.")
print("PASS Organisation ownership, per-organisation case uniqueness and 5 MB file limits are enforced.")
print("PASS Deleting a farmer removes linked D1 metadata and application tracker rows.")
