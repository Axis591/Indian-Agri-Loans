import { auditNgo, jsonResponse, requireNgoUser, requireSameOrigin } from "../../../_lib/ngo.js";

export async function onRequestGet(context) {
  const auth = await requireNgoUser(context, ["admin","editor"]);
  if (!auth.ok) return auth.response;
  if (!context.env.NGO_DOCS) return jsonResponse({ error: "Private document storage is not configured." }, 503);
  const id = String(context.params.id || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonResponse({ error: "Invalid document identifier." }, 400);
  const row = await context.env.NGO_DB.prepare(
    "SELECT object_key, file_name, mime_type FROM ngo_farmer_documents WHERE id = ? AND org_id = ? LIMIT 1"
  ).bind(id,auth.user.org_id).first();
  if (!row) return jsonResponse({ error: "Document not found." }, 404);
  const object = await context.env.NGO_DOCS.get(row.object_key);
  if (!object) return jsonResponse({ error: "Private document object not found." }, 404);
  return new Response(object.body, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": "attachment; filename=\"" + row.file_name + "\"",
      "Content-Length": String(object.size),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer"
    }
  });
}

export async function onRequestDelete(context) {
  const auth = await requireNgoUser(context, ["admin"]);
  if (!auth.ok) return auth.response;
  if (!requireSameOrigin(context.request)) return jsonResponse({ error: "Cross-origin request rejected." }, 403);
  if (!context.env.NGO_DOCS) return jsonResponse({ error: "Private document storage is not configured." }, 503);
  const id = String(context.params.id || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonResponse({ error: "Invalid document identifier." }, 400);
  const row = await context.env.NGO_DB.prepare(
    "SELECT object_key FROM ngo_farmer_documents WHERE id = ? AND org_id = ? LIMIT 1"
  ).bind(id,auth.user.org_id).first();
  if (!row) return jsonResponse({ error: "Document not found." }, 404);
  await context.env.NGO_DOCS.delete(row.object_key);
  await context.env.NGO_DB.prepare("DELETE FROM ngo_farmer_documents WHERE id = ? AND org_id = ?").bind(id,auth.user.org_id).run();
  await auditNgo(context.env,auth.user,"farmer.document_deleted","ngo_farmer_document",id);
  return jsonResponse({ deleted: true });
}

export async function onRequestPatch(context) {
  const auth = await requireNgoUser(context, ["admin"]);
  if (!auth.ok) return auth.response;
  if (!requireSameOrigin(context.request)) return jsonResponse({ error: "Cross-origin request rejected." }, 403);
  const id = String(context.params.id || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonResponse({ error: "Invalid document identifier." }, 400);
  const body = await context.request.json().catch(() => null);
  const status = String(body?.reviewStatus || "");
  if (!["reviewed","rejected"].includes(status)) return jsonResponse({ error: "Choose reviewed or rejected." }, 400);
  const result = await context.env.NGO_DB.prepare(
    "UPDATE ngo_farmer_documents SET review_status = ? WHERE id = ? AND org_id = ?"
  ).bind(status,id,auth.user.org_id).run();
  if (!result.meta?.changes) return jsonResponse({ error: "Document not found." }, 404);
  await auditNgo(context.env,auth.user,"farmer.document_reviewed","ngo_farmer_document",id);
  return jsonResponse({ saved: true, reviewStatus: status });
}
