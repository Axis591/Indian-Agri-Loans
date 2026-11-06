import { auditNgo, jsonResponse, requireNgoUser } from "../../_lib/ngo.js";

const emptyMetrics = {
  farmersReached: 0,
  counsellingSessions: 0,
  applicationsSubmitted: 0,
  applicationsApproved: 0,
  benefitsReceived: 0,
  campsHeld: 0,
  villagesReached: 0
};

export async function onRequestGet(context) {
  const auth = await requireNgoUser(context, ["admin", "editor", "viewer"]);
  if (!auth.ok) return auth.response;
  const { user } = auth;
  const { env } = context;

  const metricRow = await env.NGO_DB.prepare(
    "SELECT farmers_reached, counselling_sessions, applications_submitted, applications_approved, benefits_received, camps_held, villages_reached, updated_at FROM ngo_metrics WHERE org_id = ?"
  ).bind(user.org_id).first();

  const rows = await env.NGO_DB.prepare(
    "SELECT id, ref_code, state_name, district_name, support_route, case_status, event_date, created_at FROM ngo_followups WHERE org_id = ? ORDER BY event_date DESC, created_at DESC LIMIT 300"
  ).bind(user.org_id).all();

  const metrics = metricRow ? {
    farmersReached: metricRow.farmers_reached,
    counsellingSessions: metricRow.counselling_sessions,
    applicationsSubmitted: metricRow.applications_submitted,
    applicationsApproved: metricRow.applications_approved,
    benefitsReceived: metricRow.benefits_received,
    campsHeld: metricRow.camps_held,
    villagesReached: metricRow.villages_reached,
    updatedAt: metricRow.updated_at
  } : emptyMetrics;

  const organisation = await env.NGO_DB.prepare("SELECT org_name FROM ngo_organisations WHERE id = ? LIMIT 1").bind(user.org_id).first();

  return jsonResponse({
    organisation: organisation?.org_name || user.org_id,
    role: user.role,
    metrics,
    followups: (rows.results || []).map((row) => ({
      id: row.id,
      ref: row.ref_code,
      state: row.state_name,
      district: row.district_name,
      support: row.support_route,
      status: row.case_status,
      date: row.event_date,
      createdAt: row.created_at
    }))
  });
}
