import { auditNgo, auditSafeRef, jsonResponse, readJsonBody, requireNgoUser, requireSameOrigin } from "../../../_lib/ngo.js";

const statuses = new Set(["identified","preparing","documents_pending","ready_to_submit","submitted","approved","rejected","benefit_received","closed"]);
const clean = (v,n) => String(v ?? "").trim().replace(/\s+/g," ").slice(0,n);

export async function onRequestPatch(context) {
  const auth = await requireNgoUser(context, ["admin","editor"]);
  if (!auth.ok) return auth.response;
  if (!requireSameOrigin(context.request)) return jsonResponse({ error: "Cross-origin request rejected." },403);
  const id = String(context.params.id || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonResponse({ error: "Invalid application identifier." },400);
  const body = await readJsonBody(context.request,3000);
  if (!body.ok) return jsonResponse({ error: body.error },400);
  const v = body.value || {};
  const status = clean(v.status,30), internalReference = clean(v.internalReference,40), notes = clean(v.notes,500);
  if (!statuses.has(status) || (internalReference && !auditSafeRef(internalReference)) ||
      /\d{10,}|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(notes)) {
    return jsonResponse({ error: "Choose a valid status. Do not put personal identifiers in notes or references." },400);
  }
  const result = await context.env.NGO_DB.prepare(
    "UPDATE ngo_scheme_applications SET status = ?, internal_reference = ?, notes = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), updated_by = ? WHERE id = ? AND org_id = ?"
  ).bind(status,internalReference,notes,auth.user.email,id,auth.user.org_id).run();
  if (!result.meta?.changes) return jsonResponse({ error: "Scheme application record not found." },404);
  await auditNgo(context.env,auth.user,"scheme_application.updated","ngo_scheme_application",id);
  return jsonResponse({ saved: true });
}
