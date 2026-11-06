import { auditNgo, jsonResponse, requireNgoUser } from "../../../_lib/ngo.js";

export async function onRequestDelete(context) {
  const auth = await requireNgoUser(context, ["admin"]);
  if (!auth.ok) return auth.response;
  const id = String(context.params.id || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonResponse({ error: "Invalid follow-up reference." }, 400);
  const result = await context.env.NGO_DB.prepare(
    "DELETE FROM ngo_followups WHERE id = ? AND org_id = ?"
  ).bind(id, auth.user.org_id).run();
  if (!result.meta?.changes) return jsonResponse({ error: "Reference not found." }, 404);
  await auditNgo(context.env, auth.user, "followup.deleted", "ngo_followup", id);
  return jsonResponse({ deleted: true });
}
