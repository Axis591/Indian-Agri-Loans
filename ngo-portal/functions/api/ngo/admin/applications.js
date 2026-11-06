import { jsonResponse, requirePlatformAdmin } from "../../../_lib/ngo.js";

export async function onRequestGet(context) {
  const auth = await requirePlatformAdmin(context);
  if (!auth.ok) return auth.response;
  const rows = await context.env.NGO_DB.prepare(
    "SELECT id, application_code, org_name, org_type, registration_number, registration_year, state_name, district_name, districts_served, website, contact_name, contact_role, contact_email, contact_phone, work_summary, status, review_note, created_at FROM ngo_applications WHERE status IN ('pending','needs_info') ORDER BY created_at ASC LIMIT 100"
  ).all();
  return jsonResponse({ applications: rows.results || [] });
}
