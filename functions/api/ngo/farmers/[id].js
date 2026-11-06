import { auditNgo, jsonResponse, requireNgoUser, requireSameOrigin } from "../../../_lib/ngo.js";

export async function onRequestDelete(context) {
  const auth = await requireNgoUser(context, ["admin"]);
  if (!auth.ok) return auth.response;
  if (!requireSameOrigin(context.request)) return jsonResponse({ error: "Cross-origin request rejected." }, 403);
  const id = String(context.params.id || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonResponse({ error: "Invalid farmer profile identifier." }, 400);
  const db = context.env.NGO_DB;
  const farmer = await db.prepare("SELECT id FROM ngo_farmers WHERE id = ? AND org_id = ? LIMIT 1").bind(id,auth.user.org_id).first();
  if (!farmer) return jsonResponse({ error: "Farmer profile not found." }, 404);
  const docs = await db.prepare("SELECT object_key FROM ngo_farmer_documents WHERE farmer_id = ? AND org_id = ?").bind(id,auth.user.org_id).all();
  if (context.env.NGO_DOCS) {
    for (const doc of docs.results || []) await context.env.NGO_DOCS.delete(doc.object_key);
  } else if ((docs.results || []).length) {
    return jsonResponse({ error: "The private document bucket is not configured; profile deletion was stopped to avoid leaving orphaned files." }, 503);
  }
  await db.batch([
    db.prepare("DELETE FROM ngo_farmer_documents WHERE farmer_id = ? AND org_id = ?").bind(id,auth.user.org_id),
    db.prepare("DELETE FROM ngo_scheme_applications WHERE farmer_id = ? AND org_id = ?").bind(id,auth.user.org_id),
    db.prepare("DELETE FROM ngo_farmers WHERE id = ? AND org_id = ?").bind(id,auth.user.org_id)
  ]);
  await auditNgo(context.env, auth.user, "farmer.profile_deleted", "ngo_farmer", id);
  return jsonResponse({ deleted: true });
}
