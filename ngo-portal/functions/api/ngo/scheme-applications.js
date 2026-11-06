import { auditNgo, auditSafeRef, jsonResponse, readJsonBody, requireNgoUser, requireSameOrigin } from "../../_lib/ngo.js";

const statuses = new Set(["identified","preparing","documents_pending","ready_to_submit","submitted","approved","rejected","benefit_received","closed"]);
const clean = (v,n) => String(v ?? "").trim().replace(/\s+/g," ").slice(0,n);

export async function onRequestGet(context) {
  const auth = await requireNgoUser(context);
  if (!auth.ok) return auth.response;
  const rows = await context.env.NGO_DB.prepare(
    "SELECT a.id, a.farmer_id, f.farmer_ref, f.state_name, f.district_name, a.scheme_id, a.status, a.internal_reference, a.notes, a.created_at, a.updated_at FROM ngo_scheme_applications a JOIN ngo_farmers f ON f.id = a.farmer_id AND f.org_id = a.org_id WHERE a.org_id = ? ORDER BY a.updated_at DESC LIMIT 500"
  ).bind(auth.user.org_id).all();
  return jsonResponse({ applications: rows.results || [] });
}

export async function onRequestPost(context) {
  const auth = await requireNgoUser(context, ["admin","editor"]);
  if (!auth.ok) return auth.response;
  if (!requireSameOrigin(context.request)) return jsonResponse({ error: "Cross-origin request rejected." }, 403);
  const body = await readJsonBody(context.request,5000);
  if (!body.ok) return jsonResponse({ error: body.error },400);
  const v = body.value || {};
  const farmerId = String(v.farmerId || "");
  const schemeId = clean(v.schemeId,100);
  const status = clean(v.status || "preparing",30);
  const internalReference = clean(v.internalReference,40);
  const notes = clean(v.notes,500);
  if (!/^[0-9a-f-]{36}$/i.test(farmerId) || !/^[a-z0-9][a-z0-9-]{1,99}$/.test(schemeId) || !statuses.has(status) ||
      (internalReference && !auditSafeRef(internalReference)) ||
      /(aadhaar|uid|pan|phone|mobile|bank|account|ifsc|passport|voter|address|\d(?:[\s-]?\d){9,}|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i.test(notes)) {
    return jsonResponse({ error: "Check the farmer, scheme and status fields. Notes and references must not contain personal identifiers." },400);
  }
  const farmer = await context.env.NGO_DB.prepare("SELECT id FROM ngo_farmers WHERE id = ? AND org_id = ? LIMIT 1").bind(farmerId,auth.user.org_id).first();
  if (!farmer) return jsonResponse({ error: "Farmer profile not found in this organisation." },404);
  const id = crypto.randomUUID();
  await context.env.NGO_DB.prepare(
    "INSERT INTO ngo_scheme_applications (id, org_id, farmer_id, scheme_id, status, internal_reference, notes, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(id,auth.user.org_id,farmerId,schemeId,status,internalReference,notes,auth.user.email,auth.user.email).run();
  await auditNgo(context.env,auth.user,"scheme_application.created","ngo_scheme_application",id);
  return jsonResponse({ saved: true, id },201);
}
