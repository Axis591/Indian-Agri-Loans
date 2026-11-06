import { jsonResponse, readJsonBody, sha256Hex } from "../_lib/ngo.js";

export async function onRequestPost({ request, env }) {
  if (!env.NGO_DB) return jsonResponse({ error: "The secure application database is not configured." }, 503);
  const body = await readJsonBody(request, 3000);
  if (!body.ok) return jsonResponse({ error: body.error }, 400);
  const code = String(body.value?.applicationCode || "").trim().toUpperCase();
  const token = String(body.value?.trackingToken || "").trim();
  if (!/^AGH-[0-9]{8}-[A-F0-9]{6}$/.test(code) || !/^[a-f0-9]{64}$/.test(token)) {
    return jsonResponse({ error: "Enter the application code and the private tracking token." }, 400);
  }
  const hash = await sha256Hex(token);
  const row = await env.NGO_DB.prepare(
    "SELECT application_code, org_name, status, review_note, created_at, reviewed_at FROM ngo_applications WHERE application_code = ? AND tracking_token_hash = ? LIMIT 1"
  ).bind(code, hash).first();
  if (!row) return jsonResponse({ error: "The application code or private token is incorrect." }, 404);
  return jsonResponse({
    applicationCode: row.application_code,
    organisation: row.org_name,
    status: row.status,
    reviewNote: row.review_note,
    submittedAt: row.created_at,
    reviewedAt: row.reviewed_at
  });
}
