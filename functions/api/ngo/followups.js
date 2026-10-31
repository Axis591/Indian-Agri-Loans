import { auditNgo, auditSafeRef, jsonResponse, readJsonBody, requireNgoUser } from "../../_lib/ngo.js";

const supportOptions = new Set([
  "PM-KISAN",
  "KCC / crop credit",
  "PMFBY / crop insurance",
  "State subsidy / grant",
  "SHG / FPO finance",
  "Machinery / irrigation",
  "Other local support"
]);
const statusOptions = new Set([
  "Identified",
  "Documents pending",
  "Ready to apply",
  "Submitted",
  "Approved",
  "Rejected / closed",
  "Benefit received"
]);

export async function onRequestPost(context) {
  const auth = await requireNgoUser(context, ["admin", "editor"]);
  if (!auth.ok) return auth.response;
  const body = await readJsonBody(context.request);
  if (!body.ok) return jsonResponse({ error: body.error }, 400);
  const value = body.value || {};
  const allowed = new Set(["ref", "state", "district", "support", "status"]);
  if (Object.keys(value).some((key) => !allowed.has(key))) {
    return jsonResponse({ error: "Only an internal reference, State, District, support category and status are accepted. Personal data is prohibited." }, 400);
  }
  const ref = String(value.ref || "").trim();
  const state = String(value.state || "").trim();
  const district = String(value.district || "").trim();
  const support = String(value.support || "").trim();
  const status = String(value.status || "").trim();
  if (!auditSafeRef(ref)) return jsonResponse({ error: "Use an internal reference code (3–40 letters, numbers, hyphens or underscores)." }, 400);
  if (state.length < 2 || state.length > 80 || district.length < 2 || district.length > 80) return jsonResponse({ error: "State and district are required (2–80 characters)." }, 400);
  if (!supportOptions.has(support) || !statusOptions.has(status)) return jsonResponse({ error: "Choose a support route and status from the approved list." }, 400);
  const id = crypto.randomUUID();
  const date = new Date().toISOString().slice(0, 10);
  try {
    await context.env.NGO_DB.prepare(
      "INSERT INTO ngo_followups (id, org_id, ref_code, state_name, district_name, support_route, case_status, event_date, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(id, auth.user.org_id, ref, state, district, support, status, date, auth.user.email, auth.user.email).run();
  } catch (error) {
    return jsonResponse({ error: "That reference may already exist in your organisation, or the record could not be saved." }, 409);
  }
  await auditNgo(context.env, auth.user, "followup.created", "ngo_followup", id);
  return jsonResponse({ saved: true, id, date }, 201);
}
