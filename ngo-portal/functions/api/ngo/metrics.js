import { auditNgo, jsonResponse, readJsonBody, requireNgoUser, validMetricValue } from "../../_lib/ngo.js";

const fieldMap = {
  farmersReached: "farmers_reached",
  counsellingSessions: "counselling_sessions",
  applicationsSubmitted: "applications_submitted",
  applicationsApproved: "applications_approved",
  benefitsReceived: "benefits_received",
  campsHeld: "camps_held",
  villagesReached: "villages_reached"
};

export async function onRequestPut(context) {
  const auth = await requireNgoUser(context, ["admin", "editor"]);
  if (!auth.ok) return auth.response;
  const { request, env } = context;
  const body = await readJsonBody(request);
  if (!body.ok) return jsonResponse({ error: body.error }, 400);
  const keys = Object.keys(body.value || {});
  if (!keys.length || keys.some((key) => !Object.prototype.hasOwnProperty.call(fieldMap, key))) {
    return jsonResponse({ error: "Only the seven aggregate project metrics are accepted." }, 400);
  }
  for (const key of keys) {
    if (!validMetricValue(body.value[key])) return jsonResponse({ error: "Metric values must be whole numbers between 0 and 10,000,000." }, 400);
  }
  const current = await env.NGO_DB.prepare(
    "SELECT farmers_reached, counselling_sessions, applications_submitted, applications_approved, benefits_received, camps_held, villages_reached FROM ngo_metrics WHERE org_id = ?"
  ).bind(auth.user.org_id).first();
  const existing = current || {
    farmers_reached: 0, counselling_sessions: 0, applications_submitted: 0,
    applications_approved: 0, benefits_received: 0, camps_held: 0, villages_reached: 0
  };
  const values = {
    farmers_reached: existing.farmers_reached,
    counselling_sessions: existing.counselling_sessions,
    applications_submitted: existing.applications_submitted,
    applications_approved: existing.applications_approved,
    benefits_received: existing.benefits_received,
    camps_held: existing.camps_held,
    villages_reached: existing.villages_reached
  };
  for (const [key, column] of Object.entries(fieldMap)) {
    if (Object.prototype.hasOwnProperty.call(body.value, key)) values[column] = body.value[key];
  }
  if (values.applicationsApproved > values.applicationsSubmitted) {
    return jsonResponse({ error: "Applications approved cannot exceed applications submitted." }, 400);
  }
  await env.NGO_DB.prepare(
    "INSERT INTO ngo_metrics (org_id, farmers_reached, counselling_sessions, applications_submitted, applications_approved, benefits_received, camps_held, villages_reached, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), ?) ON CONFLICT(org_id) DO UPDATE SET farmers_reached=excluded.farmers_reached, counselling_sessions=excluded.counselling_sessions, applications_submitted=excluded.applications_submitted, applications_approved=excluded.applications_approved, benefits_received=excluded.benefits_received, camps_held=excluded.camps_held, villages_reached=excluded.villages_reached, updated_at=excluded.updated_at, updated_by=excluded.updated_by"
  ).bind(
    auth.user.org_id, values.farmers_reached, values.counselling_sessions, values.applications_submitted,
    values.applications_approved, values.benefits_received, values.camps_held, values.villages_reached,
    auth.user.email
  ).run();
  await auditNgo(env, auth.user, "metrics.updated", "ngo_metrics");
  return jsonResponse({ saved: true, message: "Organisation metrics saved securely." });
}
