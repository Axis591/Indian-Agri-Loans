import { jsonResponse, readJsonBody, requirePlatformAdmin, requireSameOrigin } from "../../../_lib/ngo.js";

const slugify = value => String(value || "ngo").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 36) || "ngo";

export async function onRequestPatch(context) {
  const auth = await requirePlatformAdmin(context);
  if (!auth.ok) return auth.response;
  if (!requireSameOrigin(context.request)) return jsonResponse({ error: "Cross-origin request rejected." }, 403);
  const id = String(context.params.id || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonResponse({ error: "Invalid application identifier." }, 400);
  const body = await readJsonBody(context.request, 3000);
  if (!body.ok) return jsonResponse({ error: body.error }, 400);
  const status = String(body.value?.status || "");
  const reviewNote = String(body.value?.reviewNote || "").trim().slice(0, 1000);
  if (!["approved","rejected","needs_info"].includes(status)) return jsonResponse({ error: "Choose approve, reject or request more information." }, 400);
  const db = context.env.NGO_DB;
  const application = await db.prepare(
    "SELECT * FROM ngo_applications WHERE id = ? AND status IN ('pending','needs_info') LIMIT 1"
  ).bind(id).first();
  if (!application) return jsonResponse({ error: "Pending application not found or already reviewed." }, 404);

  if (status === "approved") {
    const existingUser = await db.prepare("SELECT email FROM ngo_users WHERE email = ? LIMIT 1").bind(application.contact_email).first();
    if (existingUser) return jsonResponse({ error: "The applicant email is already assigned to an organisation. Resolve membership manually before approving." }, 409);
    const orgId = slugify(application.org_name) + "-" + id.slice(0, 8);
    const statements = [
      db.prepare("INSERT INTO ngo_organisations (id, org_name, org_type, registration_number, state_name, district_name, application_id) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .bind(orgId, application.org_name, application.org_type, application.registration_number, application.state_name, application.district_name, id),
      db.prepare("INSERT INTO ngo_users (email, org_id, role, active) VALUES (?, ?, 'admin', 1)")
        .bind(application.contact_email, orgId),
      db.prepare("UPDATE ngo_applications SET status = 'approved', review_note = ?, reviewed_by = ?, reviewed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ? AND status IN ('pending','needs_info')")
        .bind(reviewNote, auth.user.email, id)
    ];
    try { await db.batch(statements); }
    catch { return jsonResponse({ error: "Approval could not be completed. Check the organisation and user records, then retry." }, 500); }
    return jsonResponse({ updated: true, status, organisationId: orgId, memberEmail: application.contact_email, role: "admin" });
  }

  await db.prepare(
    "UPDATE ngo_applications SET status = ?, review_note = ?, reviewed_by = ?, reviewed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ? AND status IN ('pending','needs_info')"
  ).bind(status, reviewNote, auth.user.email, id).run();
  return jsonResponse({ updated: true, status });
}
